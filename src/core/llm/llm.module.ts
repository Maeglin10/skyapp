import { Module } from '@nestjs/common';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { SkyModelAdapter } from './adapters/skymodel.adapter';
import { LLMService } from './llm.service';

@Module({
  providers: [ClaudeAdapter, OpenAIAdapter, GeminiAdapter, SkyModelAdapter, LLMService],
  exports: [LLMService],
})
export class LLMModule {}
