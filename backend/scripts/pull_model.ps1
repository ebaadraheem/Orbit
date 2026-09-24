# Pulls the local model Orbit uses by default. Run once, after installing
# Ollama from https://ollama.com/download.
#
#   powershell -ExecutionPolicy Bypass -File scripts\pull_model.ps1

$ErrorActionPreference = "Stop"

$model = if ($env:ORBIT_MODEL) { $env:ORBIT_MODEL } else { "qwen2.5:7b-instruct" }

Write-Host "Pulling $model via Ollama (this downloads several GB the first time)..."
ollama pull $model

Write-Host ""
Write-Host "Done. Start Ollama's server if it isn't already running:"
Write-Host "  ollama serve"
