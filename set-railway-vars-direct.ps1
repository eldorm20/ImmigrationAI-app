# set-railway-vars-direct.ps1
# Directly set Railway environment variables using Railway CLI.
# Usage: run in PowerShell. Requires `railway` CLI installed (npm i -g @railway/cli) or available in PATH.
# The script will prompt for Railway API token and project id, then prompt for STRIPE and HF keys.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-SecureInput($prompt) {
  $secure = Read-Host -Prompt $prompt -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}

Write-Host "This script will set Railway environment variables directly using the Railway CLI."
Write-Host "It does not use GitHub Actions and keeps your secrets local to your machine."

# Railway API token (used to login)
$railwayApiToken = Read-SecureInput "Enter RAILWAY_API_TOKEN (your Railway API key)"
if (-not $railwayApiToken) {
  Write-Host "RAILWAY_API_TOKEN is required to authenticate. Aborting."; exit 1
}

# Project ID
$projectId = Read-Host -Prompt "Enter RAILWAY_PROJECT_ID (project ID)"
if (-not $projectId) {
  Write-Host "RAILWAY_PROJECT_ID is required. Aborting."; exit 1
}

# Prompt for variables
Write-Host "\nEnter variables. Leave blank and press Enter to skip any value. (Secrets will not be displayed.)"
$stripeSecret = Read-SecureInput "Enter STRIPE_SECRET_KEY"
$stripePublic = Read-Host "Enter STRIPE_PUBLIC_KEY"
$stripeWebhook = Read-SecureInput "Enter STRIPE_WEBHOOK_SECRET"
$hfToken = Read-SecureInput "Enter HUGGINGFACE_API_TOKEN"
$hfModel = Read-Host "Enter HF_MODEL (e.g. namespace/model)"
$hfInferenceUrl = Read-Host "Enter HF_INFERENCE_URL (custom inference endpoint)"

Write-Host "\nAny additional variables? Enter KEY=VALUE lines. Enter an empty line to finish."
$additional = @()
while ($true) {
  $line = Read-Host "Additional var (KEY=VALUE) or blank to finish"
  if ([string]::IsNullOrWhiteSpace($line)) { break }
  $additional += $line
}

# Build list of variables to set
$vars = @()
if ($stripeSecret) { $vars += @{ Key = 'STRIPE_SECRET_KEY'; Value = $stripeSecret } }
if ($stripePublic) { $vars += @{ Key = 'STRIPE_PUBLIC_KEY'; Value = $stripePublic } }
if ($stripeWebhook) { $vars += @{ Key = 'STRIPE_WEBHOOK_SECRET'; Value = $stripeWebhook } }
if ($hfToken) { $vars += @{ Key = 'HUGGINGFACE_API_TOKEN'; Value = $hfToken } }
if ($hfModel) { $vars += @{ Key = 'HF_MODEL'; Value = $hfModel } }
if ($hfInferenceUrl) { $vars += @{ Key = 'HF_INFERENCE_URL'; Value = $hfInferenceUrl } }

foreach ($line in $additional) {
  if ($line -match "^([^=]+)=(.*)$") {
    $k = $matches[1].Trim()
    $v = $matches[2]
    $vars += @{ Key = $k; Value = $v }
  } else {
    Write-Host "Skipping invalid additional var line: $line"
  }
}

if ($vars.Count -eq 0) {
  Write-Host "No variables provided. Exiting."; exit 0
}

# Determine whether to use global `railway` CLI or `npx @railway/cli`
$useNpx = $false
$runner = $null
if (Get-Command railway -ErrorAction SilentlyContinue) {
  $runner = 'railway'
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  $runner = 'npx'
  $useNpx = $true
} else {
  Write-Host "Neither 'railway' nor 'npx' was found in PATH. Install the Railway CLI globally with 'npm i -g @railway/cli' or ensure 'npx' is available."; exit 1
}

# Login
Write-Host "Logging into Railway..."
if ($useNpx) {
  $loginCmd = @('npx', '@railway/cli', 'login', '--apiKey', $railwayApiToken)
  & $loginCmd[0] $loginCmd[1] $loginCmd[2] $loginCmd[3] $loginCmd[4]
} else {
  & railway login --apiKey $railwayApiToken
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "Railway login failed. Please verify token and try again."; exit 1
}

Write-Host "Setting variables for project: $projectId"
foreach ($item in $vars) {
  $k = $item.Key
  $v = $item.Value
  Write-Host " - Setting $k"
  if ($useNpx) {
    & npx @railway/cli variables set $k $v --project $projectId
  } else {
    & railway variables set $k $v --project $projectId
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set $k. Aborting."; exit 1
  }
}

Write-Host "All variables set. Listing variables for verification..."
if ($useNpx) {
  & npx @railway/cli variables --project $projectId
} else {
  & railway variables --project $projectId
}

Write-Host "\nDone. If your Railway service did not auto-deploy, open the Railway project UI and trigger a redeploy so the app picks up the new env vars."
Write-Host "If you want, paste the Railway project URL or confirm when deployed and I will provide smoke-test curl commands."
