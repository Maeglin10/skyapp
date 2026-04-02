import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';
import { ToolDefinition } from './tool.types';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ToolPlugin {
  name: string;
  version: string;
  tools: ToolDefinition[];
}

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);
  private loadedPlugins = new Map<string, ToolPlugin>();

  constructor(private registry: ToolRegistry) {}

  async loadFromDirectory(pluginsDir: string): Promise<void> {
    try {
      const entries = await fs.readdir(pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        await this.loadPlugin(path.join(pluginsDir, entry.name));
      }
    } catch (e) {
      this.logger.warn(`Plugin directory not found: ${pluginsDir}`);
    }
  }

  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as { name: string; version: string; entry: string };

      const pluginModule = await import(path.join(pluginPath, manifest.entry)) as { tools?: ToolDefinition[] };

      if (!pluginModule.tools || !Array.isArray(pluginModule.tools)) {
        this.logger.warn(`Plugin ${manifest.name} has no exported tools array`);
        return;
      }

      for (const tool of pluginModule.tools) {
        this.registry.register(tool);
      }

      this.loadedPlugins.set(manifest.name, { name: manifest.name, version: manifest.version, tools: pluginModule.tools });
      this.logger.log(`Loaded plugin: ${manifest.name}@${manifest.version} (${pluginModule.tools.length} tools)`);
    } catch (e) {
      this.logger.error(`Failed to load plugin at ${pluginPath}: ${String(e)}`);
    }
  }

  getLoadedPlugins(): ToolPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}
