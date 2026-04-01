# Next Session — Remaining Tasks

## Status as of 2026-04-01

### Completed
- [x] NestJS scaffold + Fastify + Swagger
- [x] Prisma schema (Agent, Task, Memory, Budget, Logs) + pgvector
- [x] LLM adapters (Claude Haiku, OpenAI gpt-4o-mini, Gemini 2.0-flash)
- [x] Tool system (registry, Zod validation, 4 built-in tools)
- [x] Memory system (pgvector store + semantic search)
- [x] Agent runtime loop (tool calls, memory, usage tracking)
- [x] Task DAG orchestrator (parallel execution, Semaphore)
- [x] REST API (all endpoints)
- [x] AI Governance (budget, kill switch)
- [x] Winston logger + trace service
- [x] Health check endpoint
- [x] README

### Remaining / To Improve

1. **TypeScript compilation check** — run `npx tsc --noEmit` and fix any type errors
2. **Test suite** — run `npx jest --no-coverage` and fix failing tests
3. **Rate limiting** — add `@nestjs/throttler` with Redis adapter
4. **JWT Auth** — add `@nestjs/passport` + `passport-jwt` guard
5. **Prisma migration** — when PostgreSQL + pgvector available, run `npx prisma migrate dev`
6. **Docker Compose** — add `docker-compose.yml` with postgres + pgvector
7. **CI/CD** — add `.github/workflows/ci.yml`
8. **Integration tests** — add e2e tests with supertest
9. **Agent retry logic** — exponential backoff on LLM failures
10. **Plugin system** — dynamic tool registration via config file

## To Resume

Open `/Users/milliandvalentin/skyapp` and run:
```bash
npx tsc --noEmit 2>&1 | head -50
npx jest --no-coverage 2>&1 | tail -30
```
Then fix errors top-down.
