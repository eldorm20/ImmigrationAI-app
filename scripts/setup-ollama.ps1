# Check if Ollama is running
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue

if (-not $ollamaProcess) {
    Write-Host "Ollama is not running. Starting Ollama..."
    Start-Process "ollama" "serve" -NoNewWindow
    Start-Sleep -Seconds 5
} else {
    Write-Host "Ollama is running."
}

# Define the model to use (sync with AI_CONFIG)
$modelName = "llama3"

# Check if model exists
$availableModels = ollama list
if ($availableModels -match $modelName) {
    Write-Host "Model '$modelName' is already present."
} else {
    Write-Host "Model '$modelName' not found. Pulling..."
    ollama pull $modelName
}

Write-Host "Ollama setup complete."
