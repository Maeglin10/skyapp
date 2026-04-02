import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { ToolRegistry } from '../tools/tool.registry';
import { MemoryService } from '../memory/memory.service';
import { AgentConfig, AgentState, AgentStep, RunAgentInput, RunAgentResult } from './agent.types';
import { ToolCall } from '../llm/llm.types';
import { ToolContext, ToolPermission } from '../tools/tool.types';
import { withRetry } from './retry';

@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private tools: ToolRegistry,
    private memory: MemoryService,
  ) {}

  async run(input: RunAgentInput): Promise<RunAgentResult> {
    const startTime = Date.now();
    const config = { ...input.config, maxIterations: input.config.maxIterations ?? 10 };
    const agentId = input.agentId ?? crypto.randomUUID();

    const state: AgentState = { status: 'RUNNING', messages: [], iteration: 0, steps: [] };

    const memories = await this.memory.getRecent(agentId, 10);
    const memoryContext = memories.length ? `\n\nRelevant memory:\n${memories.map(m => `- ${m.content}`).join('\n')}` : '';
    const systemPrompt = (config.systemPrompt ?? this.defaultSystemPrompt(config.role)) + memoryContext;

    if (input.context) {
      state.messages.push({ role: 'user', content: `Context: ${input.context}` });
      state.messages.push({ role: 'assistant', content: 'Understood. Ready to proceed.' });
    }
    state.messages.push({ role: 'user', content: input.userMessage });

    const permissions = (config.permissions ?? ['file_read', 'shell_exec', 'http_request', 'memory_search']) as ToolPermission[];
    const availableTools = this.tools.getForPermissions(permissions).map(t => t.toSchema());
    const toolCtx: ToolContext = { agentId, workingDir: config.workingDir ?? process.cwd(), permissions };

    let totalTokens = 0;

    while (state.iteration < config.maxIterations) {
      state.iteration++;
      this.logger.debug(`Agent ${agentId} iteration ${state.iteration}/${config.maxIterations}`);

      const stepStart = Date.now();
      const response = await withRetry(
        () => this.llm.chat(config.provider, state.messages, availableTools, systemPrompt),
        { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 },
      );
      totalTokens += response.inputTokens + response.outputTokens;

      await this.logUsage(agentId, config, response.inputTokens, response.outputTokens);

      state.steps.push({ iteration: state.iteration, type: 'reasoning', content: response.content, tokensUsed: response.inputTokens + response.outputTokens, durationMs: Date.now() - stepStart, timestamp: new Date() });

      if (response.toolCalls.length === 0 || response.stopReason === 'end_turn') {
        state.status = 'COMPLETED';
        state.output = response.content;
        break;
      }

      state.messages.push({ role: 'assistant', content: response.content || JSON.stringify(response.toolCalls) });

      for (const toolCall of response.toolCalls) {
        const result = await this.executeToolCall(toolCall, toolCtx, state, agentId);
        state.messages.push({ role: 'user', content: `Tool result for ${toolCall.name}: ${JSON.stringify(result.output ?? result.error)}` });
      }
    }

    if (state.status === 'RUNNING') {
      state.status = 'FAILED';
      state.error = `Max iterations (${config.maxIterations}) reached`;
    }

    await this.persistSteps(agentId, state.steps);

    if (state.output) {
      await this.memory.store(agentId, `Task: ${input.userMessage}\nResult: ${state.output}`, { role: config.role });
    }

    return { agentId, status: state.status, output: state.output ?? state.error ?? '', steps: state.steps, totalTokens, durationMs: Date.now() - startTime };
  }

  private async executeToolCall(toolCall: ToolCall, ctx: ToolContext, state: AgentState, agentId: string) {
    const start = Date.now();
    const result = await this.tools.execute(toolCall.name, toolCall.input, ctx);
    state.steps.push({ iteration: state.iteration, type: result.success ? 'tool_result' : 'tool_call', content: { tool: toolCall.name, input: toolCall.input, output: result.output, error: result.error }, tokensUsed: 0, durationMs: Date.now() - start, timestamp: new Date() });
    await this.prisma.toolExecutionLog.create({ data: { agentId, toolName: toolCall.name, input: toolCall.input as object, output: result.output as object, error: result.error, durationMs: result.durationMs, success: result.success } });
    return result;
  }

  private defaultSystemPrompt(role: string): string {
    const prompts: Record<string, string> = {
      COORDINATOR: 'You are a coordinator agent. Decompose complex tasks into clear subtasks.',
      WORKER: 'You are a worker agent. Execute assigned tasks precisely using available tools.',
      ANALYST: 'You are an analyst agent. Analyze data and provide insights.',
      DEBUGGER: 'You are a debugger agent. Find root causes and propose solutions.',
    };
    return prompts[role] ?? 'You are a helpful AI agent. Complete the assigned task.';
  }

  private async logUsage(agentId: string, config: AgentConfig, inputTokens: number, outputTokens: number) {
    const costs: Record<string, number> = { anthropic: 0.000001, openai: 0.0000005, gemini: 0.0000001 };
    const costUsd = (inputTokens + outputTokens) * (costs[config.provider] ?? 0.000001);
    await this.prisma.aiUsageLog.create({ data: { agentId, provider: config.provider.toUpperCase() as 'ANTHROPIC' | 'OPENAI' | 'GEMINI', model: config.model, inputTokens, outputTokens, costUsd } });
  }

  private async persistSteps(agentId: string, steps: AgentStep[]) {
    if (steps.length === 0) return;
    await this.prisma.agentStep.createMany({ data: steps.map(s => ({ agentId, iteration: s.iteration, type: s.type, content: s.content as object, tokensUsed: s.tokensUsed, durationMs: s.durationMs })) });
  }
}
