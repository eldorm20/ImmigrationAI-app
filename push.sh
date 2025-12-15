#!/bin/bash
# Push script for ImmigrationAI app fixes

cd "$(dirname "$0")" || exit 1

echo "================================"
echo "ImmigrationAI - Push Bug Fixes"
echo "================================"
echo ""
echo "Current commit:"
git log --oneline -1
echo ""
echo "Changes to push:"
git diff --stat origin/main..HEAD
echo ""

# Check if token is provided as argument
if [ -z "$1" ]; then
    echo "ERROR: GitHub token not provided"
    echo ""
    echo "Usage: ./push.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "To get a token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
    echo "3. Select 'repo' scope"
    echo "4. Copy the token and run: ./push.sh <token>"
    exit 1
fi

echo "Pushing to GitHub..."
git push "https://$1@github.com/eldorm20/ImmigrationAI-app.git" main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Push successful!"
    echo "Railway will automatically redeploy your app."
    echo "Check: https://github.com/eldorm20/ImmigrationAI-app/commits/main"
else
    echo ""
    echo "❌ Push failed. Please check your token and try again."
    exit 1
fi
