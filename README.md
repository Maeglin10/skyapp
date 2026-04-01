# SkyApp — Multi-Agent AI Orchestration API

Production-grade multi-agent AI orchestration system built with NestJS, TypeScript, and three LLM providers.

## Architecture

```
Input → Coordinator Agent → Task DAG → Worker Agents (parallel) → Tool Execution → Memory → Output
```

### Core Modules

| Module | Description |
|--------|-------------|
| `core/llm` | Adapter pattern for Claude (Haiku), OpenAI (gpt-4o-mini), Gemini (2.0-flash) |
| `core/agent` | Agent runtime loop with tool calls, memory, usage tracking |
| `core/orchestrator` | Task DAG scheduler with parallel execution |
| `core/tools` | Zod-validated tool system with permission layer |
| `core/memory` | Short-term context + long-term pgvector semantic search |
| `services/ai-governance` | Budget limits, kill switch, spend tracking |
| `services/logger` | Winston structured logging |
| `services/trace` | Per-agent execution traces |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/run` | Run single agent on a task |
| POST | `/agents/orchestrate` | Multi-agent DAG for complex objectives |
| SSE | `/agents/stream` | Stream agent output |
| GET | `/agents/:id/status` | Execution status + token usage |
| GET | `/agents/:id/trace` | Execution trace |
| POST | `/tasks` | Create a task |
| GET | `/tasks/:id/status` | Task + child tasks |
| POST | `/memory/store` | Store memory with vector embedding |
| POST | `/memory/query` | Semantic search (pgvector) |
| GET | `/memory/:agentId/recent` | Recent memories |
| GET | `/tools` | List available tools |
| POST | `/tools/execute` | Execute a tool directly |
| GET | `/admin/budget` | AI budget status |
| POST | `/admin/kill-switch` | Emergency AI stop |
| GET | `/health` | Health check |

## Tech Stack

- **Runtime**: NestJS 11, TypeScript 5.7, Fastify
- **Database**: PostgreSQL + pgvector (via Prisma)
- **LLM Providers**: Anthropic Claude Haiku, OpenAI gpt-4o-mini, Google Gemini 2.0 Flash
- **Tools**: file_read, file_write, shell_exec (whitelisted), http_request
- **Observability**: Winston structured logs, execution traces, Swagger UI at `/api/docs`

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your API keys and DATABASE_URL

# Generate Prisma client
npx prisma generate

# Run migrations (requires PostgreSQL with pgvector)
npx prisma migrate dev

# Start development server
npx ts-node -r tsconfig-paths/register src/main.ts
```

## Agent Models

- **Coordinator**: `claude-haiku-4-5-20251001` (task decomposition)
- **Workers**: `claude-haiku-4-5-20251001` (execution, cost-optimized)
- **Streaming**: configurable per request

## Example Request

```bash
# Run a single agent
curl -X POST http://localhost:3000/agents/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze the performance of a NestJS API", "role": "ANALYST", "provider": "anthropic"}'

# Orchestrate a complex task
curl -X POST http://localhost:3000/agents/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"message": "Build a REST API for a todo app: design schema, implement endpoints, write tests"}'
```

## Inspired by

- [open-multi-agent](https://github.com/JackChen-me/open-multi-agent) — Task DAG + adapter patterns
- SkyBot Inbox OpenClaw — Agent deployment + AI governance patterns
