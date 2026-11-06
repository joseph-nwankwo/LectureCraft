# LectureSuite — Handover Document

## Project Overview

LectureSuite is an AI-powered academic content platform for university/polytechnic/college educators. Part of the UAMSATech Craft Suite ecosystem. Built from scratch as a full SaaS product across 11 phases.

**Owner:** Prevail Nwankwo (josephnwankwo56@gmail.com)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express v5, TypeScript, ts-node |
| ORM | Prisma v6 + PostgreSQL |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Real-time | Socket.IO (mounted on http.createServer, not Express directly) |
| Queue workers | BullMQ + Redis (gracefully disabled if Redis unavailable) |
| Frontend | React + Vite + Tailwind CSS + Radix UI |
| AI | OpenAI / Anthropic / Google AI (API keys in .env) |
| Payments | Stripe / Paystack / Flutterwave |

---

## Running the Project

```bash
# From the repo root — starts both servers concurrently
npm run dev
```

- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3001

If Vite uses a different port than expected, it's non-breaking — CORS is open to all origins in `development` mode.

### Individual servers

```bash
npm run dev --prefix backend    # nodemon + ts-node
npm run dev --prefix frontend   # Vite
```

### Database

```bash
npm run db:migrate --prefix backend   # apply migrations
npm run db:generate --prefix backend  # regenerate Prisma client after schema changes
npm run db:studio --prefix backend    # visual DB browser
```

---

