import { Test } from '@nestjs/testing';
import { ToolRegistry } from './tool.registry';
import { ToolContext } from './tool.types';

const ctx: ToolContext = { agentId: 'test', workingDir: '/tmp', permissions: ['file_read', 'file_write', 'shell_exec', 'http_request'] };

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  beforeEach(async () => {
    const m = await Test.createTestingModule({ providers: [ToolRegistry] }).compile();
    registry = m.get(ToolRegistry);
  });

  it('has built-in tools', () => {
    expect(registry.get('file_read')).toBeDefined();
    expect(registry.get('file_write')).toBeDefined();
    expect(registry.get('shell_exec')).toBeDefined();
    expect(registry.get('http_request')).toBeDefined();
  });

  it('blocks without permission', async () => {
    const r = await registry.execute('file_read', { path: 'x' }, { ...ctx, permissions: [] });
    expect(r.success).toBe(false);
    expect(r.error).toContain('Permission');
  });

  it('fails on invalid input', async () => {
    const r = await registry.execute('file_read', { bad: true }, ctx);
    expect(r.success).toBe(false);
  });

  it('returns error for unknown tool', async () => {
    const r = await registry.execute('nope', {}, ctx);
    expect(r.success).toBe(false);
  });
});
