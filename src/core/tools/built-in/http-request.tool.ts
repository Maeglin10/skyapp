import { z } from 'zod';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const HttpRequestInput = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

export const HttpRequestTool: ToolDefinition<typeof HttpRequestInput> = {
  name: 'http_request',
  description: 'Make an HTTP request to an external URL.',
  permission: 'http_request',
  inputSchema: HttpRequestInput,
  async execute(input, _ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    try {
      const response = await fetch(input.url, { method: input.method, headers: input.headers, body: input.body, signal: AbortSignal.timeout(15000) });
      const text = await response.text();
      return { success: response.ok, output: { status: response.status, body: text.slice(0, 10000) }, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { url: { type: 'string' }, method: { type: 'string' }, headers: { type: 'object' }, body: { type: 'string' } }, required: ['url'] } };
  },
};
