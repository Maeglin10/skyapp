# Skyapp — État du projet & feuille de route (2026-04-06)

## État actuel : ce qui est fait

### Infrastructure
- NestJS 11 + Fastify + Swagger — opérationnel
- PostgreSQL + pgvector (Docker Compose) — schéma Prisma migré
- Redis cache LLM (SHA256, TTL 1h, graceful fallback sans Redis)
- JWT auth (`@nestjs/passport`) + rate limiting (ThrottlerModule)
- GitHub Actions CI (`.github/workflows/ci.yml`)
- Logger Winston + TraceService (trace par agentId)

### Providers LLM (`src/core/llm/llm.service.ts`)
| Provider | Statut | Notes |
|---|---|---|
| `anthropic` | Opérationnel | Haiku par défaut, streaming SSE réel |
| `openai` | Opérationnel | gpt-4o-mini par défaut |
| `gemini` | Opérationnel | gemini-2.0-flash par défaut |
| `skymodel` | Intégré, non entraîné | Attend `make serve-mlx` ou `make serve-gguf` |

### Runtime agent (`src/core/agent/agent-runner.service.ts`)
- Boucle ReAct (reason → tool → observe) jusqu'à `maxIterations`
- Semantic RAG : mémoire récente + similarité pgvector
- Few-shot prompts par rôle (COORDINATOR / WORKER / ANALYST / DEBUGGER)
- Self-reflection post-tâche (optionnel via `enableReflection`)
- Retry exponentiel + budget AI (AiGovernanceService)
- Logging Prisma : AgentStep, ToolExecutionLog, AiUsageLog

### Orchestrateur (`src/core/orchestrator/orchestrator.service.ts`)
- Décomposition de tâches via LLM → TaskGraph DAG
- Exécution parallèle (maxConcurrency = 3 par défaut)
- Synthèse finale

### API REST (tous préfixés `/`)
| Endpoint | Méthode | Description |
|---|---|---|
| `POST /agents/run` | POST | Lance un agent (provider, role, message, tools…) |
| `POST /agents/orchestrate` | POST | Orchestration multi-agents DAG |
| `GET /agents/:id/status` | GET | Steps + tokens + coût |
| `GET /agents/:id/trace` | GET | Trace brute |
| `SSE /agents/stream` | SSE | Streaming token par token |
| `POST /tasks` | POST | Crée une tâche |
| `GET /tasks/:id` | GET | Statut tâche + sous-tâches |
| `POST /memory/ingest` | POST | Ingest document en mémoire |
| `GET /tools` | GET | Liste des outils disponibles |
| `GET /admin/budget` | GET | Budget AI courant |
| `GET /health` | GET | Healthcheck |
| `GET /model-lab/status` | GET | Statut serveur local skymodel |

### SkyModel Lab (`src/core/model-lab/` — gitignored)
- `train_scratch.py` — Transformer from scratch + BPE tokenizer complet
- `prepare_data.py` — TinyStories → tokens binaires
- `finetune_mlx.py` — LoRA Mac via MLX
- `finetune_cloud.py` — QLoRA NVIDIA (RunPod/Colab)
- `build_instruct_dataset.py` — Alpaca + UltraChat → JSONL
- `eval.py` — perplexité + génération sur checkpoint
- `local_server.py` — serveur API OpenAI-compatible (port 11435)
- `Makefile` — 14 commandes (`make data`, `make train`, `make serve-mlx`, etc.)

---

## Problèmes connus à corriger

### 1. CRITIQUE — Duplication du module Auth
Il existe **deux** implémentations d'auth :
- `src/auth/` (ancienne) — `AuthController`, `AuthService`, `AuthModule`
- `src/services/auth/` (nouvelle, branche claude) — `JwtAuthGuard`, `JwtStrategy`, `AuthModule`

`app.module.ts` importe `src/services/auth/auth.module.ts`.
**Action :** Vérifier si `src/auth/` est encore importé quelque part et le supprimer proprement. Migrer `AuthController` si nécessaire vers `src/services/auth/`.

### 2. CRITIQUE — `LLMProvider` enum Prisma sans `SKYMODEL`
Le schema.prisma a l'enum `LLMProvider = ANTHROPIC | OPENAI | GEMINI` (SKYMODEL manque encore).
`agent-runner.service.ts` ligne ~109 fait un fallback `skymodel → ANTHROPIC`.
Le fichier `src/prisma/migrations/add_skymodel_provider.sql` existe mais n'a pas été appliqué via `prisma migrate`.

**Action :**
```bash
# Option 1 — migration propre
npx prisma migrate dev --name add_skymodel_provider

# Option 2 — appliquer le SQL manuellement
psql $DATABASE_URL -f src/prisma/migrations/add_skymodel_provider.sql
npx prisma generate
```
Puis mettre à jour `schema.prisma` et supprimer le fallback dans `agent-runner.service.ts`.

