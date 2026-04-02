-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE "AgentRole" AS ENUM ('COORDINATOR', 'WORKER', 'ANALYST', 'DEBUGGER');
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "LLMProvider" AS ENUM ('ANTHROPIC', 'OPENAI', 'GEMINI');

-- Agent table
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AgentRole" NOT NULL,
    "model" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "systemPrompt" TEXT,
    "maxIterations" INTEGER NOT NULL DEFAULT 10,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- Task table
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "agentId" TEXT,
    "parentTaskId" TEXT,
    "dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- AgentStep table
CREATE TABLE "AgentStep" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "iteration" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

-- ToolExecutionLog table
CREATE TABLE "ToolExecutionLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ToolExecutionLog_pkey" PRIMARY KEY ("id")
);

-- MemoryEntry table (with pgvector)
CREATE TABLE "MemoryEntry" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryEntry_pkey" PRIMARY KEY ("id")
);

-- AiUsageLog table
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- AiBudget table
CREATE TABLE "AiBudget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyLimitUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "dailyLimitUsd" DOUBLE PRECISION,
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "killSwitch" BOOLEAN NOT NULL DEFAULT false,
    "currentMonthSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentDaySpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "AiBudget" ADD CONSTRAINT "AiBudget_name_key" UNIQUE ("name");

-- Foreign keys
ALTER TABLE "Task" ADD CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgentStep" ADD CONSTRAINT "AgentStep_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemoryEntry" ADD CONSTRAINT "MemoryEntry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "MemoryEntry_agentId_idx" ON "MemoryEntry"("agentId");
CREATE INDEX "AiUsageLog_agentId_idx" ON "AiUsageLog"("agentId");
CREATE INDEX "AgentStep_agentId_idx" ON "AgentStep"("agentId");
