# Testing

| Layer | Tool | Command |
| --- | --- | --- |
| Domain unit | node:test | `npm test -w server` |
| HTTP API | Jest + Supertest | `npm run test:api -w server` |
| Components | Vitest + Testing Library | `npm test -w client` |
| E2E | Playwright | `npm run test:e2e` |
| Load | k6 | `npm run test:k6` (requires k6 binary) |

Security regression: Origin rejection is asserted in `server/test/health.api.test.ts`. Broader checks live in `docs/OWASP.md`.
