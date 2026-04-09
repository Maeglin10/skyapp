import { Injectable, Logger } from '@nestjs/common';
import { AgentRunnerService } from '../agent/agent-runner.service';
import { LLMService } from '../llm/llm.service';
import { TaskGraph, TaskNode } from './task-graph';
import { AgentConfig, LLMProviderKey } from '../agent/agent.types';

export interface OrchestratorInput {
  objective: string;
  context?: string;
  maxConcurrency?: number;
  coordinatorProvider?: LLMProviderKey;
}

export interface OrchestratorResult {
  objective: string;
  taskResults: Record<string, unknown>;
  summary: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  durationMs: number;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(private agentRunner: AgentRunnerService, private llm: LLMService) {}

  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const maxConcurrency = input.maxConcurrency ?? 3;
    const provider = input.coordinatorProvider ?? 'anthropic';

    this.logger.log(`Orchestrating: ${input.objective}`);

    const tasks = await this.decomposeTasks(input.objective, input.context, provider);
    const graph = new TaskGraph();
    for (const task of tasks) graph.addTask(task);

    await this.executeTasks(graph, maxConcurrency);

    const results = graph.getResults();
    const summary = await this.synthesizeResults(input.objective, results, provider);
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const failed = tasks.filter(t => t.status === 'FAILED').length;

    return { objective: input.objective, taskResults: results, summary, totalTasks: tasks.length, completedTasks: completed, failedTasks: failed, durationMs: Date.now() - startTime };
  }

  private async decomposeTasks(objective: string, context: string | undefined, provider: LLMProviderKey): Promise<TaskNode[]> {
    const systemPrompt = `You are a task decomposition expert. Break objectives into 2-5 tasks as a JSON array. Each task: id(string), title, description, dependencies(array of task ids), agentRole(WORKER|ANALYST|DEBUGGER). Respond ONLY with valid JSON array.`;
    const response = await this.llm.chat(provider, [{ role: 'user', content: `Decompose:\n${objective}${context ? `\nContext: ${context}` : ''}` }], undefined, systemPrompt);
    try {
      const parsed = JSON.parse(response.content) as Omit<TaskNode, 'status'>[];
      return parsed.map(t => ({ ...t, status: 'PENDING' as const }));
    } catch {
      return [{ id: crypto.randomUUID(), title: 'Execute objective', description: objective, dependencies: [], agentRole: 'WORKER', status: 'PENDING' }];
    }
  }

  private async executeTasks(graph: TaskGraph, maxConcurrency: number): Promise<void> {
    const running = new Set<Promise<void>>();
    while (!graph.isComplete()) {
      const ready = graph.getReadyTasks();
      for (const task of ready) {
        if (running.size >= maxConcurrency) break;
        graph.markRunning(task.id);
        const p: Promise<void> = this.runTask(task, graph).then(() => { running.delete(p); });
        running.add(p);
      }
      if (running.size === 0 && !graph.isComplete()) { this.logger.error('Deadlock detected'); break; }
      if (running.size > 0) await Promise.race(running);
    }
  }

  private async runTask(task: TaskNode, graph: TaskGraph): Promise<void> {
    const config: AgentConfig = { id: task.id, name: task.title, role: task.agentRole as AgentConfig['role'], model: 'claude-haiku-4-5-20251001', provider: 'anthropic', maxIterations: 8 };
    try {
      const result = await this.agentRunner.run({ config, userMessage: task.description });
      graph.markCompleted(task.id, result.output);
    } catch (e: unknown) {
      graph.markFailed(task.id, String(e));
    }
  }

  private async synthesizeResults(objective: string, results: Record<string, unknown>, provider: LLMProviderKey): Promise<string> {
    const r = await this.llm.chat(provider, [{ role: 'user', content: `Objective: ${objective}\n\nResults:\n${JSON.stringify(results, null, 2)}\n\nSummarize what was accomplished.` }]);
    return r.content;
  }
}
