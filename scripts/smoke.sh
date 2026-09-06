#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:4000}"
echo "Smoke against $BASE"
curl -fsS "$BASE/api/health" | grep -q '"status":"ok"'
echo "health ok"
if curl -fsS "$BASE/api/health/ready" >/dev/null 2>&1; then
  echo "ready ok"
fi
# SPA or API-only
if curl -fsS "${BASE%/}" >/dev/null 2>&1; then
  echo "origin reachable"
fi
echo "smoke passed"
