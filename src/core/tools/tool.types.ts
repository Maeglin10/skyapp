import { z } from 'zod';

export type ToolPermission = 'file_read' | 'file_write' | 'shell_exec' | 'http_request' | 'memory_search';

export interface ToolContext {
  agentId: string;
  workingDir: string;
  permissions: ToolPermission[];
  abortSignal?: AbortSignal;
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: T;
  execute(input: z.infer<T>, ctx: ToolContext): Promise<ToolResult>;
  toSchema(): { name: string; description: string; inputSchema: object };
}
