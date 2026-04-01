import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const FileReadInput = z.object({
  path: z.string().describe('Relative path within working directory'),
  encoding: z.string().optional().default('utf-8').describe('File encoding'),
});

export const FileReadTool: ToolDefinition<typeof FileReadInput> = {
  name: 'file_read',
  description: 'Read content from a file.',
  permission: 'file_read',
  inputSchema: FileReadInput,
  async execute(input, ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    try {
      const safePath = path.resolve(ctx.workingDir, input.path);
      if (!safePath.startsWith(path.resolve(ctx.workingDir))) {
        return { success: false, output: null, error: 'Path traversal not allowed', durationMs: Date.now() - start };
      }
      const content = await fs.readFile(safePath, { encoding: input.encoding as any });
      return { success: true, output: content, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { path: { type: 'string' }, encoding: { type: 'string', default: 'utf-8' } }, required: ['path'] } };
  },
};
