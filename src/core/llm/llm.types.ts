export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: object;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}