### 3. IMPORTANT — Adaptateurs LLM orphelins
Les fichiers `src/core/llm/adapters/` (claude.adapter.ts, openai.adapter.ts, gemini.adapter.ts, skymodel.adapter.ts) existent mais ne sont plus importés — la branche claude a inliné la logique dans `llm.service.ts`.
**Action :** Supprimer le dossier `src/core/llm/adapters/` ou remettre le pattern adaptateur.
Recommandation : supprimer (la version inlinée est plus maintenable pour l'instant).

### 4. IMPORTANT — Plugin loader dupliqué
- `src/core/tools/plugin-loader.service.ts` (ancienne version)
- `src/core/plugins/plugin-loader.service.ts` (nouvelle version, branche claude)
**Action :** Vérifier les imports et supprimer l'ancienne.

### 5. MOYEN — `agents/stream` SSE ne supporte pas POST
`@Sse` + `@Body` ne fonctionne pas avec NestJS/Fastify (SSE est GET par convention).
Le DTO devrait passer en query params ou le endpoint devrait être POST + chunked response.
**Action :** Convertir en GET avec query params ou utiliser WebSocket.

### 6. MOYEN — `selfReflect` dans agent-runner cast hardcodé
```ts
provider as 'anthropic' | 'openai' | 'gemini'  // ligne ~113
```
Le cast exclut `skymodel`. Remplacer par `LLMProviderKey`.

### 7. MOYEN — Variables d'env manquantes dans `.env.example`
Manquent :
```env
SKYMODEL_URL=http://localhost:11435/v1
SKYMODEL_NAME=skymodel
JWT_EXPIRES_IN=86400
```

---

## Prochaines features à implémenter

### Priorité 1 — Stabilisation (faire avant tout)
1. Corriger les 7 problèmes listés ci-dessus
2. Faire passer les tests : `npx jest`
3. Vérifier que `docker-compose up` + `npm run start:dev` démarre sans erreur

### Priorité 2 — Auth complète
- `POST /auth/login` — retourne un JWT (il existe un `AuthController` dans `src/auth/`)
- `POST /auth/token/dev` — token de dev (déjà dans AuthService)
- Protéger les routes sensibles avec `@UseGuards(JwtAuthGuard)`
- Documenter dans Swagger avec `@ApiBearerAuth()`

### Priorité 3 — Websocket / streaming amélioré
- Remplacer SSE bugué par WebSocket gateway NestJS
- `ws://localhost:3000/agents/stream` avec payload JSON
- Émettre : `{ type: 'token', data: '...' }` | `{ type: 'done', agentId: '...' }` | `{ type: 'error', message: '...' }`

### Priorité 4 — Dashboard minimal
- `GET /admin/stats` — agents créés, tokens consommés, coût total, top providers
- `GET /admin/agents` — liste paginée des agents avec statut
- Prépare un futur frontend

### Priorité 5 — SkyModel Lab (Track B — from scratch)
Suivre la progression cours Stanford CS224N :
1. **Étape suivante** : `make data` — télécharger TinyStories et tokenizer
2. **Puis** : `make train` — premier run, vérifier que la loss descend
3. Implémenter `monitor.py` (non terminé — agent avait atteint sa limite)
4. Premiers tests `make eval`

### Priorité 6 — SkyModel Lab (Track A — fine-tune)
1. `make data-instruct` — dataset Alpaca + UltraChat
2. `make finetune-mac` sur Phi-4-mini (MLX)
3. `make serve-mlx` + tester `POST /agents/run` avec `"provider": "skymodel"`

---

## Commandes utiles pour reprendre

```bash
# Setup complet depuis zéro
docker-compose up -d
cp .env.example .env  # puis renseigner les vraies clés
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Tests
npx jest
npx jest --coverage

# SkyModel lab (gitignored)
cd src/core/model-lab
make install       # Mac
make data          # TinyStories
make train         # Track B
make serve-mlx     # Track A (après fine-tune)

# Vérifier skymodel dans l'API
curl -X GET http://localhost:3000/model-lab/status
```

---

## Architecture globale (résumé)

```
skyapp/
├── src/
│   ├── api/              # Controllers REST (agents, tasks, memory, tools, admin, health)
│   ├── core/
│   │   ├── agent/        # AgentRunnerService — boucle ReAct + RAG + reflection
│   │   ├── llm/          # LLMService — Anthropic/OpenAI/Gemini/SkyModel + cache Redis
│   │   ├── memory/       # MemoryService — pgvector embeddings
│   │   ├── orchestrator/ # OrchestratorService — DAG multi-agents
│   │   ├── tools/        # ToolRegistry + outils built-in
│   │   ├── plugins/      # PluginLoaderService — chargement dynamique
│   │   └── model-lab/    # [gitignored] Lab entraînement LLM maison
│   ├── services/
│   │   ├── auth/         # JWT strategy + guard
│   │   ├── cache/        # Redis LLM cache
│   │   ├── ai-governance/ # Budget + kill switch
│   │   ├── logger/       # Winston
│   │   └── trace/        # Trace par agentId
│   └── prisma/           # PrismaService
├── prisma/
│   ├── schema.prisma     # Agent, Task, Memory, UsageLog, Budget
│   └── migrations/       # Migration initiale + add_skymodel_provider.sql
├── docs/plans/           # Designs et feuilles de route
└── docker-compose.yml    # PostgreSQL + pgvector + Redis
```

---

## Contexte SkyModel (ne pas oublier)

Le projet a un objectif long terme : entraîner un LLM maison (`skymodel`).
- Track A : fine-tune Phi-4-mini (rapide, utilisable dans l'API)
- Track B : Transformer from scratch, inspiré cours Stanford CS224N
- Lab gitignored dans `src/core/model-lab/`
- Intégration dans l'API via `"provider": "skymodel"` (serveur local port 11435)
- Design complet : `docs/plans/2026-04-02-skymodel-own-llm-design.md`
