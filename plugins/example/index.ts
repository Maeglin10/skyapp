import { z } from 'zod';
import { ToolDefinition } from '../../src/core/tools/tool.types';

const EchoInput = z.object({ message: z.string() });
type EchoInput = z.infer<typeof EchoInput>;

const echoTool: ToolDefinition<typeof EchoInput> = {
  name: 'echo',
  description: 'Echo a message back — example plugin tool',
  permission: 'shell_exec',
  inputSchema: EchoInput,
  async execute(input: EchoInput) {
    return { success: true, output: `Echo: ${input.message}`, durationMs: 0 };
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } };
  },
};

export const tools: ToolDefinition[] = [echoTool];
