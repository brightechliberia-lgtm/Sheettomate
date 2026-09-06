#!/usr/bin/env bash
set -euo pipefail
FILE="${1:?path to .sql.gz}"
echo "Restoring $FILE into DATABASE_URL (must be a clone or maintenance window)"
gzip -dc "$FILE" | psql "$DATABASE_URL"
echo "restore complete — run scripts/smoke.sh next"
