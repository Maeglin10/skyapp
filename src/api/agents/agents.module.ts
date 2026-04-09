import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { AgentsService } from './agents.service';
import { AgentModule } from '../../core/agent/agent.module';
import { OrchestratorModule } from '../../core/orchestrator/orchestrator.module';
import { LLMModule } from '../../core/llm/llm.module';

@Module({ imports: [AgentModule, OrchestratorModule, LLMModule], controllers: [AgentsController], providers: [AgentsService, AgentsGateway] })
export class AgentsApiModule {}
