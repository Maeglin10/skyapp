import OpenAI from 'openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class OpenAIAdapter implements LLMAdapter {
  readonly provider = 'openai';
  private client: OpenAI;

  constructor(private config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    allMessages.push(...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      tools: tools?.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      })),
    });

    const choice = response.choices[0];
    const toolCalls = (choice.message.tool_calls ?? []).map(tc => {
      const fn = (tc as any).function as { name: string; arguments: string };
      return { id: tc.id, name: fn.name, input: JSON.parse(fn.arguments) as Record<string, unknown> };
    });

    return {
      content: choice.message.content ?? '',
      toolCalls,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    allMessages.push(...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));

    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: allMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: 'text', data: delta };
    }
    yield { type: 'done', data: '' };
  }
}
