import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class GeminiAdapter implements LLMAdapter {
  readonly provider = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(private config: ConfigService) {
    this.client = new GoogleGenerativeAI(config.get('GEMINI_API_KEY') ?? '');
  }

  async chat(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);

    return {
      content: result.response.text(),
      toolCalls: [],
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      stopReason: 'end_turn',
    };
  }

  async *stream(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });
    const lastMessage = messages[messages.length - 1];
    const result = await model.generateContentStream(lastMessage.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: 'text', data: text };
    }
    yield { type: 'done', data: '' };
  }
}
