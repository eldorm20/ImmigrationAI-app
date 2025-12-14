#!/usr/bin/env bash
set -euo pipefail
BASE="https://immigrationai-app-production-b994.up.railway.app"

echo "Logging in as client..."
CLIENT_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"eldorbekmukhammadjonov@gmail.com","password":"Ziraat123321**"}' "$BASE/api/auth/login")
echo "$CLIENT_RESP"
CLIENT_TOKEN=$(node -e "let s=''+require('fs').readFileSync(0,'utf8'); try{let j=JSON.parse(s); console.log(j.accessToken||j.access_token||j.token||'');}catch(e){console.error('parse error'); process.exit(0);}" <<< "$CLIENT_RESP")
if [ -z "$CLIENT_TOKEN" ] || [ "$CLIENT_TOKEN" = "null" ]; then
  echo "No client access token found; exiting"
  exit 0
fi

echo "Client token obtained (truncated): ${CLIENT_TOKEN:0:20}..."

echo "\nCalling /api/ai/documents/generate as client..."
curl -s -i -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $CLIENT_TOKEN" -d '{"title":"smoke","text":"sample text for smoke"}' "$BASE/api/ai/documents/generate" | sed -n '1,200p'

echo "\nCalling /api/ai/chat as client..."
curl -s -i -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $CLIENT_TOKEN" -d '{"messages":[{"role":"user","content":"smoke test"}]}' "$BASE/api/ai/chat" | sed -n '1,200p'

echo "\nUploading test file to /api/documents/upload"
printf "test file" > /tmp/smoke.txt
curl -s -i -X POST -H "Authorization: Bearer $CLIENT_TOKEN" -F file=@/tmp/smoke.txt "$BASE/api/documents/upload" | sed -n '1,200p'

echo "\nFetching /api/auth/me"
curl -s -i -H "Authorization: Bearer $CLIENT_TOKEN" "$BASE/api/auth/me" | sed -n '1,200p'

exit 0
