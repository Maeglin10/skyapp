import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const FileWriteInput = z.object({
  path: z.string().describe('Relative path within working directory'),
  content: z.string().describe('File content to write'),
});

export const FileWriteTool: ToolDefinition<typeof FileWriteInput> = {
  name: 'file_write',
  description: 'Write content to a file. Creates parent directories if needed.',
  permission: 'file_write',
  inputSchema: FileWriteInput,
  async execute(input, ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    try {
      const safePath = path.resolve(ctx.workingDir, input.path);
      if (!safePath.startsWith(path.resolve(ctx.workingDir))) {
        return { success: false, output: null, error: 'Path traversal not allowed', durationMs: Date.now() - start };
      }
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, input.content, 'utf-8');
      return { success: true, output: `Written ${input.content.length} bytes to ${input.path}`, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } };
  },
};
