import { Message } from '../llm/llm.types';

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
export type AgentRole = 'COORDINATOR' | 'WORKER' | 'ANALYST' | 'DEBUGGER';
export type LLMProviderKey = 'anthropic' | 'openai' | 'gemini' | 'skymodel';

export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  model: string;
  provider: LLMProviderKey;
  systemPrompt?: string;
  maxIterations?: number;
  permissions?: string[];
  workingDir?: string;
  enableReflection?: boolean;
}

export interface AgentState {
  status: AgentStatus;
  messages: Message[];
  iteration: number;
  steps: AgentStep[];
  output?: string;
  error?: string;
}

export interface AgentStep {
  iteration: number;
  type: 'reasoning' | 'tool_call' | 'tool_result' | 'output';
  content: unknown;
  tokensUsed: number;
  durationMs: number;
  timestamp: Date;
}

export interface RunAgentInput {
  agentId?: string;
  config: AgentConfig;
  userMessage: string;
  context?: string;
}

export interface RunAgentResult {
  agentId: string;
  status: AgentStatus;
  output: string;
  steps: AgentStep[];
  totalTokens: number;
  durationMs: number;
}