## Environment Variables (`backend/.env`)

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:chinedu.56@localhost:5432/craftsuite
JWT_ACCESS_SECRET=craft-suite-shared-access-secret-uamsatech-platform-2026-change-in-prod
JWT_REFRESH_SECRET=craft-suite-shared-refresh-secret-uamsatech-platform-2026-change-in-prod
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3001
# AI keys (optional in dev)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
# Billing (optional in dev)
STRIPE_SECRET_KEY=
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=
BILLING_DEFAULT_PROVIDER=stripe
TRIAL_DAYS=14
```

**Important:** `DATABASE_URL` now points to the shared `craftsuite` database (previously `lecturercraft`). Both LectureSuite and ScholarCraft share this database. `JWT_ACCESS_SECRET` is the Craft Suite shared secret — the same value is set in uamsatech.com as `AUTH_JWT_SECRET` and `CRAFT_LAUNCH_SECRET`, enabling cross-product token verification.

**Redis is optional.** BullMQ workers run a TCP pre-flight (`checkRedis()`) and disable themselves gracefully if Redis isn't running. All other features work without Redis.

---

## Phases Completed (1–11)

| Phase | Feature |
|---|---|
| 1–3 | Auth, JWT, refresh tokens, email verification, password reset |
| 4 | Institutions, RBAC, roles & permissions, multi-tenant |
| 5 | Academic structure — faculties, departments, programmes, courses, sessions, semesters |
| 6 | AI Document Engine — lecture notes, lesson plans, assignments, quizzes, exams, rubrics, presentations, course outlines |
| 7 | Document Library — versioning, approval workflows, export center, sharing |
| 8 | Assessment & Question Bank — rubrics, learning outcomes, moderation |
| 9 | Analytics & Reporting — teaching analytics, assessment analytics, AI usage insights, scheduled reports |
| 10 | Billing/SaaS — Stripe/Paystack/Flutterwave, subscription plans (Free/Starter/Professional/Enterprise), invoices, payments, coupons, API keys, feature flags, usage metering |
| 11 | Real-time collaboration — Socket.IO gateway, workspaces, DM/group messaging, presence tracking, notifications (priority/category/pin/archive), activity feeds, calendar events, BullMQ workers |

---

## Key Architectural Notes

### Auth & Tokens
- `JWT_ACCESS_SECRET` (not `JWT_SECRET`) is used everywhere for access token signing
- Tokens stored in `localStorage` under keys `accessToken` and `refreshToken`
- Auth middleware augments `express.Request` directly via module augmentation — there is no exported `AuthRequest` type; controllers use `import type { Request } from 'express'`
- Controllers access `req.user!.userId` and `req.user!.institutionId!`
- LectureSuite's `User.password` field is named `password` (not `passwordHash`) — important for SSO auto-provisioning (set to `''`)

### Database / Prisma
- Prisma v6 with PostgreSQL
- Database: `craftsuite` (shared with ScholarCraft — **do not rename back to `lecturercraft`**)
- `PlanTier` enum (not `SubscriptionPlan`), `TenantStatus` (not `SubscriptionStatus`), `BillingStatus`
- User model uses `status: UserStatus` (ACTIVE / INACTIVE / SUSPENDED / PENDING_VERIFICATION) — not `isActive`
- Institution model has `isActive: Boolean` (separate from User status)
- Notification `data` field is Prisma `Json` type — requires `as never` cast when assigning `Record<string, unknown>`
- After any schema change: run `npm run db:migrate --prefix backend` then `npm run db:generate --prefix backend`
- In dev, schema changes can be pushed with: `cd backend && npx prisma db push --accept-data-loss`

### Unified Schema (Master Schema)
`backend/prisma/schema.prisma` is the **master unified schema** for the entire Craft Suite. It includes all LectureSuite educator models AND all ScholarCraft student models:

- **LectureSuite models** (phases 1–11): User, Institution, Course, Assessment, Document, Notification, Workspace, Message, etc.
- **ScholarCraft study models**: `StudySubject`, `StudyTask`, `StudySession`, `GpaSemester`, `GpaCourse`, `StudyTimetableEntry`
- **Thesis/research models**: `Thesis`, `ThesisChapter`, `ThesisCitation`, `ThesisReferenceDocument`, `ThesisReferenceChunk`
- **New enums added**: `StudyTaskPriority`, `ThesisStatus`, `ThesisChapterStatus`, `ThesisCitationType`, `ReferenceDocumentStatus`

When ScholarCraft needs new models, add them here and push to `craftsuite`. ScholarCraft's own `prisma/schema.prisma` should eventually be kept in sync or replaced with a symlink/pointer.

### Socket.IO
- Mounted on `http.createServer(app)`, not on the Express app directly
- Rooms: `user:{userId}`, `institution:{institutionId}`, `conv:{conversationId}`, `workspace:{workspaceId}`
- JWT auth middleware inside the gateway uses `env.JWT_ACCESS_SECRET`
- Rate limit: 30 messages per 10-second window per socket
- Typing indicators auto-expire after 5 seconds

### BullMQ Workers
- Both `billing.worker.ts` and `collaboration.worker.ts` use `checkRedis()` (TCP pre-flight via `net.connect`) before creating any BullMQ instances
- Workers are non-fatal — app starts normally without Redis
- `redis.on('error', ...)` in `config/redis.ts` suppresses crash from the always-on IORedis instance

### CORS
- In `development`, all origins are allowed (`origin: true`)
- In `production`, only `FRONTEND_URL` is allowed

### Error Handling
- `AppError` static methods: `.badRequest()`, `.forbidden()`, `.notFound()`, `.unauthorized()`, `.conflict()`, `.internal()`
- All controller methods wrapped with `asyncHandler`
- Error handler middleware formats all errors as `{ status: 'error', message: '...' }`

---

## SSO (Single Sign-On) from uamsatech.com

LectureSuite participates in the Craft Suite SSO flow initiated from the uamsatech.com portal.

### Flow

1. User logs into uamsatech.com portal
2. Clicks "Launch LectureCraft" → navigates to `/portal/launch/lecturercraft`
3. uamsatech.com signs a 5-minute launch token: `{ sub, email, type: "product_launch", target: "lecturercraft" }`
4. Redirects to `http://localhost:3001/api/auth/sso?token=<token>` (via LectureSuite backend)
5. LectureSuite backend (`GET /api/auth/sso`) verifies token with shared `JWT_ACCESS_SECRET`
6. Finds or creates the user (`role: LECTURER`, `password: ''`, `emailVerified: true`)
7. Issues LectureSuite access + refresh tokens
8. Redirects to `http://localhost:3001/auth/sso?at=<accessToken>&rt=<refreshToken>`
9. Frontend `SsoPage` saves tokens to localStorage and navigates to `/dashboard`

### Backend SSO endpoint
`GET /api/auth/sso` — implemented in `src/controllers/auth.controller.ts` as `ssoCallback`

Route registered in `src/routes/auth.routes.ts` **before** public routes:
```typescript
router.get('/sso', authController.ssoCallback)
```

### Frontend SSO page
`frontend/src/features/auth/pages/SsoPage.tsx`
- Reads `?at=` and `?rt=` URL params
- Saves to `localStorage` (`accessToken`, `refreshToken`)
- Clears tokens from URL with `window.history.replaceState`
- Calls `refreshUser()` to hydrate auth state, then navigates to `/dashboard`

Route registered in `frontend/src/app/router/routes.tsx`:
```typescript
{ path: ROUTES.AUTH_SSO, element: <SsoPage /> }
```
`ROUTES.AUTH_SSO = '/auth/sso'` in `frontend/src/constants/routes.ts`

---

## Frontend Structure

