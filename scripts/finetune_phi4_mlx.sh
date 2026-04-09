#!/bin/bash
# SkyModel Lab Track A - Local Fine-Tuning of Phi-4-mini using MLX
# Prerequisites: Apple Silicon Mac (M1/M2/M3/M4)

set -e

echo "Setting up MLX environment for Phi-4-mini fine-tuning..."

# 1. Create a dedicated virtual environment
if [ ! -d ".mlx-env" ]; then
    python3 -m venv .mlx-env
fi
source .mlx-env/bin/activate

# 2. Install MLX library and MLX LM tools
echo "Installing mlx and mlx-lm..."
pip install -q mlx mlx-lm

# 3. Create dataset directories
mkdir -p data/mlx-finetune
echo "Created data/mlx-finetune directory. Ensure train.jsonl and valid.jsonl are placed here."
echo "Each line should be a JSON object like: {\"text\": \"<User text> \\n<Assistant text>\"}"

# Constants
MODEL="microsoft/phi-4-mini"
ADAPTER_PATH="adapters/phi-4-mini-lora"

echo ""
echo "=================================================="
echo "Ready for Fine-tuning!"
echo "=================================================="
echo "To start the LoRA fine-tuning process, run:"
echo "source .mlx-env/bin/activate"
echo "mlx_lm.lora \\"
echo "    --model $MODEL \\"
echo "    --train \\"
echo "    --data data/mlx-finetune \\"
echo "    --iters 1000 \\"
echo "    --adapter-path $ADAPTER_PATH"
echo ""
echo "After fine-tuning, you can fuse the adapter with the base model:"
echo "mlx_lm.fuse --model $MODEL --adapter-path $ADAPTER_PATH --save-path models/phi-4-mini-finetuned"
