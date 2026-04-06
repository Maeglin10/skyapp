import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { ToolRegistry } from '../tools/tool.registry';
import { MemoryService } from '../memory/memory.service';
import { PromptLibraryService } from './prompt-library.service';
import { AiGovernanceService } from '../../services/ai-governance/ai-governance.service';
import { TraceService } from '../../services/trace/trace.service';
import { AgentConfig, AgentRole, AgentState, AgentStep, RunAgentInput, RunAgentResult } from './agent.types';
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
    private promptLibrary: PromptLibraryService,
    private governance: AiGovernanceService,
    private trace: TraceService,
  ) {}

  async run(input: RunAgentInput): Promise<RunAgentResult> {
    const startTime = Date.now();
    const config = { ...input.config, maxIterations: input.config.maxIterations ?? 10 };
    const agentId = input.agentId ?? crypto.randomUUID();

    // Budget check before running
    const budget = await this.governance.checkBudget();
    if (!budget.allowed) {
      throw new ForbiddenException(`AI budget blocked: ${budget.reason}`);
    }
    this.trace.record({ agentId, event: 'agent.start', data: { role: config.role, provider: config.provider, model: config.model } });

    const state: AgentState = { status: 'RUNNING', messages: [], iteration: 0, steps: [] };

    // Semantic memory retrieval: combine recent + semantic similarity
    const recentMemories = await this.memory.getRecent(agentId, 5);
    let semanticMemories: typeof recentMemories = [];
    try {
      semanticMemories = await this.memory.search(agentId, input.userMessage, 5) as typeof recentMemories;
    } catch {
      // pgvector not available in test env, fallback to recent only
    }
    const allMemories = [...recentMemories];
    for (const m of semanticMemories) {
      if (!allMemories.find(r => r.id === m.id)) allMemories.push(m);
    }
    const memoryContext = allMemories.length
      ? `\n\nRelevant past context:\n${allMemories.map(m => `- ${m.content}`).join('\n')}`
      : '';
    const fewShots = this.promptLibrary.formatAsContext(config.role as AgentRole);
    const systemPrompt = (config.systemPrompt ?? this.defaultSystemPrompt(config.role)) + fewShots + memoryContext;

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

      const stepCostUsd = (response.inputTokens + response.outputTokens) * ({ anthropic: 0.000001, openai: 0.0000005, gemini: 0.0000001 }[config.provider] ?? 0.000001);
      await this.logUsage(agentId, config, response.inputTokens, response.outputTokens);
      await this.governance.recordSpend(stepCostUsd);

      state.steps.push({ iteration: state.iteration, type: 'reasoning', content: response.content, tokensUsed: response.inputTokens + response.outputTokens, durationMs: Date.now() - stepStart, timestamp: new Date() });
      this.trace.record({ agentId, event: 'agent.iteration', data: { iteration: state.iteration, tokens: response.inputTokens + response.outputTokens, hasToolCalls: response.toolCalls.length > 0 } });

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
      if (config.enableReflection) {
        const reflection = await this.selfReflect(agentId, input.userMessage, state.output, config.provider, config.model);
        if (reflection) {
          await this.memory.store(agentId, `Reflection on "${input.userMessage}": ${reflection}`, { role: config.role, type: 'reflection' });
          state.steps.push({ iteration: state.iteration, type: 'output', content: { reflection }, tokensUsed: 0, durationMs: 0, timestamp: new Date() });
        }
      }
      await this.memory.store(agentId, `Task: ${input.userMessage}\nResult: ${state.output}`, {
        role: config.role,
        status: state.status,
        iterations: state.iteration,
        tokensUsed: totalTokens,
        quality: state.iteration <= 3 ? 'high' : state.iteration <= 7 ? 'medium' : 'low',
      });
    }

    this.trace.record({ agentId, event: 'agent.end', data: { status: state.status, totalTokens, durationMs: Date.now() - startTime, iterations: state.iteration } });
    return { agentId, status: state.status, output: state.output ?? state.error ?? '', steps: state.steps, totalTokens, durationMs: Date.now() - startTime };
  }

  private async executeToolCall(toolCall: ToolCall, ctx: ToolContext, state: AgentState, agentId: string) {
    const start = Date.now();
    this.trace.record({ agentId, event: 'tool.call', data: { tool: toolCall.name, input: toolCall.input } });
    const result = await this.tools.execute(toolCall.name, toolCall.input, ctx);
    this.trace.record({ agentId, event: 'tool.result', data: { tool: toolCall.name, success: result.success, durationMs: result.durationMs } });
    state.steps.push({ iteration: state.iteration, type: result.success ? 'tool_result' : 'tool_call', content: { tool: toolCall.name, input: toolCall.input, output: result.output, error: result.error }, tokensUsed: 0, durationMs: Date.now() - start, timestamp: new Date() });
    await this.prisma.toolExecutionLog.create({ data: { agentId, toolName: toolCall.name, input: toolCall.input as object, output: result.output as object, error: result.error, durationMs: result.durationMs, success: result.success } });
    return result;
  }

  private async selfReflect(agentId: string, task: string, result: string, provider: string, _model: string): Promise<string> {
    try {
      const r = await this.llm.chat(
        provider as 'anthropic' | 'openai' | 'gemini',
        [{ role: 'user', content: `Task: "${task}"\nOutput: "${result.slice(0, 500)}"\n\nIn 2-3 sentences: Did you fully address the task? What could be improved? What did you learn?` }],
        undefined,
        'You are an AI reflecting on your own performance. Be concise and honest.',
      );
      this.logger.debug(`Agent ${agentId} reflection: ${r.content.slice(0, 100)}`);
      return r.content;
    } catch {
      return '';
    }
  }

  private defaultSystemPrompt(role: string): string {
    const base = `You are an autonomous AI agent. Think step by step. Use tools when needed. Be precise and concise in your final response.

RULES:
- If you need information, use the appropriate tool rather than guessing
- After receiving tool results, synthesize them before responding
- When the task is complete, provide a clear final answer without calling more tools
- If a task is impossible or unclear, explain why`;

    const rolePrompts: Record<string, string> = {
      COORDINATOR: `${base}

ROLE: Task Coordinator
Your job is to break down complex objectives into clear, executable subtasks.
- Identify dependencies between subtasks
- Assign appropriate roles to each subtask (WORKER, ANALYST, DEBUGGER)
- Ensure subtasks are atomic and testable
- After all subtasks complete, synthesize results into a coherent final output

OUTPUT FORMAT for task decomposition:
[{"id": "1", "title": "...", "description": "...", "dependencies": [], "agentRole": "WORKER"}]`,

      WORKER: `${base}

ROLE: Task Executor
Your job is to execute assigned tasks precisely using available tools.
- Read the task description carefully before acting
- Use tools in the most efficient order
- Verify your work before reporting completion
- Report the exact output produced, not what you intended to do`,

      ANALYST: `${base}

ROLE: Data Analyst
Your job is to analyze data, find patterns, and provide actionable insights.
- Structure your analysis: Overview → Key Findings → Recommendations
- Support every claim with data from tool results
- Quantify impact where possible
- Flag uncertainties explicitly`,

      DEBUGGER: `${base}

ROLE: Debugger
Your job is to diagnose problems and propose solutions.
- Follow the scientific method: Observe → Hypothesize → Test → Conclude
- Check the most likely causes first
- Provide a root cause analysis, not just symptoms
- Give a specific, actionable fix with code examples when relevant`,
    };

    return rolePrompts[role] ?? `${base}\n\nROLE: General Assistant\nComplete the assigned task thoroughly and accurately.`;
  }

  private async logUsage(agentId: string, config: AgentConfig, inputTokens: number, outputTokens: number) {
    const costs: Record<string, number> = { anthropic: 0.000001, openai: 0.0000005, gemini: 0.0000001, skymodel: 0 };
    const costUsd = (inputTokens + outputTokens) * (costs[config.provider] ?? 0.000001);
    const providerEnum = (config.provider === 'skymodel' ? 'ANTHROPIC' : config.provider.toUpperCase()) as 'ANTHROPIC' | 'OPENAI' | 'GEMINI';
    await this.prisma.aiUsageLog.create({ data: { agentId, provider: providerEnum, model: config.model, inputTokens, outputTokens, costUsd } });
  }

  private async persistSteps(agentId: string, steps: AgentStep[]) {
    if (steps.length === 0) return;
    await this.prisma.agentStep.createMany({ data: steps.map(s => ({ agentId, iteration: s.iteration, type: s.type, content: s.content as object, tokensUsed: s.tokensUsed, durationMs: s.durationMs })) });
  }
}
