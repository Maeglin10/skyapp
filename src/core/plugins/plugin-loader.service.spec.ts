import { Test, TestingModule } from '@nestjs/testing';
import { PluginLoaderService } from './plugin-loader.service';
import { ToolRegistry } from '../tools/tool.registry';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

describe('PluginLoaderService', () => {
  let service: PluginLoaderService;
  let registry: ToolRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PluginLoaderService, ToolRegistry],
    }).compile();

    service = module.get<PluginLoaderService>(PluginLoaderService);
    registry = module.get<ToolRegistry>(ToolRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PLUGINS_CONFIG_PATH;
  });

  describe('onModuleInit', () => {
    it('should handle missing plugins config gracefully', async () => {
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      const spy = jest.spyOn(service as any, 'registerPlugin');

      await service.onModuleInit();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should load and register plugins from config file', async () => {
      const mockConfig = {
        plugins: [
          {
            name: 'test_plugin',
            description: 'Test plugin',
            permission: 'http_request',
            inputSchema: {
              properties: {
                input: { type: 'string', description: 'Test input' },
              },
              required: ['input'],
            },
            config: {
              type: 'http' as const,
              url: 'https://example.com/api',
              method: 'GET' as const,
            },
          },
        ],
      };

      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockConfig));

      const registerSpy = jest.spyOn(registry, 'register');

      await service.onModuleInit();

      expect(registerSpy).toHaveBeenCalled();
      expect(registerSpy.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle JSON parse errors gracefully', async () => {
      (fs.access as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.readFile as jest.Mock).mockResolvedValueOnce('invalid json');

      const registerSpy = jest.spyOn(registry, 'register');

      await service.onModuleInit();

      expect(registerSpy).not.toHaveBeenCalled();
    });
  });
});
