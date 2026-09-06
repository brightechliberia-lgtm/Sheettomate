#!/usr/bin/env bash
set -euo pipefail
# Revoke keys older than 90 days via API (staff session required)
API="${API_URL:-http://localhost:4000/api}"
TOKEN="${STAFF_TOKEN:?set STAFF_TOKEN}"
echo "List keys then revoke stale ones through /automations/keys/:id"
curl -fsS -H "Authorization: Bearer $TOKEN" "$API/automations/keys"
echo
echo "Rotate: create a new key, update clients, then DELETE the old id."
