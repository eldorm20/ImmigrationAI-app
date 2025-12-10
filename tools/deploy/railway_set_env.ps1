# Railway environment setup helper
# Usage: run this locally after installing Railway CLI and logging in (`railway login`).
# This script will prompt for S3 and optional Stripe values and set them in the active Railway project.

param()

function Prompt-Secret([string]$name) {
    Write-Host "Enter value for $name (leave empty to skip):"
    $value = Read-Host -AsSecureString
    if ($value.Length -eq 0) { return $null }
    return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($value))
}

Write-Host "Railway env var setter — prompts for values and runs 'railway variables set' commands."
Write-Host "You must be logged in with 'railway login' and have the project selected (run in the project folder or use railway link)."

# Prompt for values
$awsAccessKey = Prompt-Secret 'AWS_ACCESS_KEY_ID'
$awsSecretKey = Prompt-Secret 'AWS_SECRET_ACCESS_KEY'
$s3Bucket = Read-Host 'S3_BUCKET (bucket name) — leave empty to skip'
$s3Endpoint = Read-Host 'S3_ENDPOINT (optional; Railway storage endpoint) — leave empty to skip'
$awsRegion = Read-Host 'AWS_REGION (optional; default us-east-1) — leave empty to skip'

# Optional Stripe
$stripeKey = Prompt-Secret 'STRIPE_SECRET_KEY (optional)'

# Helper to run railway variables set
function Set-RailwayVar($key, $value) {
    if ([string]::IsNullOrEmpty($value)) { return }
    Write-Host "Setting $key..."
    # Use --yes to avoid interactive prompts if supported
    railway variables set $key="${value}"
    if ($LASTEXITCODE -ne 0) { Write-Host "Failed to set $key" -ForegroundColor Red }
}

Set-RailwayVar 'AWS_ACCESS_KEY_ID' $awsAccessKey
Set-RailwayVar 'AWS_SECRET_ACCESS_KEY' $awsSecretKey
Set-RailwayVar 'S3_BUCKET' $s3Bucket
Set-RailwayVar 'S3_ENDPOINT' $s3Endpoint
Set-RailwayVar 'AWS_REGION' $awsRegion
Set-RailwayVar 'STRIPE_SECRET_KEY' $stripeKey

Write-Host "Env vars set (where provided). You can now redeploy the service from the Railway UI or use the CLI to deploy."
Write-Host "To trigger a deploy via CLI (if supported), run: railway up --deploy"
Write-Host "To tail logs: railway logs --follow"