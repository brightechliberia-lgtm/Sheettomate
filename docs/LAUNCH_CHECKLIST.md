# Production launch checklist

Engineering

- [ ] `npm test`, `npm run test:api -w server`, `npm run test -w client` green
- [ ] Playwright smoke (`npm run test:e2e`) against staging
- [ ] k6 against staging (`BASE_URL`, thresholds hold)
- [ ] Security review (`docs/OWASP.md`) + pentest notes filed
- [ ] TLS + HSTS verified (`NODE_ENV=production`)
- [ ] WAF + Cloudflare (or AWS WAF) enabled
- [ ] Backups running; restore drill documented
- [ ] Sentry, uptime, APM, payment-failure, AI-cost alerts live
- [ ] GitHub Environments: staging auto, production requires approval
- [ ] Rollback workflow tested on staging

Product / legal / GTM

- [ ] `PAYMENTS_MODE=live` only after gateway go-live
- [ ] Terms of Service and Privacy Policy published (`/terms`, `/privacy`)
- [ ] Analytics: PostHog and/or GA (`VITE_POSTHOG_KEY` / `VITE_GA_ID` if wired)
- [ ] Transactional email templates (verify, reset, purchase)
- [ ] Support inbox (e.g. `hello@sheettomate.com`) monitored
- [ ] Launch announcement drafts (email + social)

Launch window

- [ ] Blue-green deploy production images (same SHA as staging)
- [ ] `bash scripts/smoke.sh $PRODUCTION_URL`
- [ ] Watch Sentry + APM 60–120 minutes
- [ ] Announce only after health stays green
