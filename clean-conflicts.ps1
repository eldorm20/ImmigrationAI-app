$files = @(
    'client/src/pages/dashboard.tsx',
    'client/src/pages/admin-dashboard.tsx',
    'client/src/pages/employer-verification.tsx',
    'client/src/pages/research.tsx',
    'client/src/components/lawyer-consultations.tsx',
    'client/src/components/dashboard/RoadmapView.tsx',
    'client/src/components/dashboard/TranslateView.tsx',
    'client/src/components/dashboard/EmployerVerificationView.tsx',
    'server/lib/agents.ts',
    'server/routes.ts',
    'server/routes/admin.ts',
    'server/routes/subscriptions.ts',
    'server/routes/messages.ts'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        # Remove conflict markers keeping the remote version (after =======)
        $content = $content -replace '(?ms)<<<<<<< HEAD.*?=======(.*?)>>>>>>> .*?\r?\n', '$1'
        Set-Content $file $content -NoNewline
        Write-Host "Cleaned: $file"
    }
}

Write-Host "All conflict markers removed!"
