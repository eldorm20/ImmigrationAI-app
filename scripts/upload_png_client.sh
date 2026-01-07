#!/usr/bin/env bash
set -euo pipefail
BASE="https://immigrationai-app-production-b994.up.railway.app"

# create a tiny 1x1 PNG
cat > /tmp/smoke.png <<'PNGBASE64'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=
PNGBASE64
base64 -d /tmp/smoke.png > /tmp/smoke_dec.png || true
mv /tmp/smoke_dec.png /tmp/smoke.png || true

# login
RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"eldorbekmukhammadjonov@gmail.com","password":"Ziraat123321**"}' "$BASE/api/auth/login")
TOKEN=$(node -e "let s=''+require('fs').readFileSync(0,'utf8'); try{let j=JSON.parse(s); console.log(j.accessToken||j.access_token||j.token||'');}catch(e){console.error('parse error'); process.exit(0);}" <<< "$RESP")
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then echo "No token"; exit 1; fi

echo "Uploading PNG file as client..."
curl -s -i -X POST -H "Authorization: Bearer $TOKEN" -F file=@/tmp/smoke.png "$BASE/api/documents/upload" | sed -n '1,200p'

exit 0
