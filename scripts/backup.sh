#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
FILE="$DIR/sheetomate-$STAMP.sql.gz"
echo "Dumping Postgres to $FILE"
pg_dump "$DATABASE_URL" | gzip > "$FILE"
if [ -d "${UPLOAD_DIR:-./server/uploads}" ]; then
  tar -czf "$DIR/uploads-$STAMP.tgz" -C "$(dirname "${UPLOAD_DIR:-./server/uploads}")" "$(basename "${UPLOAD_DIR:-./server/uploads}")"
fi
echo "Keep last 14 days"
find "$DIR" -type f -mtime +14 -delete
echo "Restore drill: gzip -dc $FILE | psql \$DATABASE_URL (on a clone, never prod blindly)"
