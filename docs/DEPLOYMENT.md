# Deployment guide

## Environments

| Tier | Purpose | Payments | Data |
| --- | --- | --- | --- |
| Development | Local Docker Postgres/Redis + `npm run dev` | `PAYMENTS_MODE=sandbox` | Disposable |
| Staging | Same images as prod, isolated DB | Sandbox gateways | Anonymized or seed |
| Production | Live traffic | Live only after checklist | Backed up daily |

Copy `.env.example` to `.env`. Never commit secrets. Rotate `JWT_*`, BanffPay/Orange keys, and automation API keys (`scripts/rotate-api-keys.sh`).

## Local production-like stack

```bash
# Set POSTGRES_PASSWORD in .env
npm run docker:prod
bash scripts/smoke.sh http://localhost
```

Compose file: `docker-compose.prod.yml` (API behind nginx SPA on port 80).

## Hosting options

### AWS ECS (Fargate)

1. Push images from GitHub Actions (`REGISTRY` secrets).
2. Task definition template: `ops/ecs-task-definition.json`.
3. Services: `sheettomate-api` (port 4000), `sheetomate-web` (port 80) or CloudFront → S3 for the SPA.
4. RDS PostgreSQL Multi-AZ + read replica (`DATABASE_URL` primary; optional `DATABASE_REPLICA_URL` for future read routing).
5. ElastiCache Redis (`REDIS_URL`) for BullMQ and cache.
6. ALB with ACM certificate (TLS 1.2+). WAF WebACL attached to ALB.
7. CloudFront in front of ALB or S3; origin shield optional.

Blue-green: two target groups; shift listener after `scripts/smoke.sh` on the green URL.

### DigitalOcean App Platform

Spec sketch: `ops/do-app.yaml`. Managed Postgres + Redis, two services (api, web). TLS is automatic. Attach Cloudflare in front for WAF/DDoS.

## CDN and DDoS

- Cloudflare proxy (orange cloud) + WAF managed rules + rate limiting at the edge.
- Or CloudFront + AWS WAF.
- App-level rate limits remain in Express (IP + bearer prefix).

## Monitoring and logs

- **APM:** Datadog (`DD_API_KEY`, `DD_SITE`) or New Relic (`NEW_RELIC_LICENSE_KEY`).
- **Logs:** CloudWatch Logs on ECS, or Filebeat → Elasticsearch (ELK).
- **Errors:** `SENTRY_DSN` (API) and `VITE_SENTRY_DSN` (client).
- **Uptime:** UptimeRobot/Pingdom on `/api/health` and `/api/health/ready`.
- **Perf:** Lighthouse CI (`.github/workflows/lighthouse.yml`) against staging URL (`LHCI_URL` secret).
- **k6:** `k6 run ops/k6/load.js` with `BASE_URL` set to staging.

Alerts to configure: 5xx rate, p95 latency, RDS CPU/storage, Redis memory, payment webhook failures, AI spend (OpenAI/Anthropic billing + daily usage logs).

## CI/CD

- PR/push: `.github/workflows/ci.yml` (lint, unit, Jest API, Vitest, build, Playwright with Postgres).
- Staging on main + manual: `.github/workflows/deploy.yml`.
- Production: workflow_dispatch with GitHub Environment **protection rules** (required reviewers).
- Rollback: `.github/workflows/rollback.yml` with previous image tag.

## Backups

- Daily `pg_dump` via `scripts/backup.sh` (cron or EventBridge). Copy gzip to S3/Spaces with 14-day local retention (extend in object storage).
- File storage: versioned S3/Cloudinary; local uploads tarball in the same script.
- Quarterly restore drill: `scripts/restore.sh` onto a clone database, never overwrite prod without a freeze.

## SSL

Terminate TLS at Cloudflare/ALB. Helmet HSTS is enabled when `NODE_ENV=production`.
