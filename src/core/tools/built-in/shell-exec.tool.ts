import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const execAsync = promisify(exec);
const ALLOWED_COMMANDS = ['ls', 'cat', 'echo', 'pwd', 'node', 'npm', 'npx', 'git', 'grep', 'find', 'wc', 'head', 'tail'];

const ShellExecInput = z.object({
  command: z.string().describe('Shell command to execute'),
  timeout: z.number().optional().default(10000),
});

export const ShellExecTool: ToolDefinition<typeof ShellExecInput> = {
  name: 'shell_exec',
  description: 'Execute a whitelisted shell command within the working directory.',
  permission: 'shell_exec',
  inputSchema: ShellExecInput,
  async execute(input, ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    const base = input.command.trim().split(' ')[0];
    if (!ALLOWED_COMMANDS.includes(base)) {
      return { success: false, output: null, error: `Command '${base}' not allowed. Allowed: ${ALLOWED_COMMANDS.join(', ')}`, durationMs: 0 };
    }
    try {
      const { stdout, stderr } = await execAsync(input.command, { cwd: ctx.workingDir, timeout: input.timeout });
      return { success: true, output: stdout || stderr, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { command: { type: 'string' }, timeout: { type: 'number' } }, required: ['command'] } };
  },
};
