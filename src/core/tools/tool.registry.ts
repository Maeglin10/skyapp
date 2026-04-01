import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolContext, ToolPermission, ToolResult } from './tool.types';
import { FileReadTool } from './built-in/file-read.tool';
import { FileWriteTool } from './built-in/file-write.tool';
import { ShellExecTool } from './built-in/shell-exec.tool';
import { HttpRequestTool } from './built-in/http-request.tool';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.register(FileReadTool);
    this.register(FileWriteTool);
    this.register(ShellExecTool);
    this.register(HttpRequestTool);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Tool registered: ${tool.name}`);
  }

  get(name: string): ToolDefinition | undefined { return this.tools.get(name); }
  getAll(): ToolDefinition[] { return Array.from(this.tools.values()); }
  getForPermissions(permissions: ToolPermission[]): ToolDefinition[] {
    return this.getAll().filter(t => permissions.includes(t.permission));
  }

  async execute(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) return { success: false, output: null, error: `Tool '${name}' not found`, durationMs: 0 };
    if (!ctx.permissions.includes(tool.permission)) return { success: false, output: null, error: `Permission '${tool.permission}' not granted`, durationMs: 0 };
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) return { success: false, output: null, error: `Invalid input: ${parsed.error.message}`, durationMs: 0 };
    this.logger.debug(`Executing tool: ${name} for agent: ${ctx.agentId}`);
    return tool.execute(parsed.data, ctx);
  }
}
