import { Injectable, Logger } from '@nestjs/common';
import { LLMResponse, Message, ToolSchema, ToolCall } from './llm.types';
import { CacheService } from '../../services/cache/cache.service';

export type LLMProviderKey = 'anthropic' | 'openai' | 'gemini' | 'skymodel';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(private readonly cache: CacheService) {}

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000,
  ): Promise<T> {
    let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === maxRetries) break;
        const delay = baseDelayMs * Math.pow(2, attempt);
        this.logger.warn(
          `LLM call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }

  async chat(
    provider: LLMProviderKey,
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const cacheKey = !tools?.length ? this.cache.buildKey(provider, messages, systemPrompt) : null;
    if (cacheKey) {
      const cached = await this.cache.get<LLMResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT for provider: ${provider}`);
        return cached;
      }
    }

    this.logger.debug(`Chat with provider: ${provider}, messages: ${messages.length}`);
    let response: LLMResponse;
    switch (provider) {
      case 'anthropic':
        response = await this.chatAnthropic(messages, tools, systemPrompt);
        break;
      case 'openai':
        response = await this.chatOpenAI(messages, tools, systemPrompt);
        break;
      case 'gemini':
        response = await this.chatGemini(messages, tools, systemPrompt);
        break;
      case 'skymodel':
        response = await this.chatSkyModel(messages, tools, systemPrompt);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (cacheKey) await this.cache.set(cacheKey, response, 3600);
    return response;
  }

  async *stream(
    provider: LLMProviderKey,
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): AsyncGenerator<string> {
    this.logger.debug(`Stream with provider: ${provider}, messages: ${messages.length}`);
    if (provider === 'anthropic') {
      yield* this.streamAnthropic(messages, tools, systemPrompt);
    } else {
      const response = await this.chat(provider, messages, tools, systemPrompt);
      for (const word of response.content.split(' ')) {
        yield word + ' ';
      }
    }
  }

  private async *streamAnthropic(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): AsyncGenerator<string> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

    const anthropicMessages = messages.map(msg => ({
      role: (msg.role === 'system' ? 'user' : msg.role) as 'user' | 'assistant',
      content: msg.content,
    }));

    const streamParams = {
      model,
      max_tokens: 4096,
      messages: anthropicMessages,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(tools?.length ? {
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema as { type: 'object'; properties?: Record<string, unknown> },
        })),
      } : {}),
    };

    const stream = client.messages.stream(streamParams as Parameters<typeof client.messages.stream>[0]);
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && 'delta' in event && (event.delta as { type: string }).type === 'text_delta') {
        yield (event.delta as { type: string; text: string }).text;
      }
    }
  }

  private async chatAnthropic(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

      const anthropicMessages = messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      }));

      const anthropicTools = tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema as Record<string, unknown>,
      }));

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools as any,
      });

      const toolCalls: ToolCall[] = [];
      let content = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      return {
        content,
        toolCalls,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason || 'stop',
      };
    });
  }

  private async chatOpenAI(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const openaiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      if (systemPrompt) openaiMessages.push({ role: 'system', content: systemPrompt });
      openaiMessages.push(...messages.map((msg) => ({ role: msg.role, content: msg.content })));

      const openaiTools = tools?.map((tool) => ({
        type: 'function' as const,
        function: { name: tool.name, description: tool.description, parameters: tool.inputSchema as Record<string, unknown> },
      }));

      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        tools: openaiTools as any,
        max_tokens: 4096,
      });

      const toolCalls: ToolCall[] = [];
      let content = '';

      for (const choice of response.choices) {
        if (choice.message.content) content += choice.message.content;
        if (choice.message.tool_calls) {
          for (const tc of choice.message.tool_calls) {
            if (tc.type === 'function') {
              toolCalls.push({ id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments) as Record<string, unknown> });
            }
          }
        }
      }

      return {
        content,
        toolCalls,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        stopReason: response.choices[0]?.finish_reason || 'stop',
      };
    });
  }

  private async chatGemini(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      const genModel = client.getGenerativeModel({ model });

      const geminiMessages = messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const geminiTools = tools?.length
        ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema as Record<string, unknown> })) }]
        : undefined;

      const systemInstruction = systemPrompt ? `${systemPrompt}\n\nYou are a helpful AI assistant.` : undefined;

      const response = await genModel.generateContent({
        contents: geminiMessages as any,
        tools: geminiTools as any,
        systemInstruction,
      });

      const toolCalls: ToolCall[] = [];
      let content = '';

      const responseContent = response.response.candidates?.[0]?.content;
      if (responseContent) {
        for (const part of responseContent.parts) {
          if (part.text) {
            content += part.text;
          } else if ('functionCall' in part && part.functionCall) {
            toolCalls.push({
              id: `${part.functionCall.name}-${Date.now()}`,
              name: part.functionCall.name,
              input: (part.functionCall.args as Record<string, unknown>) || {},
            });
          }
        }
      }

      return { content, toolCalls, inputTokens: 0, outputTokens: 0, stopReason: 'stop' };
    });
  }

  /**
   * SkyModel — modèle local exposé via une API OpenAI-compatible
   * Serveur démarré manuellement : make serve-mlx ou make serve-gguf
   */
  private async chatSkyModel(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const { OpenAI } = await import('openai');
      const baseURL = process.env.SKYMODEL_URL ?? 'http://localhost:11435/v1';
      const modelName = process.env.SKYMODEL_NAME ?? 'skymodel';
      const client = new OpenAI({ baseURL, apiKey: 'local' });

      const msgs: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
      msgs.push(...messages.map((m) => ({ role: m.role, content: m.content })));

      const openaiTools = tools?.map((t) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema as Record<string, unknown> },
      }));

      const response = await client.chat.completions.create({
        model: modelName,
        messages: msgs,
        tools: openaiTools as any,
        max_tokens: 4096,
      });

      const toolCalls: ToolCall[] = [];
      let content = '';

      for (const choice of response.choices) {
        if (choice.message.content) content += choice.message.content;
        if (choice.message.tool_calls) {
          for (const tc of choice.message.tool_calls) {
            if (tc.type === 'function') {
              toolCalls.push({ id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments) as Record<string, unknown> });
            }
          }
        }
      }

      return {
        content,
        toolCalls,
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        stopReason: response.choices[0]?.finish_reason || 'stop',
      };
    });
  }
}
