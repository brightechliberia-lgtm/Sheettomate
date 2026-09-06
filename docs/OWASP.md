# OWASP ASVS-oriented checklist (Sheettomate)

Complete a third-party pentest before live payments. This is an internal hardening map, not a pass certificate.

| Control | Status in app | Ops still required |
| --- | --- | --- |
| TLS everywhere | Helmet HSTS in production | ACM/Cloudflare certs, no mixed content |
| CSRF | Origin check on mutating API (webhooks/inbound hooks exempt) | SameSite cookies already on refresh token |
| XSS | React default escaping; `stripHtml` on user text | CSP on API is restrictive; SPA CSP via nginx |
| SQLi | Prisma parameterized queries | No raw SQL in product code except health `SELECT 1` |
| Auth | bcrypt, JWT access, rotating httpOnly refresh | Rotate JWT secrets; lock ADMIN seed passwords |
| Session | Refresh cookie `secure` + `sameSite` in prod | |
| Rate limit | Global + auth routes; key = IP + bearer prefix | Cloudflare/WAF extra |
| Secrets | env vars | Vault/SSM; API key rotation script |
| Uploads | Multer + storage providers | Virus scan (ClamAV) recommended in prod |
| Payments | HMAC webhooks; sandbox default | Live keys only in prod env |
| Logging | Winston; no PAN | Redact tokens in log pipelines |
| Dependencies | npm ci in CI | `npm audit` / Dependabot |

Do **not** store card PANs. BanffPay/Orange remain the processors.
