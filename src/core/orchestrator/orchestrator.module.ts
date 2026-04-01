import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { AgentModule } from '../agent/agent.module';
import { LLMModule } from '../llm/llm.module';

@Module({ imports: [AgentModule, LLMModule], providers: [OrchestratorService], exports: [OrchestratorService] })
export class OrchestratorModule {}
