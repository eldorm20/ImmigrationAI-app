# PowerShell Git Push Script
$gitPath = "C:\Program Files\Git\bin\git.exe"
$repoPath = "c:\Users\USER\Documents\ImmigrationAI-app-main"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Commit and Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $repoPath

Write-Host "Adding modified files..." -ForegroundColor Yellow
& $gitPath add client\src\lib\i18n.tsx

Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
& $gitPath commit -m "Fix console errors and add complete i18n translations (EN/UZ/RU)

- Added simulator.options namespace with all translation keys
- Added interview.options with visa types and countries arrays  
- Added complete interview translations for EN/UZ/RU (20+ new keys)
- Added lawyer.searchPlaceholder for messages search
- Expanded consultation namespace from 7 to 26 properties
- Fixed 'Cannot read properties of undefined (reading options)' errors"

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
& $gitPath push origin main

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Done! Changes pushed to GitHub" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
