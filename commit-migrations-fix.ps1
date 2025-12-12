#!/usr/bin/env pwsh
# PowerShell script to commit and push changes

$repoPath = "c:\Users\USER\Documents\ImmigrationAI-app\ImmigrationAI-app-main"
Set-Location $repoPath

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan

# Check git status
Write-Host "`nChecking git status..." -ForegroundColor Yellow
& git status --short

Write-Host "`nChanges to commit:" -ForegroundColor Yellow
Write-Host "- Dockerfile (added COPY migrations ./migrations)" -ForegroundColor Green
Write-Host "- server/lib/runMigrations.ts (removed AUTO_RUN_MIGRATIONS dependency)" -ForegroundColor Green

# Stage the critical files
Write-Host "`nStaging changes..." -ForegroundColor Cyan
& git add Dockerfile server/lib/runMigrations.ts

# Verify files are staged
Write-Host "`nVerifying staged files:" -ForegroundColor Yellow
& git diff --cached --name-only

# Commit with descriptive message
$commitMessage = @"
fix: Ensure database migrations run on Railway deployment

Critical fixes for POST /api/auth/login 500 error:
- Modified runMigrations.ts to always execute migrations when DATABASE_URL is set (removes AUTO_RUN_MIGRATIONS env var dependency)
- Updated Dockerfile to COPY migrations folder into production image
- Migrations now run automatically on every app start, ensuring database schema is created

This fixes the 500 error on /auth/login caused by missing database tables on Railway deployment.
"@

Write-Host "`nCreating commit..." -ForegroundColor Cyan
& git commit -m $commitMessage

# Show commit details
Write-Host "`nCommit created:" -ForegroundColor Yellow
& git log --oneline -1

Write-Host "`nYou can now push with: git push origin main" -ForegroundColor Cyan
