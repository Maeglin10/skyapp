import { Module } from '@nestjs/common';
import { AgentRunnerService } from './agent-runner.service';
import { PromptLibraryService } from './prompt-library.service';
import { LLMModule } from '../llm/llm.module';
import { ToolsModule } from '../tools/tools.module';
import { MemoryModule } from '../memory/memory.module';
import { AiGovernanceModule } from '../../services/ai-governance/ai-governance.module';
import { TraceModule } from '../../services/trace/trace.module';

@Module({
  imports: [LLMModule, ToolsModule, MemoryModule, AiGovernanceModule, TraceModule],
  providers: [AgentRunnerService, PromptLibraryService],
  exports: [AgentRunnerService, PromptLibraryService],
})
export class AgentModule {}
