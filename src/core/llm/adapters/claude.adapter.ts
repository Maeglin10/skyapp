import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class ClaudeAdapter implements LLMAdapter {
  readonly provider = 'anthropic';
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  async chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      tools: tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
      })),
    });

    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({
        id: (b as Anthropic.ToolUseBlock).id,
        name: (b as Anthropic.ToolUseBlock).name,
        input: (b as Anthropic.ToolUseBlock).input as Record<string, unknown>,
      }));

    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    return {
      content: textContent,
      toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const stream = await this.client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', data: event.delta.text };
      }
    }
    yield { type: 'done', data: '' };
  }
}
