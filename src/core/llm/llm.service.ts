import { Injectable, Logger } from '@nestjs/common';
import { LLMResponse, Message, ToolSchema, ToolCall } from './llm.types';

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);

  async chat(
    provider: 'anthropic' | 'openai' | 'gemini',
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    this.logger.debug(`Chat with provider: ${provider}, messages: ${messages.length}`);

    switch (provider) {
      case 'anthropic':
        return this.chatAnthropic(messages, tools, systemPrompt);
      case 'openai':
        return this.chatOpenAI(messages, tools, systemPrompt);
      case 'gemini':
        return this.chatGemini(messages, tools, systemPrompt);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async chatAnthropic(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

    const anthropicMessages = messages.map((msg) => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.content,
    }));

    const anthropicTools = tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools: anthropicTools,
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
      stopReason: response.stop_reason,
    };
  }

  private async chatOpenAI(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const openaiMessages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> = [];

    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt });
    }

    openaiMessages.push(
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    );

    const openaiTools = tools?.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));

    const response = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: openaiTools,
      max_tokens: 4096,
    });

    const toolCalls: ToolCall[] = [];
    let content = '';

    for (const choice of response.choices) {
      if (choice.message.content) {
        content += choice.message.content;
      }
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments) as Record<string, unknown>,
            });
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
  }

  private async chatGemini(
    messages: Message[],
    tools?: ToolSchema[],
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const genModel = client.getGenerativeModel({ model });

    const geminiMessages = messages.map((msg) => ({
      role: msg.role === 'system' ? 'user' : msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const geminiTools = tools?.length
      ? [
          {
            functionDeclarations: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema,
            })),
          },
        ]
      : undefined;

    const systemInstruction = systemPrompt ? `${systemPrompt}\n\nYou are a helpful AI assistant.` : undefined;

    const response = await genModel.generateContent({
      contents: geminiMessages,
      tools: geminiTools,
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

    return {
      content,
      toolCalls,
      inputTokens: 0,
      outputTokens: 0,
      stopReason: 'stop',
    };
  }
}
