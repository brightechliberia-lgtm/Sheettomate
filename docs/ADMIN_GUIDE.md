# Admin guide

Sign in as `admin@sheettomate.com` / `ChangeMe123!` (change before production) and open `/admin`.

This account is `Role.ADMIN` with `staffRole: SUPER` — full UI control over users, templates, courses, payments, CMS, moderation, analytics, AI, health, reports, and settings.

## Typical tasks

- Moderate reports (`ContentFlag`), suspend users, review templates and courses.
- Watch payment statuses; keep production gateways in **live** only after launch checklist.
- Community: bans, forum/events, reputation abuse.
- Automations: revoke leaked API keys; inbound hooks are CSRF-exempt by design—protect secrets.
- Push notifications require VAPID keys.

## Operations

- Health: `GET /api/health`, `GET /api/health/ready`.
- Backups: `scripts/backup.sh`.
- Incidents: `docs/INCIDENT_RESPONSE.md`.
