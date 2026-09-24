#!/usr/bin/env bash
# Pulls the local model Orbit uses by default. Run once, after installing
# Ollama from https://ollama.com/download.
set -euo pipefail

model="${ORBIT_MODEL:-qwen2.5:7b-instruct}"

echo "Pulling $model via Ollama (this downloads several GB the first time)..."
ollama pull "$model"

echo
echo "Done. Start Ollama's server if it isn't already running:"
echo "  ollama serve"
