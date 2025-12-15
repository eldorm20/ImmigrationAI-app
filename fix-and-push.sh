#!/bin/bash
cd /mnt/c/Users/USER/Documents/ImmigrationAI-app/ImmigrationAI-app-main

echo "=== Fixing route files ==="
for file in server/routes/*.ts; do
  sed -i 's/req\.user!\.userId/req.user!.id/g' "$file"
done

echo "=== Checking git status ==="
git status --short

echo "=== Committing changes ==="
git add server/routes/*.ts

if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "Fix: Replace req.user!.userId with req.user!.id across all route handlers"
  echo "Commit successful"
fi

echo "=== Pushing to GitHub ==="
git push origin main
echo "Push complete!"
