import { ZodSchema } from 'zod';

export type ToolPermission = 'file_read' | 'file_write' | 'shell_exec' | 'http_request' | 'memory_search';

export interface ToolContext {
  agentId: string;
  workingDir: string;
  permissions: ToolPermission[];
}

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface ToolDefinition<T extends ZodSchema = ZodSchema> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: T;
  execute(input: ReturnType<T['parse']>, ctx: ToolContext): Promise<ToolResult>;
  toSchema(): { name: string; description: string; inputSchema: object };
}
