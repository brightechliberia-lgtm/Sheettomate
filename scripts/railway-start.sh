#!/bin/sh
set -eu

cd /app/server

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. In Railway Variables, add a reference to sheettomate-db DATABASE_URL."
  exit 1
fi

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

echo "Starting API on PORT=${PORT:-4000}..."
exec node dist/index.js
