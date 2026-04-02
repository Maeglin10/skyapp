import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Mock all external services
jest.mock('../src/core/llm/adapters/claude.adapter', () => ({
  ClaudeAdapter: jest.fn().mockImplementation(() => ({
    provider: 'anthropic',
    chat: jest.fn().mockResolvedValue({ content: 'Mocked response', toolCalls: [], inputTokens: 10, outputTokens: 5, stopReason: 'end_turn' }),
    stream: jest.fn(),
  })),
}));

jest.mock('../src/core/llm/adapters/openai.adapter', () => ({
  OpenAIAdapter: jest.fn().mockImplementation(() => ({
    provider: 'openai',
    chat: jest.fn().mockResolvedValue({ content: 'Mocked response', toolCalls: [], inputTokens: 10, outputTokens: 5, stopReason: 'end_turn' }),
    stream: jest.fn(),
  })),
}));

jest.mock('../src/core/llm/adapters/gemini.adapter', () => ({
  GeminiAdapter: jest.fn().mockImplementation(() => ({
    provider: 'gemini',
    chat: jest.fn().mockResolvedValue({ content: 'Mocked response', toolCalls: [], inputTokens: 10, outputTokens: 5, stopReason: 'end_turn' }),
    stream: jest.fn(),
  })),
}));

jest.mock('../src/core/memory/memory.service', () => ({
  MemoryService: jest.fn().mockImplementation(() => ({
    store: jest.fn().mockResolvedValue({ id: 'mem-1', agentId: 'agent-1', content: 'stored', metadata: {}, createdAt: new Date() }),
    search: jest.fn().mockResolvedValue([]),
    getRecent: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    agentStep: { createMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
    aiUsageLog: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    toolExecutionLog: { create: jest.fn().mockResolvedValue({}) },
    memoryEntry: { findMany: jest.fn().mockResolvedValue([]) },
    task: {
      create: jest.fn().mockResolvedValue({ id: 'task-1', title: 'Test', status: 'PENDING' }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 'task-1', title: 'Test', status: 'PENDING' }),
    },
    aiBudget: {
      findFirst: jest.fn().mockResolvedValue({ name: 'default', monthlyLimitUsd: 50, currentMonthSpend: 0, killSwitch: false, alertThreshold: 0.8 }),
      create: jest.fn().mockResolvedValue({ name: 'default', monthlyLimitUsd: 50, currentMonthSpend: 0, killSwitch: false, alertThreshold: 0.8 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  })),
}));

describe('SkyApp E2E', () => {
  let app: INestApplication;
  let httpServer: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
    httpServer = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns 200', async () => {
      const res = await request(httpServer).get('/health');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /tools', () => {
    it('returns list of tools', async () => {
      const res = await request(httpServer).get('/tools');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('name');
    });
  });

  describe('POST /agents/run', () => {
    it('runs an agent and returns result', async () => {
      const res = await request(httpServer)
        .post('/agents/run')
        .send({ message: 'Say hello', provider: 'anthropic', role: 'WORKER' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('status', 'COMPLETED');
      expect(res.body).toHaveProperty('output', 'Mocked response');
    }, 15000);

    it('rejects invalid payload', async () => {
      const res = await request(httpServer)
        .post('/agents/run')
        .send({ provider: 'anthropic' }); // missing message
      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks', () => {
    it('creates a task', async () => {
      const res = await request(httpServer)
        .post('/tasks')
        .send({ title: 'Test Task', description: 'Do something' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('GET /admin/budget', () => {
    it('returns budget status', async () => {
      const res = await request(httpServer).get('/admin/budget');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('monthlyLimitUsd');
    });
  });

  describe('POST /tools/execute', () => {
    it('executes a tool with permission', async () => {
      const res = await request(httpServer)
        .post('/tools/execute')
        .send({ toolName: 'http_request', input: { url: 'https://example.com' }, permissions: ['http_request'] });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success');
    });

    it('blocks tool without permission', async () => {
      const res = await request(httpServer)
        .post('/tools/execute')
        .send({ toolName: 'file_read', input: { path: 'test.txt' }, permissions: [] });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(false);
    });
  });
});
