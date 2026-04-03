import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

/**
 * SkyModelAdapter — adaptateur pour le modèle entraîné en local
 *
 * Pointe sur un serveur local compatible API OpenAI :
 *   - Track A : mlx_lm.server (Phi-4-mini fine-tuné)
 *   - Track B : llama-cpp-python (Transformer from scratch converti GGUF)
 *
 * Démarrer le serveur avant d'utiliser cet adaptateur :
 *   python src/core/model-lab/serve/local_server.py --mode mlx --model-path ...
 *
 * Variable d'env optionnelle : SKYMODEL_URL (défaut: http://localhost:11435)
 */
@Injectable()
export class SkyModelAdapter implements LLMAdapter {
  readonly provider = 'skymodel';
  private client: OpenAI;
  private readonly logger = new Logger(SkyModelAdapter.name);
  private readonly modelName: string;

  constructor(private config: ConfigService) {
    const baseURL = config.get<string>('SKYMODEL_URL') ?? 'http://localhost:11435/v1';
    this.modelName = config.get<string>('SKYMODEL_NAME') ?? 'skymodel';

    // Le client OpenAI supporte n'importe quelle base URL compatible
    this.client = new OpenAI({
      baseURL,
      apiKey: 'local', // requis par le SDK mais ignoré par le serveur local
    });

    this.logger.log(`SkyModelAdapter initialisé → ${baseURL}`);
  }

  async chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    allMessages.push(...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));

    const response = await this.client.chat.completions.create({
      model: this.modelName,
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
      model: this.modelName,
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
