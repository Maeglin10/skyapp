import { Injectable } from '@nestjs/common';
import { AgentRunnerService } from '../../core/agent/agent-runner.service';
import { OrchestratorService } from '../../core/orchestrator/orchestrator.service';
import { RunAgentDto } from './dto/run-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private agentRunner: AgentRunnerService, private orchestrator: OrchestratorService) {}

  run(dto: RunAgentDto) {
    const provider = (dto.provider ?? 'anthropic') as 'anthropic' | 'openai' | 'gemini' | 'skymodel';
    const model = provider === 'openai' ? 'gpt-4o-mini' : provider === 'gemini' ? 'gemini-2.0-flash' : provider === 'skymodel' ? 'skymodel-local' : 'claude-haiku-4-5-20251001';
    return this.agentRunner.run({
      config: { id: crypto.randomUUID(), name: `${dto.role ?? 'WORKER'}-agent`, role: (dto.role ?? 'WORKER') as any, model, provider, maxIterations: dto.maxIterations, systemPrompt: dto.systemPrompt, permissions: dto.permissions as any },
      userMessage: dto.message,
      context: dto.context,
    });
  }

  orchestrate(dto: RunAgentDto) {
    return this.orchestrator.run({ objective: dto.message, context: dto.context, coordinatorProvider: (dto.provider ?? 'anthropic') as any });
  }
}
