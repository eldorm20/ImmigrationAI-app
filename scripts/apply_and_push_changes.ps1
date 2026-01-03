# Apply and push prepared changes for ImmigrationAI
# Run this from your local clone root in PowerShell (Administrator not required).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\apply_and_push_changes.ps1

# Ensure Git in PATH for this session if installed in default location
$gitPath = 'C:\Program Files\Git\cmd'
if (Test-Path $gitPath) {
    $env:Path = $gitPath + ';' + $env:Path
}

function Run-Command($cmd) {
    Write-Host "-> $cmd"
    & cmd /c $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

try {
    # Verify we're inside a git repo
    $inside = (& git rev-parse --is-inside-work-tree) -eq 'true'
} catch {
    $inside = $false
}

if (-not $inside) {
    Write-Host "This directory is not a git repository. Please run this script from the root of your cloned repo." -ForegroundColor Yellow
    exit 1
}

# Configure user if missing
$user = (& git config user.name) 2>$null
$email = (& git config user.email) 2>$null
if (-not $user) {
    git config user.name "Your Name"
    Write-Host "Set git user.name to 'Your Name' (modify after running if desired)."
}
if (-not $email) {
    git config user.email "you@example.com"
    Write-Host "Set git user.email to 'you@example.com' (modify after running if desired)."
}

$branch = 'ui-apple-redesign'
Write-Host "Creating and switching to branch $branch"
# Create branch from current checkout
Run-Command "git checkout -b $branch"

# Files to add (relative to repo root)
$files = @(
    'client/src',
    'client/APPLE_DESIGN_PLAN.md',
    'client/src/styles/apple-theme.css',
    'client/src/pages/home.tsx',
    'client/src/main.tsx',
    'client/src/components/ui/button.tsx',
    'client/src/components/layout/Navbar.tsx',
    'client/src/components/layout/Footer.tsx',
    'client/src/components/layout/Layout.tsx',
    'client/src/components/layout/footer-new.tsx',
    'client/src/index.css',
    'server/lib/agents.ts',
    'server/index.ts',
    'rag-backend/main.py',
    'rag-backend/RAILWAY_CHECKLIST.md',
    '.github/workflows/rag-backend-ci.yml'
)

# Stage files (use add -A to ensure new/modified tracked)
foreach ($f in $files) {
    Write-Host "Staging: $f"
    try {
        Run-Command "git add --all --force -- '$f'"
    } catch {
        Write-Host "Warning: failed to git add $f (file may not exist)." -ForegroundColor Yellow
    }
}

# Commit
$message = 'UI: Apple redesign + AI integration fixes (Ollama probe, RAG health, CI)'
Run-Command "git commit -m \"$message\" || echo 'No changes to commit'"

# Push
Run-Command "git push -u origin $branch"

# Create PR using gh if available
$ghAvailable = $false
try { & gh --version > $null; $ghAvailable = $true } catch { $ghAvailable = $false }
if ($ghAvailable) {
    Write-Host "Creating PR using gh..."
    Run-Command "gh pr create --title \"UI: Apple redesign + AI integration fixes\" --body \"Adds Apple-like UI POC and patches: Ollama probe, RAG /health, integrations health endpoint, RAG CI workflow. CI will validate rag-backend.\" --base main"
} else {
    Write-Host "gh CLI not found. Open a PR manually at your GitHub repo: create a PR from '$branch' into 'main'." -ForegroundColor Yellow
}

Write-Host "Done. Monitor CI on GitHub for the rag-backend workflow." -ForegroundColor Green
