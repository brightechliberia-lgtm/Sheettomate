# Sheettomate

Online marketplace and learning hub for Excel and Google Sheets templates, with AI generation and West African payment methods (Orange Money, Mobile Money, Visa via BanffPay).

## Stack

- **Client:** React 19, Vite, TypeScript, Tailwind CSS
- **Server:** Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Auth:** JWT access tokens + rotating HTTP-only refresh cookies
- **Storage:** Local uploads in development; Cloudinary or S3 in production

## Quick start

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health

Demo accounts (password `ChangeMe123!`):

- `admin@sheettomate.com` — ADMIN
- `creator@sheettomate.com` — CREATOR
- `learner@sheettomate.com` — LEARNER

## Roles

| Role | Capabilities |
| --- | --- |
| ADMIN | Full platform control |
| CREATOR | Upload and sell templates |
| USER | Browse, buy, request AI templates |
| LEARNER | Enroll in courses |

## Tests

```bash
npm test                      # server unit (node:test) + client Vitest
npm run test:api -w server    # Jest + Supertest
npm run test:e2e              # Playwright (needs app at :5173 or E2E_BASE_URL)
k6 run ops/k6/load.js         # performance (install k6 separately)
```

CI: `.github/workflows/ci.yml`. Deploy: `docs/DEPLOYMENT.md`. Launch: `docs/LAUNCH_CHECKLIST.md`. Incidents: `docs/INCIDENT_RESPONSE.md`.

API: `docs/openapi.yaml` and `docs/postman/Sheettomate.postman_collection.json`.

Guides: `docs/USER_GUIDE.md`, `docs/ADMIN_GUIDE.md`, `docs/OWASP.md`.

See `docs/architecture.md` for schema, API, and security notes.