```
frontend/src/
  app/
    providers/AuthProvider.tsx   — auth state, login/logout, token management
    router/routes.tsx            — all route definitions (lazy-loaded)
  constants/routes.ts            — ROUTES constant object
  lib/
    api/
      client.ts                  — axios instance with auth interceptor + token refresh
      auth.api.ts                — auth API calls
    socket/socket.client.ts      — Socket.IO singleton
  hooks/
    useMessages.ts               — real-time messaging hook
  features/
    auth/                        — SignIn, SignUp, ForgotPassword, ResetPassword, SsoPage
    collaboration/               — Messages, Workspaces, Notifications, Activity, Calendar
    academic/                    — Faculties, Departments, Programmes, Courses, Sessions
    ai-engine/                   — Document generation, templates, editor
    documents/                   — Library, versioning, approvals, export
    assessment/                  — Question bank, rubrics, outcomes
    analytics/                   — Insights, reports
    billing/                     — Plans, subscriptions, invoices, payments
    settings/                    — Institution settings, user settings
  components/design-system/      — Shared UI: Alert, Button, TextField, Badge, etc.
```

---

## Bugs Fixed

### 1. Registration error message invisible
`Alert` component had no `description` prop — `<Alert description={error} />` silently discarded the text. Fixed by adding `description?: ReactNode` to `Alert.tsx`.

### 2. CORS blocking all API requests
`FRONTEND_URL=http://localhost:3000` in `.env` but Vite was serving on port 3001. Fixed by updating `.env` to `FRONTEND_URL=http://localhost:3001` and making CORS accept all origins in `development` mode.

### 3. Token key mismatch — auth broken after login
`AuthProvider` was saving the access token under `'lc_access'` but `apiClient` and `socket.client` both read from `'accessToken'`. Fixed by unifying all token keys to `'accessToken'` / `'refreshToken'`.

### 4. Socket.IO fallback URL wrong port
`socket.client.ts` fell back to `http://localhost:3000` instead of `http://localhost:4000`.

### 5. `AuthTokens` type missing `refreshToken`
Frontend type `AuthTokens { accessToken: string }` was missing `refreshToken`. Fixed.

### 6. `AuthInstitution.subscriptionPlan` mismatch
Backend sends `planTier`, frontend type said `subscriptionPlan`. Fixed to `planTier`.

---

## Known Issues / Next Steps

- **`InstitutionSettingsPage` local `Institution` type** uses `subscriptionPlan` / `subscriptionStatus` — these should be verified against what the `/institutions/me` endpoint actually returns and updated if needed.
- **Email sending** is disabled in dev (no SMTP configured) — verification emails are only logged to console. Configure `SMTP_*` vars to send real emails.
- **AI features** require API keys (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) — currently blank in `.env`.
- **Billing** requires Stripe/Paystack/Flutterwave keys — currently blank in `.env`.
- **New user status after registration** is `PENDING_VERIFICATION` — login works but email is not verified.
- **nodemon** only watches `src/**/*.ts` — changes to `.env` require a manual backend restart.
- **SSO auto-created users** have `password: ''` and cannot log in via the normal login form — they must always use the SSO flow from uamsatech.com. Consider adding a "set password" flow post-SSO.
- **COOKIE_DOMAIN** must be set to `.uamsatech.com` in production for cross-subdomain SSO to work. Currently not set.

---

## Craft Suite Context

| Product | Backend port | Frontend port | Database | Users |
|---------|-------------|--------------|----------|-------|
| uamsatech.com | — | 3000 | uamsatech (PostgreSQL) | All (platform login) |
| LectureSuite | 4000 | 3001 | craftsuite (shared) | Educators |
| ScholarCraft | 4001 | 3002 | craftsuite (shared) | Students |
| ThesisCraft | 4002 | 5173 | thesiscraft (own) | All (research) |

---

## Collaboration Routes (Phase 11)

All under `/api` with `authenticate` middleware:

| Resource | Base path |
|---|---|
| Workspaces | `/api/workspaces` |
| Conversations | `/api/conversations` |
| Messages | `/api/messages` |
| Notifications | `/api/notifications` |
| Presence | `/api/presence` |
| Activity feed | `/api/activity` |
| Calendar | `/api/calendar` |

---

## Frontend Routes (Phase 11)

| Route | Page |
|---|---|
| `/workspaces` | WorkspacesPage |
| `/workspaces/:id` | WorkspaceDashboardPage |
| `/messages` | MessagesPage |
| `/messages/:conversationId` | MessagesPage (with pane open) |
| `/notifications` | NotificationsPage |
| `/activity` | ActivityFeedPage |
| `/calendar` | CalendarPage |
