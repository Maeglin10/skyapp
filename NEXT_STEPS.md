# Prochaines étapes (Next Steps) - SkyApp API

Ce document liste les tâches restantes à accomplir pour finaliser complètement le passage en production et l'intégration du nouveau workflow.

## 1. Mise à jour du client Frontend (WebSocket)
- Le backend utilise désormais une **WebSocket Gateway** (`Socket.io`) au lieu d'une connexion SSE HTTP classique pour les streams d'agents (`/agents/stream`).
- **Action Requise :**
  - Mettre à jour le frontend pour installer `socket.io-client`.
  - Remplacer l'appel HTTP au SSE (`EventSource`) par une connexion WebSocket sur l'événement `stream`.
  - Écouter les événements émis : `stream_token`, `stream_end`, `stream_error`.

## 2. Infrastructure et Déploiement (Fly.io)
- Le code backend est entièrement dockerisé (`Dockerfile`) et paramétré pour un déploiement Vercel/Fly.
- **Action Requise :**
  - Installer le CLI `flyctl`.
  - Lancer les commandes de provisioning préparées :
    ```bash
    fly launch --name skyapp-api
    fly postgres create --name skyapp-db
    fly redis create --name skyapp-cache
    ```
  - Appliquer les migrations de production : `fly console` puis `npx prisma migrate deploy`.
  - Lancer `fly deploy`.
  - Définir les secrets de production (`SKYMODEL_URL`, `JWT_SECRET`, etc.) via `fly secrets set`.

## 3. SkyModel Lab Track A (Fine-Tuning MLX Local)
- Le script bash de préparation de l'environnement est créé (`scripts/finetune_phi4_mlx.sh`).
- **Action Requise :**
  - Populer le dataset de logs réels formatés dans `data/mlx-finetune/train.jsonl` et `valid.jsonl`.
  - Lancer `chmod +x scripts/finetune_phi4_mlx.sh && ./scripts/finetune_phi4_mlx.sh` sur un Mac Silicon (M1/M2/M3/M4).
  - Intégrer la logique d'appel de l'adaptateur MLX fine-tuné dans les appels LLM internes de l'API (quand `provider === 'skymodel'`).

## 4. Swagger UI et Tests E2E
- Les annotations `@ApiBearerAuth()` ont été positionnées sur toutes les routes.
- **Action Requise :**
  - Fournir et tester un JWT token valide dans l'UI Swagger (`/api`) une fois déployé.
  - Vérifier que les Tests E2E (Playwright ou intégration Jest e2e) valident bien le changement vers WebSockets.
