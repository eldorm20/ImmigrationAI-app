#!/bin/bash
cd /mnt/c/Users/USER/Documents/ImmigrationAI-app/ImmigrationAI-app-main

echo "Pushing to GitHub..."
# Try to push with timeout - will fail if authentication times out
timeout 30 git push origin main 2>&1 | grep -E "(Enumerating|Total|Writing|remote:|To https)" || true

# Give it time to process
sleep 2

# Check final status
if git log origin/main --oneline -1 2>/dev/null | grep -q "fix:"; then
  echo "✅ Push successful!"
  git log --oneline -1
else
  echo "⏳ Push status: $(git status -s -uno)"
fi
