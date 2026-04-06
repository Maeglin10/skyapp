import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { ToolRegistry } from '../tools/tool.registry';
import { ToolContext, ToolResult, ToolDefinition } from '../tools/tool.types';
import { PluginDefinition, PluginsConfig } from './plugin.types';

@Injectable()
export class PluginLoaderService implements OnModuleInit {
  private readonly logger = new Logger(PluginLoaderService.name);

  constructor(private registry: ToolRegistry) {}

  async onModuleInit(): Promise<void> {
    const configPath = process.env.PLUGINS_CONFIG_PATH ?? path.join(process.cwd(), 'plugins.json');
    try {
      await fs.access(configPath);
    } catch {
      this.logger.debug(`No plugins config found at ${configPath}, skipping plugin loading`);
      return;
    }

    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      const config: PluginsConfig = JSON.parse(raw);
      for (const plugin of config.plugins) {
        this.registerPlugin(plugin);
      }
      this.logger.log(`Loaded ${config.plugins.length} plugins from ${configPath}`);
    } catch (err) {
      this.logger.error(`Failed to load plugins config: ${String(err)}`);
    }
  }

  private registerPlugin(def: PluginDefinition): void {
    // Build Zod schema from definition
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, prop] of Object.entries(def.inputSchema.properties)) {
      shape[key] = prop.type === 'number' ? z.number() : z.string();
      if (prop.description) shape[key] = shape[key].describe(prop.description);
    }
    const inputSchema = z.object(shape);

    const tool: ToolDefinition<typeof inputSchema> = {
      name: def.name,
      description: def.description,
      permission: def.config.type === 'http' ? 'http_request' : 'shell_exec',
      inputSchema,
      toSchema() {
        return {
          name: def.name,
          description: def.description,
          inputSchema: {
            type: 'object',
            properties: def.inputSchema.properties,
            required: def.inputSchema.required ?? [],
          },
        };
      },
      async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<ToolResult> {
        const start = Date.now();
        try {
          if (def.config.type === 'http') {
            const body = Object.keys(input).length ? JSON.stringify(input) : undefined;
            const res = await fetch(def.config.url, {
              method: def.config.method ?? 'POST',
              headers: { 'Content-Type': 'application/json', ...(def.config.headers ?? {}) },
              body,
              signal: AbortSignal.timeout(15000),
            });
            const text = await res.text();
            return { success: res.ok, output: { status: res.status, body: text.slice(0, 10000) }, durationMs: Date.now() - start };
          } else {
            // shell type: replace {{input.key}} placeholders
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            let cmd = def.config.command;
            for (const [k, v] of Object.entries(input)) {
              cmd = cmd.replace(new RegExp(`\\{\\{input\\.${k}\\}\\}`, 'g'), String(v));
            }
            const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
            return { success: true, output: stdout || stderr, durationMs: Date.now() - start };
          }
        } catch (e) {
          return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
        }
      },
    };

    this.registry.register(tool);
    this.logger.log(`Plugin registered: ${def.name} (${def.config.type})`);
  }
}
