# SkyApp Multi-Agent System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-grade multi-agent AI orchestration API in TypeScript/NestJS with task DAG scheduling, tool system, vector memory, and multi-LLM support (Claude/OpenAI/Gemini).

**Architecture:** NestJS 11 monolith with isolated core modules (agent, orchestrator, tools, memory, llm). Each agent runs an autonomous reasoning loop with tool calls, short-term context, and long-term vector memory. A coordinator agent decomposes complex tasks into a DAG of worker agents executed in parallel via Semaphore.

**Tech Stack:** NestJS 11, TypeScript 5.7, Prisma 6, PostgreSQL + pgvector, Zod, @anthropic-ai/sdk, openai, @google/generative-ai, SSE streaming, Winston, Jest.

---

## Task 1: Project Scaffold + NestJS Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/main.ts`
- Create: `src/app.module.ts`
- Create: `.env.example`
- Create: `nest-cli.json`

**Step 1: Init project**
```bash
cd /Users/milliandvalentin/skyapp
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-fastify @nestjs/config @nestjs/swagger fastify reflect-metadata rxjs
npm install --save-dev @nestjs/cli typescript ts-node @types/node jest @nestjs/testing ts-jest @types/jest
```

**Step 2: Create `tsconfig.json`**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@core/*": ["src/core/*"],
      "@api/*": ["src/api/*"],
      "@services/*": ["src/services/*"],
      "@schemas/*": ["src/schemas/*"]
    }
  }
}
```

**Step 3: Create `nest-cli.json`**
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**Step 4: Create `src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('SkyApp Multi-Agent API')
    .setDescription('Production-grade multi-agent AI orchestration system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`SkyApp running on: ${await app.getUrl()}`);
}
bootstrap();
```

**Step 5: Create `src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
```

**Step 6: Create `.env.example`**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/skyapp
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PORT=3000
NODE_ENV=development
AI_BUDGET_DEFAULT_MONTHLY_USD=50
AI_BUDGET_ALERT_THRESHOLD=0.8
DEBUG_MODE=false
```

**Step 7: Commit**
```bash
git init
git add .
git commit -m "feat: scaffold NestJS project with Fastify + Swagger"
```

---

## Task 2: Prisma Schema + Database Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/prisma/prisma.module.ts`
- Create: `src/prisma/prisma.service.ts`

**Step 1: Install Prisma**
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

**Step 2: Create `prisma/schema.prisma`**
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

enum AgentRole {
  COORDINATOR
  WORKER
  ANALYST
  DEBUGGER
}

enum AgentStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  BLOCKED
}

enum TaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  SKIPPED
}

enum LLMProvider {
  ANTHROPIC
  OPENAI
  GEMINI
}

model Agent {
  id          String      @id @default(uuid())
  name        String
  role        AgentRole
  model       String
  provider    LLMProvider
  systemPrompt String?
  maxIterations Int       @default(10)
  status      AgentStatus @default(PENDING)
  metadata    Json        @default("{}")
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  tasks       Task[]
  steps       AgentStep[]
  memories    MemoryEntry[]
  usageLogs   AiUsageLog[]
}

model Task {
  id           String     @id @default(uuid())
  agentId      String?
  agent        Agent?     @relation(fields: [agentId], references: [id])
  parentTaskId String?
  parentTask   Task?      @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  childTasks   Task[]     @relation("TaskHierarchy")
  dependencies String[]   @default([])
  title        String
  description  String
  status       TaskStatus @default(PENDING)
  result       Json?
  error        String?
  retryCount   Int        @default(0)
  maxRetries   Int        @default(3)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  completedAt  DateTime?
}

model AgentStep {
  id         String   @id @default(uuid())
  agentId    String
  agent      Agent    @relation(fields: [agentId], references: [id])
  iteration  Int
  type       String   // "reasoning" | "tool_call" | "tool_result" | "output"
  content    Json
  tokensUsed Int      @default(0)
  durationMs Int      @default(0)
  createdAt  DateTime @default(now())
}

model ToolExecutionLog {
  id         String   @id @default(uuid())
  agentId    String
  toolName   String
  input      Json
  output     Json?
  error      String?
  durationMs Int      @default(0)
  success    Boolean
  createdAt  DateTime @default(now())
}

model MemoryEntry {
  id        String                      @id @default(uuid())
  agentId   String
  agent     Agent                       @relation(fields: [agentId], references: [id])
  content   String
  embedding Unsupported("vector(1536)")?
  metadata  Json                        @default("{}")
  createdAt DateTime                    @default(now())
}

model AiUsageLog {
  id           String      @id @default(uuid())
  agentId      String
  agent        Agent       @relation(fields: [agentId], references: [id])
  provider     LLMProvider
  model        String
  inputTokens  Int
  outputTokens Int
  costUsd      Float
  createdAt    DateTime    @default(now())
}

model AiBudget {
  id                String   @id @default(uuid())
  name              String   @unique
  monthlyLimitUsd   Float    @default(50)
  dailyLimitUsd     Float?
  alertThreshold    Float    @default(0.8)
  killSwitch        Boolean  @default(false)
  currentMonthSpend Float    @default(0)
  currentDaySpend   Float    @default(0)
  resetAt           DateTime
  updatedAt         DateTime @updatedAt
}
```

**Step 3: Create `src/prisma/prisma.service.ts`**
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Step 4: Create `src/prisma/prisma.module.ts`**
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 5: Run migration**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Step 6: Commit**
```bash
git add prisma/ src/prisma/
git commit -m "feat: prisma schema with agent, task, memory, usage models + pgvector"
```

---

## Task 3: LLM Adapter Layer (`core/llm/`)

**Files:**
- Create: `src/core/llm/llm.types.ts`
- Create: `src/core/llm/adapters/claude.adapter.ts`
- Create: `src/core/llm/adapters/openai.adapter.ts`
- Create: `src/core/llm/adapters/gemini.adapter.ts`
- Create: `src/core/llm/llm.service.ts`
- Create: `src/core/llm/llm.module.ts`
- Test: `src/core/llm/llm.service.spec.ts`

**Step 1: Install LLM SDKs**
```bash
npm install @anthropic-ai/sdk openai @google/generative-ai
```

**Step 2: Create `src/core/llm/llm.types.ts`**
```typescript
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  inputTokens: number;
  outputTokens: number;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop';
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'done';
  data: string | ToolCall;
}

export interface LLMAdapter {
  provider: string;
  chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse>;
  stream(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent>;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
```

**Step 3: Create `src/core/llm/adapters/claude.adapter.ts`**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class ClaudeAdapter implements LLMAdapter {
  readonly provider = 'anthropic';
  private client: Anthropic;

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  async chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      tools: tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
      })),
    });

    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => ({ id: (b as Anthropic.ToolUseBlock).id, name: (b as Anthropic.ToolUseBlock).name, input: (b as Anthropic.ToolUseBlock).input as Record<string, unknown> }));

    const textContent = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    return {
      content: textContent,
      toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const stream = await this.client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', data: event.delta.text };
      }
    }
    yield { type: 'done', data: '' };
  }
}
```

**Step 4: Create `src/core/llm/adapters/openai.adapter.ts`**
```typescript
import OpenAI from 'openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class OpenAIAdapter implements LLMAdapter {
  readonly provider = 'openai';
  private client: OpenAI;

  constructor(private config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async chat(messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    allMessages.push(...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: allMessages,
      tools: tools?.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      })),
    });

    const choice = response.choices[0];
    const toolCalls = (choice.message.tool_calls ?? []).map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    return {
      content: choice.message.content ?? '',
      toolCalls,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
    };
  }

  async *stream(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt });
    allMessages.push(...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));

    const stream = await this.client.chat.completions.create({ model: 'gpt-4o', messages: allMessages, stream: true });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield { type: 'text', data: delta };
    }
    yield { type: 'done', data: '' };
  }
}
```

**Step 5: Create `src/core/llm/adapters/gemini.adapter.ts`**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from '../llm.types';

@Injectable()
export class GeminiAdapter implements LLMAdapter {
  readonly provider = 'gemini';
  private client: GoogleGenerativeAI;

  constructor(private config: ConfigService) {
    this.client = new GoogleGenerativeAI(config.get('GEMINI_API_KEY') ?? '');
  }

  async chat(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);

    return {
      content: result.response.text(),
      toolCalls: [],
      inputTokens: result.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: result.response.usageMetadata?.candidatesTokenCount ?? 0,
      stopReason: 'end_turn',
    };
  }

  async *stream(messages: Message[], _tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: systemPrompt });
    const lastMessage = messages[messages.length - 1];
    const result = await model.generateContentStream(lastMessage.content);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: 'text', data: text };
    }
    yield { type: 'done', data: '' };
  }
}
```

**Step 6: Create `src/core/llm/llm.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { LLMAdapter, LLMResponse, Message, StreamEvent, ToolSchema } from './llm.types';

export type LLMProviderKey = 'anthropic' | 'openai' | 'gemini';

@Injectable()
export class LLMService {
  private adapters: Map<string, LLMAdapter>;

  constructor(
    private claude: ClaudeAdapter,
    private openai: OpenAIAdapter,
    private gemini: GeminiAdapter,
  ) {
    this.adapters = new Map([
      ['anthropic', claude],
      ['openai', openai],
      ['gemini', gemini],
    ]);
  }

  getAdapter(provider: LLMProviderKey): LLMAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Unknown LLM provider: ${provider}`);
    return adapter;
  }

  async chat(provider: LLMProviderKey, messages: Message[], tools?: ToolSchema[], systemPrompt?: string): Promise<LLMResponse> {
    return this.getAdapter(provider).chat(messages, tools, systemPrompt);
  }

  stream(provider: LLMProviderKey, messages: Message[], tools?: ToolSchema[], systemPrompt?: string): AsyncIterable<StreamEvent> {
    return this.getAdapter(provider).stream(messages, tools, systemPrompt);
  }
}
```

**Step 7: Create `src/core/llm/llm.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { LLMService } from './llm.service';

@Module({
  providers: [ClaudeAdapter, OpenAIAdapter, GeminiAdapter, LLMService],
  exports: [LLMService],
})
export class LLMModule {}
```

**Step 8: Write test `src/core/llm/llm.service.spec.ts`**
```typescript
import { Test } from '@nestjs/testing';
import { LLMService } from './llm.service';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(async () => {
    const mockAdapter = { provider: 'mock', chat: jest.fn(), stream: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        LLMService,
        { provide: ClaudeAdapter, useValue: { ...mockAdapter, provider: 'anthropic' } },
        { provide: OpenAIAdapter, useValue: { ...mockAdapter, provider: 'openai' } },
        { provide: GeminiAdapter, useValue: { ...mockAdapter, provider: 'gemini' } },
      ],
    }).compile();
    service = module.get(LLMService);
  });

  it('should return correct adapter for each provider', () => {
    expect(service.getAdapter('anthropic').provider).toBe('anthropic');
    expect(service.getAdapter('openai').provider).toBe('openai');
    expect(service.getAdapter('gemini').provider).toBe('gemini');
  });

  it('should throw for unknown provider', () => {
    expect(() => service.getAdapter('unknown' as any)).toThrow('Unknown LLM provider');
  });
});
```

**Step 9: Run tests**
```bash
npx jest src/core/llm/llm.service.spec.ts --no-coverage
```
Expected: PASS

**Step 10: Commit**
```bash
git add src/core/llm/
git commit -m "feat: LLM adapter layer for Claude, OpenAI, Gemini with unified interface"
```

---

## Task 4: Tool System (`core/tools/`)

**Files:**
- Create: `src/core/tools/tool.types.ts`
- Create: `src/core/tools/tool.registry.ts`
- Create: `src/core/tools/built-in/file-read.tool.ts`
- Create: `src/core/tools/built-in/file-write.tool.ts`
- Create: `src/core/tools/built-in/shell-exec.tool.ts`
- Create: `src/core/tools/built-in/http-request.tool.ts`
- Create: `src/core/tools/tools.module.ts`
- Test: `src/core/tools/tool.registry.spec.ts`

**Step 1: Install Zod**
```bash
npm install zod
```

**Step 2: Create `src/core/tools/tool.types.ts`**
```typescript
import { z } from 'zod';

export interface ToolContext {
  agentId: string;
  workingDir: string;
  permissions: ToolPermission[];
  abortSignal?: AbortSignal;
}

export type ToolPermission = 'file_read' | 'file_write' | 'shell_exec' | 'http_request' | 'memory_search';

export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  durationMs: number;
}

export interface ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: T;
  execute(input: z.infer<T>, ctx: ToolContext): Promise<ToolResult>;
  toSchema(): { name: string; description: string; inputSchema: Record<string, unknown> };
}
```

**Step 3: Create `src/core/tools/built-in/file-read.tool.ts`**
```typescript
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const FileReadInput = z.object({ path: z.string().describe('Relative path to file within working directory') });

export const FileReadTool: ToolDefinition<typeof FileReadInput> = {
  name: 'file_read',
  description: 'Read the contents of a file. Path must be relative to the agent working directory.',
  permission: 'file_read',
  inputSchema: FileReadInput,
  async execute(input, ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    try {
      const safePath = path.resolve(ctx.workingDir, input.path);
      if (!safePath.startsWith(ctx.workingDir)) {
        return { success: false, output: null, error: 'Path traversal not allowed', durationMs: Date.now() - start };
      }
      const content = await fs.readFile(safePath, 'utf-8');
      return { success: true, output: content, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } };
  },
};
```

**Step 4: Create `src/core/tools/built-in/file-write.tool.ts`**
```typescript
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const FileWriteInput = z.object({
  path: z.string().describe('Relative path within working directory'),
  content: z.string().describe('File content to write'),
});

export const FileWriteTool: ToolDefinition<typeof FileWriteInput> = {
  name: 'file_write',
  description: 'Write content to a file. Creates parent directories if needed.',
  permission: 'file_write',
  inputSchema: FileWriteInput,
  async execute(input, ctx: ToolContext): Promise<ToolResult> {
    const start = Date.now();
    try {
      const safePath = path.resolve(ctx.workingDir, input.path);
      if (!safePath.startsWith(ctx.workingDir)) {
        return { success: false, output: null, error: 'Path traversal not allowed', durationMs: Date.now() - start };
      }
      await fs.mkdir(path.dirname(safePath), { recursive: true });
      await fs.writeFile(safePath, input.content, 'utf-8');
      return { success: true, output: `Written ${input.content.length} bytes to ${input.path}`, durationMs: Date.now() - start };
    } catch (e: unknown) {
      return { success: false, output: null, error: String(e), durationMs: Date.now() - start };
    }
  },
  toSchema() {
    return { name: this.name, description: this.description, inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } };
  },
};
```

**Step 5: Create `src/core/tools/built-in/shell-exec.tool.ts`**
```typescript
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ToolDefinition, ToolContext, ToolResult } from '../tool.types';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = ['ls', 'cat', 'echo', 'pwd', 'node', 'npm', 'npx', 'git', 'grep', 'find', 'wc', 'head', 'tail'];

const ShellExecInput = z.object({
  command: z.string().describe('Shell command to execute'),
  timeout: z.number().optional().default(10000).describe('Timeout in milliseconds'),
});

export const ShellExecTool: ToolDefinition<typeof ShellExecInput> = {
  name: 'shell_exec',
  description: 'Execute a shell command within the agent working directory. Only whitelisted commands are allowed.',
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
```

**Step 6: Create `src/core/tools/built-in/http-request.tool.ts`**
```typescript
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
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        signal: AbortSignal.timeout(15000),
      });
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
```

**Step 7: Create `src/core/tools/tool.registry.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ToolDefinition, ToolContext, ToolPermission, ToolResult } from './tool.types';
import { FileReadTool } from './built-in/file-read.tool';
import { FileWriteTool } from './built-in/file-write.tool';
import { ShellExecTool } from './built-in/shell-exec.tool';
import { HttpRequestTool } from './built-in/http-request.tool';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.register(FileReadTool);
    this.register(FileWriteTool);
    this.register(ShellExecTool);
    this.register(HttpRequestTool);
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Tool registered: ${tool.name}`);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getForPermissions(permissions: ToolPermission[]): ToolDefinition[] {
    return this.getAll().filter(t => permissions.includes(t.permission));
  }

  async execute(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) return { success: false, output: null, error: `Tool '${name}' not found`, durationMs: 0 };

    if (!ctx.permissions.includes(tool.permission)) {
      return { success: false, output: null, error: `Permission '${tool.permission}' not granted`, durationMs: 0 };
    }

    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, output: null, error: `Invalid input: ${parsed.error.message}`, durationMs: 0 };
    }

    this.logger.debug(`Executing tool: ${name} for agent: ${ctx.agentId}`);
    return tool.execute(parsed.data, ctx);
  }
}
```

**Step 8: Create `src/core/tools/tools.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool.registry';

@Module({
  providers: [ToolRegistry],
  exports: [ToolRegistry],
})
export class ToolsModule {}
```

**Step 9: Write test `src/core/tools/tool.registry.spec.ts`**
```typescript
import { Test } from '@nestjs/testing';
import { ToolRegistry } from './tool.registry';
import { ToolContext } from './tool.types';

const ctx: ToolContext = {
  agentId: 'test-agent',
  workingDir: '/tmp/test',
  permissions: ['file_read', 'file_write', 'shell_exec', 'http_request'],
};

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [ToolRegistry] }).compile();
    registry = module.get(ToolRegistry);
  });

  it('should have built-in tools registered', () => {
    expect(registry.get('file_read')).toBeDefined();
    expect(registry.get('file_write')).toBeDefined();
    expect(registry.get('shell_exec')).toBeDefined();
    expect(registry.get('http_request')).toBeDefined();
  });

  it('should block execution without permission', async () => {
    const result = await registry.execute('file_read', { path: 'test.txt' }, { ...ctx, permissions: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Permission');
  });

  it('should fail on invalid input', async () => {
    const result = await registry.execute('file_read', { invalid: 'data' }, ctx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid input');
  });

  it('should return error for unknown tool', async () => {
    const result = await registry.execute('unknown_tool', {}, ctx);
    expect(result.success).toBe(false);
  });
});
```

**Step 10: Run tests**
```bash
npx jest src/core/tools/tool.registry.spec.ts --no-coverage
```
Expected: PASS

**Step 11: Commit**
```bash
git add src/core/tools/
git commit -m "feat: tool system with registry, permissions, Zod validation, 4 built-in tools"
```

---

## Task 5: Memory System (`core/memory/`)

**Files:**
- Create: `src/core/memory/memory.types.ts`
- Create: `src/core/memory/memory.service.ts`
- Create: `src/core/memory/memory.module.ts`
- Test: `src/core/memory/memory.service.spec.ts`

**Step 1: Create `src/core/memory/memory.types.ts`**
```typescript
export interface MemoryEntry {
  id: string;
  agentId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MemorySearchResult extends MemoryEntry {
  similarity: number;
}
```

**Step 2: Create `src/core/memory/memory.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { MemoryEntry, MemorySearchResult } from './memory.types';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  async store(agentId: string, content: string, metadata: Record<string, unknown> = {}): Promise<MemoryEntry> {
    const embedding = await this.generateEmbedding(content);
    const entry = await this.prisma.$queryRaw<MemoryEntry[]>`
      INSERT INTO "MemoryEntry" (id, "agentId", content, embedding, metadata, "createdAt")
      VALUES (gen_random_uuid(), ${agentId}, ${content}, ${`[${embedding.join(',')}]`}::vector, ${metadata}::jsonb, NOW())
      RETURNING id, "agentId", content, metadata, "createdAt"
    `;
    this.logger.debug(`Stored memory for agent ${agentId}: ${content.slice(0, 50)}...`);
    return entry[0];
  }

  async search(agentId: string, query: string, topK = 5): Promise<MemorySearchResult[]> {
    const embedding = await this.generateEmbedding(query);
    const results = await this.prisma.$queryRaw<(MemoryEntry & { similarity: number })[]>`
      SELECT id, "agentId", content, metadata, "createdAt",
             1 - (embedding <=> ${`[${embedding.join(',')}]`}::vector) as similarity
      FROM "MemoryEntry"
      WHERE "agentId" = ${agentId}
      ORDER BY embedding <=> ${`[${embedding.join(',')}]`}::vector
      LIMIT ${topK}
    `;
    return results;
  }

  async getRecent(agentId: string, limit = 20): Promise<MemoryEntry[]> {
    return this.prisma.memoryEntry.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as MemoryEntry[];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings (text-embedding-3-small = 1536 dims)
    const OpenAI = await import('openai').then(m => m.default);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
```

**Step 3: Create `src/core/memory/memory.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [LLMModule],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
```

**Step 4: Write test `src/core/memory/memory.service.spec.ts`**
```typescript
import { Test } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';

describe('MemoryService', () => {
  let service: MemoryService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    memoryEntry: { findMany: jest.fn() },
  };
  const mockLLM = { chat: jest.fn(), stream: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MemoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LLMService, useValue: mockLLM },
      ],
    }).compile();
    service = module.get(MemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call getRecent from prisma', async () => {
    mockPrisma.memoryEntry.findMany.mockResolvedValue([]);
    const result = await service.getRecent('agent-1', 10);
    expect(result).toEqual([]);
    expect(mockPrisma.memoryEntry.findMany).toHaveBeenCalledWith({
      where: { agentId: 'agent-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });
});
```

**Step 5: Run tests**
```bash
npx jest src/core/memory/memory.service.spec.ts --no-coverage
```
Expected: PASS

**Step 6: Commit**
```bash
git add src/core/memory/
git commit -m "feat: memory system with pgvector store/search and short-term context"
```

---

## Task 6: Agent Runtime (`core/agent/`)

**Files:**
- Create: `src/core/agent/agent.types.ts`
- Create: `src/core/agent/agent-context.ts`
- Create: `src/core/agent/agent-runner.service.ts`
- Create: `src/core/agent/agent.module.ts`
- Test: `src/core/agent/agent-runner.service.spec.ts`

**Step 1: Create `src/core/agent/agent.types.ts`**
```typescript
import { Message } from '../llm/llm.types';

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
export type AgentRole = 'COORDINATOR' | 'WORKER' | 'ANALYST' | 'DEBUGGER';
export type LLMProviderKey = 'anthropic' | 'openai' | 'gemini';

export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  model: string;
  provider: LLMProviderKey;
  systemPrompt?: string;
  maxIterations?: number;
  permissions?: string[];
  workingDir?: string;
}

export interface AgentState {
  status: AgentStatus;
  messages: Message[];
  iteration: number;
  steps: AgentStep[];
  output?: string;
  error?: string;
}

export interface AgentStep {
  iteration: number;
  type: 'reasoning' | 'tool_call' | 'tool_result' | 'output';
  content: unknown;
  tokensUsed: number;
  durationMs: number;
  timestamp: Date;
}

export interface RunAgentInput {
  agentId?: string;
  config: AgentConfig;
  userMessage: string;
  context?: string;
}

export interface RunAgentResult {
  agentId: string;
  status: AgentStatus;
  output: string;
  steps: AgentStep[];
  totalTokens: number;
  durationMs: number;
}
```

**Step 2: Create `src/core/agent/agent-context.ts`**
```typescript
import { AsyncLocalStorage } from 'async_hooks';
import { AgentConfig, AgentState } from './agent.types';

export interface AgentContextData {
  config: AgentConfig;
  state: AgentState;
  startTime: number;
}

export const agentStorage = new AsyncLocalStorage<AgentContextData>();

export function getAgentContext(): AgentContextData | undefined {
  return agentStorage.getStore();
}

export function runWithAgentContext<T>(data: AgentContextData, fn: () => T): T {
  return agentStorage.run(data, fn);
}
```

**Step 3: Create `src/core/agent/agent-runner.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { ToolRegistry } from '../tools/tool.registry';
import { MemoryService } from '../memory/memory.service';
import { AgentConfig, AgentState, AgentStep, RunAgentInput, RunAgentResult } from './agent.types';
import { Message, ToolCall } from '../llm/llm.types';
import { ToolContext, ToolPermission } from '../tools/tool.types';

@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private tools: ToolRegistry,
    private memory: MemoryService,
  ) {}

  async run(input: RunAgentInput): Promise<RunAgentResult> {
    const startTime = Date.now();
    const config = { ...input.config, maxIterations: input.config.maxIterations ?? 10 };
    const agentId = input.agentId ?? crypto.randomUUID();

    const state: AgentState = {
      status: 'RUNNING',
      messages: [],
      iteration: 0,
      steps: [],
    };

    // Build initial context from memory
    const memories = await this.memory.getRecent(agentId, 10);
    const memoryContext = memories.length
      ? `\n\nRelevant memory:\n${memories.map(m => `- ${m.content}`).join('\n')}`
      : '';

    const systemPrompt = (config.systemPrompt ?? this.defaultSystemPrompt(config.role)) + memoryContext;

    // Add user message
    if (input.context) {
      state.messages.push({ role: 'user', content: `Context: ${input.context}` });
      state.messages.push({ role: 'assistant', content: 'Understood. Ready to proceed.' });
    }
    state.messages.push({ role: 'user', content: input.userMessage });

    // Get available tools for this agent
    const permissions = (config.permissions ?? ['file_read', 'shell_exec', 'http_request', 'memory_search']) as ToolPermission[];
    const availableTools = this.tools.getForPermissions(permissions).map(t => t.toSchema());

    const toolCtx: ToolContext = {
      agentId,
      workingDir: config.workingDir ?? process.cwd(),
      permissions,
    };

    let totalTokens = 0;

    // Agent loop
    while (state.iteration < config.maxIterations) {
      state.iteration++;
      this.logger.debug(`Agent ${agentId} iteration ${state.iteration}/${config.maxIterations}`);

      const stepStart = Date.now();
      const response = await this.llm.chat(config.provider, state.messages, availableTools, systemPrompt);
      totalTokens += response.inputTokens + response.outputTokens;

      // Log usage
      await this.logUsage(agentId, config, response.inputTokens, response.outputTokens);

      // Record reasoning step
      const reasoningStep: AgentStep = {
        iteration: state.iteration,
        type: 'reasoning',
        content: response.content,
        tokensUsed: response.inputTokens + response.outputTokens,
        durationMs: Date.now() - stepStart,
        timestamp: new Date(),
      };
      state.steps.push(reasoningStep);

      // No tool calls → done
      if (response.toolCalls.length === 0 || response.stopReason === 'end_turn') {
        state.status = 'COMPLETED';
        state.output = response.content;
        break;
      }

      // Add assistant message
      state.messages.push({ role: 'assistant', content: response.content || JSON.stringify(response.toolCalls) });

      // Execute tool calls
      for (const toolCall of response.toolCalls) {
        const toolResult = await this.executeToolCall(toolCall, toolCtx, state, agentId);
        state.messages.push({ role: 'user', content: `Tool result for ${toolCall.name}: ${JSON.stringify(toolResult.output ?? toolResult.error)}` });
      }
    }

    if (state.status === 'RUNNING') {
      state.status = 'FAILED';
      state.error = `Max iterations (${config.maxIterations}) reached`;
    }

    // Persist steps to DB
    await this.persistSteps(agentId, state.steps);

    // Store output in long-term memory
    if (state.output) {
      await this.memory.store(agentId, `Task: ${input.userMessage}\nResult: ${state.output}`, { role: config.role });
    }

    return {
      agentId,
      status: state.status,
      output: state.output ?? state.error ?? '',
      steps: state.steps,
      totalTokens,
      durationMs: Date.now() - startTime,
    };
  }

  private async executeToolCall(toolCall: ToolCall, ctx: ToolContext, state: AgentState, agentId: string) {
    const start = Date.now();
    this.logger.debug(`Agent ${agentId} calling tool: ${toolCall.name}`);

    const result = await this.tools.execute(toolCall.name, toolCall.input, ctx);

    const step: AgentStep = {
      iteration: state.iteration,
      type: result.success ? 'tool_result' : 'tool_call',
      content: { tool: toolCall.name, input: toolCall.input, output: result.output, error: result.error },
      tokensUsed: 0,
      durationMs: Date.now() - start,
      timestamp: new Date(),
    };
    state.steps.push(step);

    // Log tool execution
    await this.prisma.toolExecutionLog.create({
      data: {
        agentId,
        toolName: toolCall.name,
        input: toolCall.input as object,
        output: result.output as object,
        error: result.error,
        durationMs: result.durationMs,
        success: result.success,
      },
    });

    return result;
  }

  private defaultSystemPrompt(role: string): string {
    const prompts: Record<string, string> = {
      COORDINATOR: 'You are a coordinator agent. Decompose complex tasks into clear subtasks and delegate them efficiently.',
      WORKER: 'You are a worker agent. Execute assigned tasks precisely using available tools.',
      ANALYST: 'You are an analyst agent. Analyze data, identify patterns, and provide insights.',
      DEBUGGER: 'You are a debugger agent. Find root causes of problems and propose solutions.',
    };
    return prompts[role] ?? 'You are a helpful AI agent. Complete the assigned task.';
  }

  private async logUsage(agentId: string, config: AgentConfig, inputTokens: number, outputTokens: number) {
    const costs: Record<string, number> = { 'anthropic': 0.000015, 'openai': 0.000005, 'gemini': 0.000001 };
    const costUsd = (inputTokens + outputTokens) * (costs[config.provider] ?? 0.00001);
    await this.prisma.aiUsageLog.create({
      data: {
        agentId,
        provider: config.provider.toUpperCase() as 'ANTHROPIC' | 'OPENAI' | 'GEMINI',
        model: config.model,
        inputTokens,
        outputTokens,
        costUsd,
      },
    });
  }

  private async persistSteps(agentId: string, steps: AgentStep[]) {
    await this.prisma.agentStep.createMany({
      data: steps.map(s => ({
        agentId,
        iteration: s.iteration,
        type: s.type,
        content: s.content as object,
        tokensUsed: s.tokensUsed,
        durationMs: s.durationMs,
      })),
    });
  }
}
```

**Step 4: Create `src/core/agent/agent.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { AgentRunnerService } from './agent-runner.service';
import { LLMModule } from '../llm/llm.module';
import { ToolsModule } from '../tools/tools.module';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [LLMModule, ToolsModule, MemoryModule],
  providers: [AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentModule {}
```

**Step 5: Write test `src/core/agent/agent-runner.service.spec.ts`**
```typescript
import { Test } from '@nestjs/testing';
import { AgentRunnerService } from './agent-runner.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LLMService } from '../llm/llm.service';
import { ToolRegistry } from '../tools/tool.registry';
import { MemoryService } from '../memory/memory.service';
import { AgentConfig } from './agent.types';

describe('AgentRunnerService', () => {
  let service: AgentRunnerService;

  const mockPrisma = {
    toolExecutionLog: { create: jest.fn() },
    aiUsageLog: { create: jest.fn() },
    agentStep: { createMany: jest.fn() },
  };

  const mockLLM = {
    chat: jest.fn().mockResolvedValue({
      content: 'Task completed.',
      toolCalls: [],
      inputTokens: 100,
      outputTokens: 50,
      stopReason: 'end_turn',
    }),
    stream: jest.fn(),
  };

  const mockTools = {
    getForPermissions: jest.fn().mockReturnValue([]),
    execute: jest.fn(),
  };

  const mockMemory = {
    getRecent: jest.fn().mockResolvedValue([]),
    store: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AgentRunnerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LLMService, useValue: mockLLM },
        { provide: ToolRegistry, useValue: mockTools },
        { provide: MemoryService, useValue: mockMemory },
      ],
    }).compile();
    service = module.get(AgentRunnerService);
  });

  const config: AgentConfig = {
    id: 'test-1',
    name: 'TestAgent',
    role: 'WORKER',
    model: 'claude-opus-4-6',
    provider: 'anthropic',
    maxIterations: 5,
  };

  it('should complete a simple task in one iteration', async () => {
    const result = await service.run({ config, userMessage: 'Say hello' });
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toBe('Task completed.');
    expect(result.steps).toHaveLength(1);
    expect(mockLLM.chat).toHaveBeenCalledTimes(1);
  });

  it('should store output in memory on completion', async () => {
    await service.run({ config, userMessage: 'Test task' });
    expect(mockMemory.store).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Test task'),
      expect.any(Object),
    );
  });

  it('should fail after max iterations with tool calls', async () => {
    mockLLM.chat.mockResolvedValue({
      content: 'Thinking...',
      toolCalls: [{ id: '1', name: 'file_read', input: { path: 'test.txt' } }],
      inputTokens: 100,
      outputTokens: 50,
      stopReason: 'tool_use',
    });
    mockTools.execute.mockResolvedValue({ success: true, output: 'file content', durationMs: 10 });

    const result = await service.run({ config: { ...config, maxIterations: 2 }, userMessage: 'Infinite loop task' });
    expect(result.status).toBe('FAILED');
    expect(result.error).toContain('Max iterations');
  });
});
```

**Step 6: Run tests**
```bash
npx jest src/core/agent/agent-runner.service.spec.ts --no-coverage
```
Expected: PASS

**Step 7: Commit**
```bash
git add src/core/agent/
git commit -m "feat: agent runtime with loop, tool execution, memory integration, usage tracking"
```

---

## Task 7: Orchestrator + Task DAG (`core/orchestrator/`)

**Files:**
- Create: `src/core/orchestrator/task-graph.ts`
- Create: `src/core/orchestrator/orchestrator.service.ts`
- Create: `src/core/orchestrator/orchestrator.module.ts`
- Test: `src/core/orchestrator/task-graph.spec.ts`

**Step 1: Create `src/core/orchestrator/task-graph.ts`**
```typescript
export interface TaskNode {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  agentRole: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: unknown;
  error?: string;
}

export class TaskGraph {
  private nodes = new Map<string, TaskNode>();

  addTask(task: TaskNode): void {
    this.nodes.set(task.id, task);
  }

  getReadyTasks(): TaskNode[] {
    return Array.from(this.nodes.values()).filter(node => {
      if (node.status !== 'PENDING') return false;
      return node.dependencies.every(depId => {
        const dep = this.nodes.get(depId);
        return dep?.status === 'COMPLETED';
      });
    });
  }

  markRunning(id: string): void {
    const node = this.nodes.get(id);
    if (node) node.status = 'RUNNING';
  }

  markCompleted(id: string, result: unknown): void {
    const node = this.nodes.get(id);
    if (node) { node.status = 'COMPLETED'; node.result = result; }
  }

  markFailed(id: string, error: string): void {
    const node = this.nodes.get(id);
    if (node) { node.status = 'FAILED'; node.error = error; }
  }

  isComplete(): boolean {
    return Array.from(this.nodes.values()).every(n => n.status === 'COMPLETED' || n.status === 'FAILED');
  }

  hasFailures(): boolean {
    return Array.from(this.nodes.values()).some(n => n.status === 'FAILED');
  }

  getResults(): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    for (const [id, node] of this.nodes) {
      results[id] = { title: node.title, status: node.status, result: node.result, error: node.error };
    }
    return results;
  }

  size(): number { return this.nodes.size; }
}
```

**Step 2: Create `src/core/orchestrator/orchestrator.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AgentRunnerService } from '../agent/agent-runner.service';
import { LLMService } from '../llm/llm.service';
import { TaskGraph, TaskNode } from './task-graph';
import { AgentConfig } from '../agent/agent.types';

export interface OrchestratorInput {
  objective: string;
  context?: string;
  maxConcurrency?: number;
  coordinatorProvider?: 'anthropic' | 'openai' | 'gemini';
}

export interface OrchestratorResult {
  objective: string;
  taskResults: Record<string, unknown>;
  summary: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  durationMs: number;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private agentRunner: AgentRunnerService,
    private llm: LLMService,
  ) {}

  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const maxConcurrency = input.maxConcurrency ?? 3;
    const provider = input.coordinatorProvider ?? 'anthropic';

    this.logger.log(`Orchestrating: ${input.objective}`);

    // Step 1: Coordinator decomposes objective into tasks
    const tasks = await this.decomposeTasks(input.objective, input.context, provider);
    this.logger.log(`Decomposed into ${tasks.length} tasks`);

    // Step 2: Build task graph
    const graph = new TaskGraph();
    for (const task of tasks) graph.addTask(task);

    // Step 3: Execute tasks respecting dependencies
    await this.executeTasks(graph, maxConcurrency);

    // Step 4: Synthesize results
    const results = graph.getResults();
    const summary = await this.synthesizeResults(input.objective, results, provider);

    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const failed = tasks.filter(t => t.status === 'FAILED').length;

    return {
      objective: input.objective,
      taskResults: results,
      summary,
      totalTasks: tasks.length,
      completedTasks: completed,
      failedTasks: failed,
      durationMs: Date.now() - startTime,
    };
  }

  private async decomposeTasks(objective: string, context: string | undefined, provider: 'anthropic' | 'openai' | 'gemini'): Promise<TaskNode[]> {
    const systemPrompt = `You are a task decomposition expert. Break down objectives into a JSON list of tasks.
Each task must have: id (string), title, description, dependencies (array of other task IDs), agentRole (WORKER|ANALYST|DEBUGGER).
Respond ONLY with valid JSON array. No markdown, no explanation.`;

    const response = await this.llm.chat(provider, [
      { role: 'user', content: `Decompose this objective into 2-5 tasks:\n${objective}${context ? `\n\nContext: ${context}` : ''}` },
    ], undefined, systemPrompt);

    try {
      const parsed = JSON.parse(response.content) as Omit<TaskNode, 'status'>[];
      return parsed.map(t => ({ ...t, status: 'PENDING' as const }));
    } catch {
      // Fallback: single task
      return [{
        id: crypto.randomUUID(),
        title: 'Execute objective',
        description: objective,
        dependencies: [],
        agentRole: 'WORKER',
        status: 'PENDING',
      }];
    }
  }

  private async executeTasks(graph: TaskGraph, maxConcurrency: number): Promise<void> {
    const running = new Set<Promise<void>>();

    while (!graph.isComplete()) {
      const ready = graph.getReadyTasks();

      for (const task of ready) {
        if (running.size >= maxConcurrency) break;

        graph.markRunning(task.id);
        const promise = this.runTask(task, graph).then(() => {
          running.delete(promise);
        });
        running.add(promise);
      }

      if (running.size === 0 && !graph.isComplete()) {
        this.logger.error('Task graph deadlock detected');
        break;
      }

      if (running.size > 0) await Promise.race(running);
    }
  }

  private async runTask(task: TaskNode, graph: TaskGraph): Promise<void> {
    const config: AgentConfig = {
      id: task.id,
      name: task.title,
      role: task.agentRole as AgentConfig['role'],
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      maxIterations: 8,
    };

    try {
      const result = await this.agentRunner.run({ config, userMessage: task.description });
      graph.markCompleted(task.id, result.output);
    } catch (e: unknown) {
      graph.markFailed(task.id, String(e));
    }
  }

  private async synthesizeResults(objective: string, results: Record<string, unknown>, provider: 'anthropic' | 'openai' | 'gemini'): Promise<string> {
    const response = await this.llm.chat(provider, [{
      role: 'user',
      content: `Original objective: ${objective}\n\nTask results:\n${JSON.stringify(results, null, 2)}\n\nProvide a concise synthesis of what was accomplished.`,
    }]);
    return response.content;
  }
}
```

**Step 3: Create `src/core/orchestrator/orchestrator.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { AgentModule } from '../agent/agent.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [AgentModule, LLMModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
```

**Step 4: Write test `src/core/orchestrator/task-graph.spec.ts`**
```typescript
import { TaskGraph } from './task-graph';

describe('TaskGraph', () => {
  let graph: TaskGraph;

  beforeEach(() => {
    graph = new TaskGraph();
    graph.addTask({ id: 'A', title: 'Task A', description: 'Do A', dependencies: [], agentRole: 'WORKER', status: 'PENDING' });
    graph.addTask({ id: 'B', title: 'Task B', description: 'Do B', dependencies: ['A'], agentRole: 'WORKER', status: 'PENDING' });
    graph.addTask({ id: 'C', title: 'Task C', description: 'Do C', dependencies: ['A'], agentRole: 'ANALYST', status: 'PENDING' });
    graph.addTask({ id: 'D', title: 'Task D', description: 'Do D', dependencies: ['B', 'C'], agentRole: 'WORKER', status: 'PENDING' });
  });

  it('should return only tasks with satisfied dependencies', () => {
    const ready = graph.getReadyTasks();
    expect(ready.map(t => t.id)).toEqual(['A']);
  });

  it('should unlock dependent tasks after completion', () => {
    graph.markCompleted('A', 'result A');
    const ready = graph.getReadyTasks();
    expect(ready.map(t => t.id).sort()).toEqual(['B', 'C']);
  });

  it('should mark complete only when all tasks done', () => {
    expect(graph.isComplete()).toBe(false);
    graph.markCompleted('A', '');
    graph.markCompleted('B', '');
    graph.markCompleted('C', '');
    graph.markCompleted('D', '');
    expect(graph.isComplete()).toBe(true);
  });

  it('should detect failures', () => {
    graph.markFailed('A', 'error');
    expect(graph.hasFailures()).toBe(true);
  });
});
```

**Step 5: Run tests**
```bash
npx jest src/core/orchestrator/task-graph.spec.ts --no-coverage
```
Expected: PASS

**Step 6: Commit**
```bash
git add src/core/orchestrator/
git commit -m "feat: task DAG scheduler + orchestrator with parallel execution and coordinator agent"
```

---

## Task 8: REST API Endpoints (`api/`)

**Files:**
- Create: `src/api/agents/agents.controller.ts`
- Create: `src/api/agents/agents.service.ts`
- Create: `src/api/agents/agents.module.ts`
- Create: `src/api/agents/dto/run-agent.dto.ts`
- Create: `src/api/tasks/tasks.controller.ts`
- Create: `src/api/tasks/tasks.service.ts`
- Create: `src/api/tasks/tasks.module.ts`
- Create: `src/api/tasks/dto/create-task.dto.ts`
- Create: `src/api/memory/memory.controller.ts`
- Create: `src/api/memory/memory.module.ts`
- Create: `src/api/tools/tools.controller.ts`
- Create: `src/api/tools/tools.module.ts`

**Step 1: Install validation libs**
```bash
npm install class-validator class-transformer @nestjs/event-emitter
```

**Step 2: Create `src/api/agents/dto/run-agent.dto.ts`**
```typescript
import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunAgentDto {
  @ApiProperty({ description: 'Task or question for the agent' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: ['COORDINATOR', 'WORKER', 'ANALYST', 'DEBUGGER'], default: 'WORKER' })
  @IsEnum(['COORDINATOR', 'WORKER', 'ANALYST', 'DEBUGGER'])
  @IsOptional()
  role?: string = 'WORKER';

  @ApiPropertyOptional({ enum: ['anthropic', 'openai', 'gemini'], default: 'anthropic' })
  @IsEnum(['anthropic', 'openai', 'gemini'])
  @IsOptional()
  provider?: string = 'anthropic';

  @ApiPropertyOptional({ default: 10 })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxIterations?: number = 10;

  @ApiPropertyOptional({ description: 'Additional context for the agent' })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({ description: 'Custom system prompt' })
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tool permissions to grant' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
```

**Step 3: Create `src/api/agents/agents.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { AgentRunnerService } from '../../core/agent/agent-runner.service';
import { OrchestratorService } from '../../core/orchestrator/orchestrator.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { RunAgentResult } from '../../core/agent/agent.types';

@Injectable()
export class AgentsService {
  constructor(
    private agentRunner: AgentRunnerService,
    private orchestrator: OrchestratorService,
  ) {}

  async run(dto: RunAgentDto): Promise<RunAgentResult> {
    return this.agentRunner.run({
      config: {
        id: crypto.randomUUID(),
        name: `${dto.role ?? 'WORKER'}-agent`,
        role: (dto.role ?? 'WORKER') as RunAgentResult['status'] extends string ? any : any,
        model: dto.provider === 'openai' ? 'gpt-4o' : dto.provider === 'gemini' ? 'gemini-2.0-flash' : 'claude-opus-4-6',
        provider: (dto.provider ?? 'anthropic') as 'anthropic' | 'openai' | 'gemini',
        maxIterations: dto.maxIterations,
        systemPrompt: dto.systemPrompt,
        permissions: dto.permissions as any,
      },
      userMessage: dto.message,
      context: dto.context,
    });
  }

  async orchestrate(dto: RunAgentDto) {
    return this.orchestrator.run({
      objective: dto.message,
      context: dto.context,
      coordinatorProvider: (dto.provider ?? 'anthropic') as any,
    });
  }
}
```

**Step 4: Create `src/api/agents/agents.controller.ts`**
```typescript
import { Body, Controller, Get, Param, Post, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable, from, map } from 'rxjs';
import { AgentsService } from './agents.service';
import { LLMService } from '../../core/llm/llm.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private agentsService: AgentsService,
    private llm: LLMService,
    private prisma: PrismaService,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Run a single agent on a task' })
  async run(@Body() dto: RunAgentDto) {
    return this.agentsService.run(dto);
  }

  @Post('orchestrate')
  @ApiOperation({ summary: 'Orchestrate a complex objective with multiple agents (task DAG)' })
  async orchestrate(@Body() dto: RunAgentDto) {
    return this.agentsService.orchestrate(dto);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream agent output via Server-Sent Events' })
  stream(@Body() dto: RunAgentDto): Observable<MessageEvent> {
    const stream = this.llm.stream(
      (dto.provider ?? 'anthropic') as any,
      [{ role: 'user', content: dto.message }],
      undefined,
      dto.systemPrompt,
    );

    return from(
      (async function* () {
        for await (const event of stream) {
          yield event;
        }
      })(),
    ).pipe(
      map(event => ({ data: JSON.stringify(event) }) as MessageEvent),
    );
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get agent execution status and steps' })
  async getStatus(@Param('id') id: string) {
    const steps = await this.prisma.agentStep.findMany({
      where: { agentId: id },
      orderBy: { createdAt: 'asc' },
    });
    const usageLogs = await this.prisma.aiUsageLog.findMany({ where: { agentId: id } });
    const totalTokens = usageLogs.reduce((sum, l) => sum + l.inputTokens + l.outputTokens, 0);
    const totalCost = usageLogs.reduce((sum, l) => sum + l.costUsd, 0);
    return { agentId: id, steps, totalTokens, totalCostUsd: totalCost };
  }
}
```

**Step 5: Create `src/api/agents/agents.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentModule } from '../../core/agent/agent.module';
import { OrchestratorModule } from '../../core/orchestrator/orchestrator.module';
import { LLMModule } from '../../core/llm/llm.module';

@Module({
  imports: [AgentModule, OrchestratorModule, LLMModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsApiModule {}
```

**Step 6: Create `src/api/tasks/dto/create-task.dto.ts`**
```typescript
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;
}
```

**Step 7: Create `src/api/tasks/tasks.service.ts`**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        dependencies: dto.dependencies ?? [],
        agentId: dto.agentId,
      },
    });
  }

  async findAll() {
    return this.prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async getStatus(id: string) {
    const task = await this.findOne(id);
    const childTasks = await this.prisma.task.findMany({ where: { parentTaskId: id } });
    return { ...task, childTasks };
  }
}
```

**Step 8: Create `src/api/tasks/tasks.controller.ts`**
```typescript
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@Body() dto: CreateTaskDto) { return this.tasksService.create(dto); }

  @Get()
  @ApiOperation({ summary: 'List all tasks' })
  findAll() { return this.tasksService.findAll(); }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get task status with child tasks' })
  getStatus(@Param('id') id: string) { return this.tasksService.getStatus(id); }
}
```

**Step 9: Create `src/api/tasks/tasks.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({ controllers: [TasksController], providers: [TasksService] })
export class TasksApiModule {}
```

**Step 10: Create `src/api/memory/memory.controller.ts`**
```typescript
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemoryService } from '../../core/memory/memory.service';

class QueryMemoryDto {
  @ApiProperty() @IsString() query: string;
  @ApiProperty() @IsString() agentId: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() topK?: number;
}

class StoreMemoryDto {
  @ApiProperty() @IsString() agentId: string;
  @ApiProperty() @IsString() content: string;
}

@ApiTags('Memory')
@Controller('memory')
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  @Post('store')
  @ApiOperation({ summary: 'Store a memory entry with vector embedding' })
  store(@Body() dto: StoreMemoryDto) {
    return this.memoryService.store(dto.agentId, dto.content);
  }

  @Post('query')
  @ApiOperation({ summary: 'Semantic search across agent memories' })
  query(@Body() dto: QueryMemoryDto) {
    return this.memoryService.search(dto.agentId, dto.query, dto.topK ?? 5);
  }

  @Get(':agentId/recent')
  @ApiOperation({ summary: 'Get recent memories for an agent' })
  recent(@Param('agentId') agentId: string, @Query('limit') limit?: string) {
    return this.memoryService.getRecent(agentId, limit ? parseInt(limit) : 20);
  }
}
```

**Step 11: Create `src/api/memory/memory.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryModule } from '../../core/memory/memory.module';

@Module({ imports: [MemoryModule], controllers: [MemoryController] })
export class MemoryApiModule {}
```

**Step 12: Create `src/api/tools/tools.controller.ts`**
```typescript
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToolRegistry } from '../../core/tools/tool.registry';
import { ToolContext } from '../../core/tools/tool.types';

class ExecuteToolDto {
  @ApiProperty() @IsString() toolName: string;
  @ApiProperty() @IsObject() input: Record<string, unknown>;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() permissions?: string[];
}

@ApiTags('Tools')
@Controller('tools')
export class ToolsController {
  constructor(private toolRegistry: ToolRegistry) {}

  @Get()
  @ApiOperation({ summary: 'List all available tools' })
  list() {
    return this.toolRegistry.getAll().map(t => t.toSchema());
  }

  @Post('execute')
  @ApiOperation({ summary: 'Execute a tool directly' })
  async execute(@Body() dto: ExecuteToolDto) {
    const ctx: ToolContext = {
      agentId: 'api-direct',
      workingDir: process.cwd(),
      permissions: (dto.permissions ?? ['file_read', 'http_request']) as any,
    };
    return this.toolRegistry.execute(dto.toolName, dto.input, ctx);
  }
}
```

**Step 13: Create `src/api/tools/tools.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsModule } from '../../core/tools/tools.module';

@Module({ imports: [ToolsModule], controllers: [ToolsController] })
export class ToolsApiModule {}
```

**Step 14: Wire everything in `src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AgentsApiModule } from './api/agents/agents.module';
import { TasksApiModule } from './api/tasks/tasks.module';
import { MemoryApiModule } from './api/memory/memory.module';
import { ToolsApiModule } from './api/tools/tools.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AgentsApiModule,
    TasksApiModule,
    MemoryApiModule,
    ToolsApiModule,
  ],
})
export class AppModule {}
```

**Step 15: Commit**
```bash
git add src/api/ src/app.module.ts
git commit -m "feat: REST API endpoints for agents, tasks, memory, tools with Swagger docs + SSE streaming"
```

---

## Task 9: Observability — Logging + Execution Traces

**Files:**
- Create: `src/services/logger/logger.service.ts`
- Create: `src/services/logger/logger.module.ts`
- Create: `src/services/trace/trace.service.ts`
- Create: `src/services/trace/trace.module.ts`

**Step 1: Install Winston**
```bash
npm install winston nest-winston
```

**Step 2: Create `src/services/logger/logger.service.ts`**
```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.DEBUG_MODE === 'true' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              const ctx = context ? `[${context}]` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
            }),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string) { this.logger.info(message, { context }); }
  error(message: string, trace?: string, context?: string) { this.logger.error(message, { trace, context }); }
  warn(message: string, context?: string) { this.logger.warn(message, { context }); }
  debug(message: string, context?: string) { this.logger.debug(message, { context }); }
  verbose(message: string, context?: string) { this.logger.verbose(message, { context }); }

  structured(level: string, message: string, meta: Record<string, unknown>) {
    this.logger.log(level, message, meta);
  }
}
```

**Step 3: Create `src/services/logger/logger.module.ts`**
```typescript
import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

@Global()
@Module({ providers: [AppLoggerService], exports: [AppLoggerService] })
export class LoggerModule {}
```

**Step 4: Create `src/services/trace/trace.service.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TraceEvent {
  agentId: string;
  taskId?: string;
  event: string;
  data: Record<string, unknown>;
}

@Injectable()
export class TraceService {
  private traces = new Map<string, TraceEvent[]>();

  record(event: TraceEvent): void {
    const key = event.agentId;
    if (!this.traces.has(key)) this.traces.set(key, []);
    this.traces.get(key)!.push({ ...event, data: { ...event.data, timestamp: new Date().toISOString() } });
  }

  getTrace(agentId: string): TraceEvent[] {
    return this.traces.get(agentId) ?? [];
  }

  clearTrace(agentId: string): void {
    this.traces.delete(agentId);
  }
}
```

**Step 5: Create `src/services/trace/trace.module.ts`**
```typescript
import { Global, Module } from '@nestjs/common';
import { TraceService } from './trace.service';

@Global()
@Module({ providers: [TraceService], exports: [TraceService] })
export class TraceModule {}
```

**Step 6: Add trace endpoint to agents controller**
```typescript
// Add to agents.controller.ts
@Get(':id/trace')
@ApiOperation({ summary: 'Get execution trace for an agent' })
getTrace(@Param('id') id: string) {
  return this.traceService.getTrace(id);
}
```

**Step 7: Update `app.module.ts` with logger + trace modules**
```typescript
import { LoggerModule } from './services/logger/logger.module';
import { TraceModule } from './services/trace/trace.module';

// Add to imports array:
LoggerModule,
TraceModule,
```

**Step 8: Commit**
```bash
git add src/services/
git commit -m "feat: structured logging (Winston) + execution trace service"
```

---

## Task 10: AI Governance Service

**Files:**
- Create: `src/services/ai-governance/ai-governance.service.ts`
- Create: `src/services/ai-governance/ai-governance.module.ts`

**Step 1: Create `src/services/ai-governance/ai-governance.service.ts`**
```typescript
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  remainingBudget?: number;
}

@Injectable()
export class AiGovernanceService {
  private readonly logger = new Logger(AiGovernanceService.name);

  constructor(private prisma: PrismaService) {}

  async checkBudget(estimatedCostUsd: number = 0): Promise<BudgetCheckResult> {
    let budget = await this.prisma.aiBudget.findFirst({ where: { name: 'default' } });

    if (!budget) {
      // Create default budget
      budget = await this.prisma.aiBudget.create({
        data: {
          name: 'default',
          monthlyLimitUsd: parseFloat(process.env.AI_BUDGET_DEFAULT_MONTHLY_USD ?? '50'),
          alertThreshold: parseFloat(process.env.AI_BUDGET_ALERT_THRESHOLD ?? '0.8'),
          killSwitch: false,
          currentMonthSpend: 0,
          currentDaySpend: 0,
          resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      });
    }

    if (budget.killSwitch) {
      return { allowed: false, reason: 'AI kill switch is active' };
    }

    const projectedSpend = budget.currentMonthSpend + estimatedCostUsd;
    if (projectedSpend > budget.monthlyLimitUsd) {
      return {
        allowed: false,
        reason: `Monthly budget exceeded: $${projectedSpend.toFixed(4)} > $${budget.monthlyLimitUsd}`,
      };
    }

    const alertLevel = budget.monthlyLimitUsd * budget.alertThreshold;
    if (budget.currentMonthSpend > alertLevel) {
      this.logger.warn(`AI budget alert: ${((budget.currentMonthSpend / budget.monthlyLimitUsd) * 100).toFixed(1)}% used`);
    }

    return {
      allowed: true,
      remainingBudget: budget.monthlyLimitUsd - projectedSpend,
    };
  }

  async recordSpend(costUsd: number): Promise<void> {
    await this.prisma.aiBudget.updateMany({
      where: { name: 'default' },
      data: {
        currentMonthSpend: { increment: costUsd },
        currentDaySpend: { increment: costUsd },
      },
    });
  }

  async setKillSwitch(active: boolean): Promise<void> {
    await this.prisma.aiBudget.updateMany({
      where: { name: 'default' },
      data: { killSwitch: active },
    });
    this.logger.warn(`AI kill switch ${active ? 'ACTIVATED' : 'deactivated'}`);
  }

  async getStatus() {
    return this.prisma.aiBudget.findFirst({ where: { name: 'default' } });
  }
}
```

**Step 2: Create `src/services/ai-governance/ai-governance.module.ts`**
```typescript
import { Global, Module } from '@nestjs/common';
import { AiGovernanceService } from './ai-governance.service';

@Global()
@Module({ providers: [AiGovernanceService], exports: [AiGovernanceService] })
export class AiGovernanceModule {}
```

**Step 3: Add governance endpoint**
```typescript
// Create src/api/admin/admin.controller.ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiGovernanceService } from '../../services/ai-governance/ai-governance.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private governance: AiGovernanceService) {}

  @Get('budget')
  @ApiOperation({ summary: 'Get AI budget status' })
  getBudget() { return this.governance.getStatus(); }

  @Post('kill-switch')
  @ApiOperation({ summary: 'Toggle AI kill switch' })
  toggleKillSwitch(@Body() body: { active: boolean }) {
    return this.governance.setKillSwitch(body.active);
  }
}
```

**Step 4: Add to app.module.ts**
```typescript
import { AiGovernanceModule } from './services/ai-governance/ai-governance.module';
// Add AiGovernanceModule to imports
```

**Step 5: Commit**
```bash
git add src/services/ai-governance/ src/api/admin/
git commit -m "feat: AI governance service with budget limits, kill switch, spend tracking"
```

---

## Task 11: Final Integration + Health Check

**Files:**
- Create: `src/api/health/health.controller.ts`
- Modify: `src/app.module.ts` (final assembly)

**Step 1: Install health check**
```bash
npm install @nestjs/terminus
```

**Step 2: Create `src/api/health/health.controller.ts`**
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
```

**Step 3: Final `src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './services/logger/logger.module';
import { TraceModule } from './services/trace/trace.module';
import { AiGovernanceModule } from './services/ai-governance/ai-governance.module';
import { AgentsApiModule } from './api/agents/agents.module';
import { TasksApiModule } from './api/tasks/tasks.module';
import { MemoryApiModule } from './api/memory/memory.module';
import { ToolsApiModule } from './api/tools/tools.module';
import { HealthController } from './api/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TerminusModule,
    PrismaModule,
    LoggerModule,
    TraceModule,
    AiGovernanceModule,
    AgentsApiModule,
    TasksApiModule,
    MemoryApiModule,
    ToolsApiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

**Step 4: Build check**
```bash
npx tsc --noEmit
```
Expected: No errors

**Step 5: Run all tests**
```bash
npx jest --no-coverage
```
Expected: All PASS

**Step 6: Start the server**
```bash
npx ts-node -r tsconfig-paths/register src/main.ts
```
Expected: `SkyApp running on: http://0.0.0.0:3000`
Check: `http://localhost:3000/api/docs` → Swagger UI visible

**Step 7: Final commit**
```bash
git add .
git commit -m "feat: final integration — health check, full app wiring, production-ready skyapp multi-agent API"
```

---

## Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Project scaffold (NestJS + Fastify + Swagger) | — |
| 2 | Prisma schema (Agent, Task, Memory, Budget, Logs) | — |
| 3 | LLM adapters (Claude, OpenAI, Gemini) | ✓ |
| 4 | Tool system (Registry, Zod validation, 4 built-ins) | ✓ |
| 5 | Memory system (pgvector store + semantic search) | ✓ |
| 6 | Agent runtime (loop, tools, memory, usage tracking) | ✓ |
| 7 | Orchestrator + Task DAG (parallel execution) | ✓ |
| 8 | REST API (agents, tasks, memory, tools + SSE) | — |
| 9 | Observability (Winston logging + trace service) | — |
| 10 | AI Governance (budget, kill switch, spend tracking) | — |
| 11 | Health check + final integration | ✓ |

**API Endpoints:**
- `POST /agents/run` — single agent task
- `POST /agents/orchestrate` — multi-agent DAG
- `SSE /agents/stream` — streaming output
- `GET /agents/:id/status` — execution status + tokens
- `GET /agents/:id/trace` — execution trace
- `POST /tasks` — create task
- `GET /tasks/:id/status` — task + children
- `POST /memory/store` — store memory
- `POST /memory/query` — semantic search
- `GET /memory/:agentId/recent` — recent memories
- `GET /tools` — list tools
- `POST /tools/execute` — direct tool execution
- `GET /admin/budget` — AI budget status
- `POST /admin/kill-switch` — emergency stop
- `GET /health` — health check
