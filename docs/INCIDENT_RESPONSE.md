# Emergency response plan

## Severity

| SEV | Example | Response |
| --- | --- | --- |
| 1 | Payments down, data leak, site unavailable | Page on-call immediately |
| 2 | Elevated 5xx, webhook lag, AI provider outage | Start incident within 15 min |
| 3 | Single-feature bug | Ticket, next business hours |

## First 15 minutes

1. Confirm in Datadog/New Relic + Sentry (not a single user report).
2. Check `/api/health` and `/api/health/ready`.
3. Freeze deploys. If last deploy is the cause: run **Rollback** workflow with previous image tag (`scripts/rollback.sh`).
4. For payment incidents: set `PAYMENTS_MODE=sandbox` is **not** a prod toggle—disable live keys in the gateway dashboard and show a maintenance banner.
5. For suspected breach: rotate JWT secrets, BanffPay/Orange keys, automation API keys; invalidate sessions; preserve logs.

## Communications

- Internal: Slack/email on-call.
- Users: status note on the landing page or email if checkout is blocked.
- After SEV1: postmortem within 5 business days (timeline, impact, fix, follow-ups).

## Runbooks

- **DB restore:** `scripts/restore.sh` on a clone; promote only with two-person approval.
- **Queue stuck:** Redis connectivity; replay failed BullMQ jobs after cause is fixed.
- **Origin/WAF false positive:** Temporarily loosen Cloudflare rule, never disable TLS.
