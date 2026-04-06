export type PluginToolType = 'http' | 'shell';

export interface HttpPluginConfig {
  type: 'http';
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

export interface ShellPluginConfig {
  type: 'shell';
  command: string;  // Template: use {{input.param}} placeholders
}

export interface PluginDefinition {
  name: string;
  description: string;
  permission: 'file_read' | 'file_write' | 'shell_exec' | 'http_request' | 'memory_search';
  inputSchema: {
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  config: HttpPluginConfig | ShellPluginConfig;
}

export interface PluginsConfig {
  plugins: PluginDefinition[];
}
