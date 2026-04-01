import { AsyncLocalStorage } from 'async_hooks';
import { AgentConfig, AgentState } from './agent.types';

export interface AgentContextData {
  config: AgentConfig;
  state: AgentState;
  startTime: number;
}

export const agentStorage = new AsyncLocalStorage<AgentContextData>();

export function getAgentContext(): AgentContextData | undefined {
  return agentStorage.getStore();
}

export function runWithAgentContext<T>(data: AgentContextData, fn: () => T): T {
  return agentStorage.run(data, fn);
}
