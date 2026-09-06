# Architecture

Sheettomate is a npm workspaces monorepo.

```
Sheettomate/
  client/     React + Vite frontend
  server/     Express API + Prisma
  shared/     Roles, types, country lists
  docs/       Product and engineering notes
  docker/     Dev Dockerfiles
```

## Data model

Core tables (Prisma maps to snake_case columns):

- **users** — id, email, name, password_hash, role, country, phone
- **templates** — id, title, description, category, price, file_url, preview_url, created_by, is_ai_generated
- **template_downloads** — id, user_id, template_id, download_date, payment_id
- **courses** — id, title, description, level, price, instructor_id
- **course_enrollments** — id, user_id, course_id, enrollment_date, progress
- **payments** — id, user_id, amount, currency, status, gateway, transaction_id
- **ai_requests** — id, user_id, prompt, generated_template_id, status, created_at
- **refresh_tokens** — hashed rotating refresh tokens (auth, not a product table)

## API surface

| Method | Path | Auth |
| --- | --- | --- |
| POST | /api/auth/register | public |
| POST | /api/auth/login | public (rate limited) |
| POST | /api/auth/refresh | cookie |
| POST | /api/auth/logout | cookie |
| GET | /api/auth/me | JWT |
| GET | /api/templates | public |
| POST | /api/templates | CREATOR, ADMIN |
| POST | /api/templates/:id/download | JWT |
| GET | /api/courses | public |
| POST | /api/courses | ADMIN |
| POST | /api/courses/:id/enroll | LEARNER, ADMIN |
| POST | /api/payments/checkout | JWT |
| POST | /api/ai | JWT + `ai:request` |
| GET | /api/admin/users | ADMIN |

## Security

- Helmet, CORS allowlist, JSON body size limit
- Global and auth-specific rate limits
- Zod validation on inputs
- Bcrypt password hashing (cost 12)
- Short-lived access JWTs; refresh tokens hashed at rest and rotated
- Role and permission middleware
- Structured Winston logging; unhandled errors do not leak stacks in production

## Payments

`PaymentGateway`: `ORANGE_MONEY`, `MOBILE_MONEY`, `BANFFPAY_VISA`. Checkout currently records a PENDING payment and returns client instructions. Wire BanffPay / MM webhooks next using `BANFFPAY_WEBHOOK_SECRET` and provider keys from `.env`.

## File storage

`STORAGE_PROVIDER=local|cloudinary|s3`. Local writes to `LOCAL_UPLOAD_DIR`. Cloudinary upload is implemented. S3 returns a key/url stub until the AWS SDK is added.

## AI generation

`POST /api/ai` stores the prompt and creates a placeholder template (`is_ai_generated=true`). Replace the stub in `aiController.ts` with your model provider using `OPENAI_API_KEY`.
