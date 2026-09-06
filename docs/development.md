# Local development

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Start PostgreSQL: `docker compose up -d postgres` (or run the full stack with `docker compose up`).
4. From the repo root: `npm install`.
5. Generate Prisma client and migrate: `npm run db:generate` then `npm run db:migrate`.
6. Seed demo users: `npm run db:seed`.
7. Run API + Vite: `npm run dev`.

Windows (PowerShell) uses the same commands. If `docker compose` is unavailable, install Docker Desktop or point `DATABASE_URL` at a local Postgres instance.

## Environment

Never commit `.env`. Required secrets:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (32+ characters in production)
- `DATABASE_URL`
- Payment and storage keys when leaving local mode
