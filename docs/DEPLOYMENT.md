# LectureSuite — Deployment Guide

## What's already done in code

| Item | Status |
|------|--------|
| Backend Dockerfile (multi-stage, non-root) | ✅ |
| `backend/scripts/start.sh` — auto-runs Prisma migrations on deploy | ✅ |
| `backend/railway.toml` — Railway deploy config | ✅ |
| `frontend/vercel.json` — Vercel SPA config | ✅ |
| `backend/.env.production.template` — every env var documented | ✅ |
| CI: all required env vars present | ✅ |
| DB naming fixed to `craftsuite` everywhere | ✅ |
| P0-03 migration script (`backend/scripts/rename-product-identifiers.sql`) | ✅ |

---

## Step 1 — External accounts you need to create

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Railway](https://railway.app) | Backend hosting (Node + PostgreSQL + Redis) | $5 credit/month |
| [Vercel](https://vercel.com) | Frontend hosting | Free |
| [SendGrid](https://sendgrid.com) OR [Resend](https://resend.com) | Transactional email | 100/day free (SG) · 3k/mo free (Resend) |
| [Stripe](https://stripe.com) | Payments | Free until you charge |
| [AWS S3](https://aws.amazon.com/s3/) OR [Cloudflare R2](https://developers.cloudflare.com/r2/) | File uploads | R2 is cheaper (no egress fees) |
| [Sentry](https://sentry.io) | Error tracking | Free tier |

---

## Step 2 — Generate & save production secrets

Run once on any machine with Node installed:

```bash
node -e "
const c = require('crypto');
const gen = () => c.randomBytes(48).toString('base64url');
console.log('JWT_ACCESS_SECRET=' + gen());
console.log('JWT_REFRESH_SECRET=' + gen());
console.log('COOKIE_SECRET=' + gen());
console.log('CRAFT_LAUNCH_SECRET=' + gen());   // SAME value in all three apps
console.log('CENTRAL_ENTITLEMENT_SERVICE_SECRET=' + gen());
"
```

**CRAFT_LAUNCH_SECRET must be identical in LectureSuite backend, ScholarSuite backend,
and the uamsatech portal. All other secrets are unique per product.**

Save these in a password manager immediately — they cannot be recovered later.

---

## Step 3 — Railway (LectureSuite backend)

1. Go to railway.app → New Project → Deploy from GitHub repo → select `LectureCraft`
2. Railway auto-detects `backend/railway.toml` and the `Dockerfile`
3. Add a **PostgreSQL** plugin: Railway provisions it and sets `DATABASE_URL` automatically
4. Add a **Redis** plugin: sets `REDIS_URL` automatically
5. Under Variables, add every var from `backend/.env.production.template`:

```
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://lecturesuite.uamsatech.com
APP_URL=https://api.lecturesuite.uamsatech.com
JWT_ACCESS_SECRET=<your generated value>
JWT_REFRESH_SECRET=<your generated value>
COOKIE_SECRET=<your generated value>
COOKIE_DOMAIN=.uamsatech.com
CRAFT_LAUNCH_SECRET=<shared value — same in all apps>
CENTRAL_ENTITLEMENT_URL=https://uamsatech.com/api/internal/entitlements/verify
CENTRAL_ENTITLEMENT_SERVICE_SECRET=<your generated value>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.<your sendgrid key>
SMTP_FROM=LectureSuite <noreply@uamsatech.com>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=lecturesuite-prod-uploads
SENTRY_DSN=https://...
OPENAI_API_KEY=sk-...        # or ANTHROPIC_API_KEY
```

6. Railway sets the custom domain under Settings → Networking → Add Domain
   → set it to `api.lecturesuite.uamsatech.com`
7. First deploy runs `start.sh` → `prisma migrate deploy` → server starts
8. Health check: `GET https://api.lecturesuite.uamsatech.com/health` → `{"status":"ok"}`

---

## Step 4 — Vercel (LectureSuite frontend)

1. vercel.com → New Project → Import `LectureCraft` repo
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected via `vercel.json`)
4. Environment variables:
```
VITE_API_URL=https://api.lecturesuite.uamsatech.com/api
VITE_APP_NAME=LectureSuite
```
5. Add custom domain `lecturesuite.uamsatech.com` under Project → Domains

---

## Step 5 — Vercel (uamsatech portal)

1. vercel.com → New Project → Import `uamsatech` repo
2. Root directory: `.` (repo root — it's a Next.js app)
3. Framework: **Next.js** (auto-detected)
4. Environment variables:
```
DATABASE_URL=<same Railway PostgreSQL URL>
NEXTAUTH_SECRET=<generate a new one>
NEXTAUTH_URL=https://uamsatech.com
CRAFT_LAUNCH_SECRET=<shared value>
CENTRAL_ENTITLEMENT_SERVICE_SECRET=<same as backend>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_SECRET_KEY=sk_live_...   # if using Paystack
```
5. Add domains: `uamsatech.com` and `www.uamsatech.com`

---

## Step 6 — DNS (Cloudflare recommended)

After Vercel and Railway give you their URLs:

| Record | Type | Value |
|--------|------|-------|
| `uamsatech.com` | CNAME | `cname.vercel-dns.com` |
| `www` | CNAME | `cname.vercel-dns.com` |
| `lecturesuite` | CNAME | `cname.vercel-dns.com` |
| `api.lecturesuite` | CNAME | `<your-railway-service>.railway.app` |

---

## Step 7 — Run P0-03 DB migration (one-time)

After the first Railway deploy, run this once against the production DB:

```bash
# Option A — from your local machine (needs DATABASE_URL in env)
DATABASE_URL="postgresql://..." npx prisma db execute \
  --file backend/scripts/rename-product-identifiers.sql \
  --schema backend/prisma/schema.prisma

# Option B — Railway CLI
railway run --service lecturesuite-backend \
  npx prisma db execute --file scripts/rename-product-identifiers.sql \
  --schema prisma/schema.prisma
```

Expected output: 0 rows returned (means old identifiers are gone).

---

## Step 8 — GitHub Actions secrets

Add these in each repo → Settings → Secrets and variables → Actions:

| Secret | Used by |
|--------|---------|
| `CODECOV_TOKEN` | Coverage upload in CI |
| `STAGING_HOST` | deploy.yml SSH target |
| `STAGING_USER` | deploy.yml SSH user |
| `STAGING_SSH_KEY` | deploy.yml private key |

Railway and Vercel deploy automatically on push to `main` — no manual deploy step needed once connected.

---

## Stripe webhook setup

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://api.lecturesuite.uamsatech.com/api/billing/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in Railway

---

## Smoke-test checklist after deploy

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Portal home page loads at `uamsatech.com`
- [ ] LectureSuite frontend loads at `lecturesuite.uamsatech.com`
- [ ] Sign up creates a user + sends verification email
- [ ] Launch from portal → redirected to LectureSuite with JWT in URL → auto logged in
- [ ] Stripe checkout completes a test payment (`4242 4242 4242 4242`)
