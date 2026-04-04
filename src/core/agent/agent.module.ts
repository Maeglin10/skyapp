import { Module } from '@nestjs/common';
import { AgentRunnerService } from './agent-runner.service';
import { PromptLibraryService } from './prompt-library.service';
import { LLMModule } from '../llm/llm.module';
import { ToolsModule } from '../tools/tools.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [LLMModule, ToolsModule, MemoryModule],
  providers: [AgentRunnerService, PromptLibraryService],
  exports: [AgentRunnerService, PromptLibraryService],
})
export class AgentModule {}
