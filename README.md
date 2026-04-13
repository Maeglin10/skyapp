# AeviaApp — Multi-Agent AI Orchestration API

Production-grade AI orchestration API. Run parallel agent DAGs, persist semantic memory, control costs.

## Features

- Multi-agent DAG scheduling with parallel execution
- pgvector semantic memory (store + query past context)
- Multi-provider: Claude, GPT-4o, Gemini Flash
- Budget limits, kill switch, spend tracking
- REST + SSE streaming API
- Full Swagger docs at /api/docs

## Stack

NestJS · Fastify · Prisma · PostgreSQL · pgvector · Anthropic SDK · TypeScript

## Live

[aevia-app.vercel.app](https://aevia-app.vercel.app) · API: https://aevia-app-api.onrender.com
