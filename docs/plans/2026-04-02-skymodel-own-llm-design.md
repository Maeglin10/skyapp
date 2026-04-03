# SkyModel — Design : Entraîner et intégrer son propre LLM

Date : 2026-04-02

## Contexte

skyapp expose déjà des adaptateurs pour Anthropic, OpenAI et Gemini. L'objectif est d'ajouter un 4ème adaptateur (`skymodel`) qui pointe sur un modèle entraîné en local, invisible sur GitHub.

## Deux tracks parallèles

### Track A — Fine-tune rapide (utilisable rapidement)
- Base : Phi-4-mini-instruct (3.8B params, Microsoft)
- Méthode : LoRA via MLX sur Apple Silicon, ou cloud (RunPod/Colab) pour les runs longs
- Résultat : modèle opérationnel en quelques semaines
- Config : `src/core/model-lab/training/configs/finetune_phi4.yaml`
- Script : `src/core/model-lab/training/scripts/finetune_mlx.py`

### Track B — From scratch (apprentissage profond)
- Architecture : Transformer GPT-style (2 couches, 128 dim, entraînable sur CPU Mac)
- Inspiré du cours Stanford CS224N (Word Vectors → Pretraining → Fine-tuning)
- Objectif pédagogique : comprendre chaque brique avant de scaler
- Config : `src/core/model-lab/training/configs/scratch_tiny.yaml`
- Script : `src/core/model-lab/training/scripts/train_scratch.py`

## Architecture d'intégration

```
model-lab/          ← gitignored (invisible GitHub)
  datasets/         ← données brutes + tokenizées
  training/         ← scripts Python + configs YAML
  versions/         ← checkpoints + registry.json (modèle actif)
  serve/            ← local_server.py (API OpenAI-compatible, port 11435)

src/core/llm/adapters/skymodel.adapter.ts  ← visible, même interface que les autres
```

### Flux complet
1. Entraîner / fine-tuner via les scripts Python
2. Démarrer le serveur local : `python local_server.py --mode mlx --model-path ...`
3. `skymodel.adapter.ts` pointe sur `http://localhost:11435/v1`
4. Utiliser `provider: 'skymodel'` dans n'importe quel appel LLMService

## Progression Track B (mapping cours Stanford CS224N)

| Semaine | Cours Stanford | Implémentation |
|---------|---------------|----------------|
| 1-2 | Word Vectors (Lect. 2) | Tokenizer BPE + embeddings |
| 3-4 | Attention & Transformers (Lect. 6) | MultiHeadSelfAttention, TransformerBlock |
| 5-6 | Pretraining (Lect. 9) | Boucle entraînement next-token prediction |
| 7-8 | Fine-tuning / RLHF (Lect. 11) | Instruction tuning sur exemples |
| 9+ | Scaling (Lect. 12) | Métriques, itérations, comparaison Track A |

## Variables d'environnement

```env
SKYMODEL_URL=http://localhost:11435/v1   # optionnel, défaut
SKYMODEL_NAME=skymodel                   # nom du modèle envoyé au serveur local
```

## Prochaines étapes

1. Préparer un premier dataset (100MB de texte) pour Track B
2. Implémenter le tokenizer BPE dans `train_scratch.py`
3. Premier run d'entraînement Track B (validation que le loss descend)
4. Premier fine-tune Track A sur Phi-4-mini avec MLX
5. Tester `provider: 'skymodel'` dans un agent skyapp
