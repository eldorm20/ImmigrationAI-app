#!/usr/bin/env bash
set -euo pipefail
BASE="https://immigrationai-app-production-b994.up.railway.app"

echo "Logging in as lawyer..."
RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"furxat.19.97.12@gmail.com","password":"Ziraat123321**"}' "$BASE/api/auth/login")
echo "$RESP"
TOKEN=$(node -e "let s=''+require('fs').readFileSync(0,'utf8'); try{let j=JSON.parse(s); console.log(j.accessToken||j.access_token||j.token||'');}catch(e){console.error('parse error'); process.exit(0);}" <<< "$RESP")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "No lawyer token found; exiting"
  exit 0
fi

echo "Lawyer token obtained (truncated): ${TOKEN:0:20}..."

echo "\nCalling /api/ai/documents/generate as lawyer..."
curl -s -i -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title":"smoke-lawyer","text":"sample text"}' "$BASE/api/ai/documents/generate" | sed -n '1,200p'

echo "\nCalling /api/ai/chat as lawyer..."
curl -s -i -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"message":"smoke test"}' "$BASE/api/ai/chat" | sed -n '1,200p'

exit 0
