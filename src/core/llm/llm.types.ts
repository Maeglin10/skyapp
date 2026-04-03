export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop';
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'done';
  data: string | ToolCall;
}

export interface LLMAdapter {
  provider: string;
  chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse>;
  stream(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent>;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
