#!/usr/bin/env bash
set -euo pipefail
TAG="${1:?image tag}"
echo "Rolling live traffic back to $TAG"
echo "ECS: update-service --force-new-deployment --task-definition sheetomate-api:$TAG"
echo "DigitalOcean: doctl apps update --image $TAG"
echo "Then: bash scripts/smoke.sh \$PRODUCTION_URL"
