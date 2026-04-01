import { Test } from '@nestjs/testing';
import { AgentRunnerService } from './agent-runner.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { ToolRegistry } from '../tools/tool.registry';
import { MemoryService } from '../memory/memory.service';
import { AgentConfig } from './agent.types';

describe('AgentRunnerService', () => {
  let service: AgentRunnerService;
  const mockPrisma = { toolExecutionLog: { create: jest.fn() }, aiUsageLog: { create: jest.fn() }, agentStep: { createMany: jest.fn() } };
  const mockLLM = { chat: jest.fn().mockResolvedValue({ content: 'Done.', toolCalls: [], inputTokens: 10, outputTokens: 5, stopReason: 'end_turn' }), stream: jest.fn() };
  const mockTools = { getForPermissions: jest.fn().mockReturnValue([]), execute: jest.fn() };
  const mockMemory = { getRecent: jest.fn().mockResolvedValue([]), store: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const m = await Test.createTestingModule({ providers: [AgentRunnerService, { provide: PrismaService, useValue: mockPrisma }, { provide: LLMService, useValue: mockLLM }, { provide: ToolRegistry, useValue: mockTools }, { provide: MemoryService, useValue: mockMemory }] }).compile();
    service = m.get(AgentRunnerService);
  });

  const config: AgentConfig = { id: 'test-1', name: 'Test', role: 'WORKER', model: 'claude-haiku-4-5-20251001', provider: 'anthropic', maxIterations: 5 };

  it('completes a simple task', async () => {
    const r = await service.run({ config, userMessage: 'Hello' });
    expect(r.status).toBe('COMPLETED');
    expect(r.output).toBe('Done.');
  });

  it('stores output in memory', async () => {
    await service.run({ config, userMessage: 'Test task' });
    expect(mockMemory.store).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Test task'), expect.any(Object));
  });

  it('fails after max iterations', async () => {
    mockLLM.chat.mockResolvedValue({ content: '', toolCalls: [{ id: '1', name: 'file_read', input: { path: 'x' } }], inputTokens: 10, outputTokens: 5, stopReason: 'tool_use' });
    mockTools.execute.mockResolvedValue({ success: true, output: 'ok', durationMs: 1 });
    const r = await service.run({ config: { ...config, maxIterations: 2 }, userMessage: 'loop' });
    expect(r.status).toBe('FAILED');
  });
});
