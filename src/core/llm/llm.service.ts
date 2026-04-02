import { Injectable } from '@nestjs/common';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from './llm.types';

export type LLMProviderKey = 'anthropic' | 'openai' | 'gemini';

@Injectable()
export class LLMService {
  private adapters: Map<string, LLMAdapter>;

  constructor(
    private claude: ClaudeAdapter,
    private openai: OpenAIAdapter,
    private gemini: GeminiAdapter,
  ) {
    this.adapters = new Map<string, LLMAdapter>([
      ['anthropic', claude],
      ['openai', openai],
      ['gemini', gemini],
    ]);
  }

  getAdapter(provider: LLMProviderKey): LLMAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Unknown LLM provider: ${provider}`);
    return adapter;
  }

  async chat(provider: LLMProviderKey, messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    return this.getAdapter(provider).chat(messages, tools, systemPrompt);
  }

  stream(provider: LLMProviderKey, messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    return this.getAdapter(provider).stream(messages, tools, systemPrompt);
  }
}
