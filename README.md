# 🎯 LeadForge

AI lead-generation platform with **category-based, real-time pricing**. Users log
in, pick from **28 industry categories**, and the price adapts live as categories
are added or removed — more categories, better per-category rate.

Built with **Next.js 14**, **Prisma + PostgreSQL**, **Stripe** subscriptions, and
JWT auth with an OTP password-reset flow.

---

## Features

| Area | What's included |
|------|-----------------|
| **Auth** | Signup, login (email *or* phone), JWT (30-day), forgot-password → 6-digit OTP → reset (3-screen flow), email verification, timing-safe password compare, OTP rate limiting (3/email/hour, 10-min single-use codes) |
| **Categories** | All 28 research-backed categories across 3 ROI tiers (Ultra / High / Medium), filterable grid, search, localStorage persistence while browsing |
| **Pricing** | Live sticky pricing bar, monthly/annual toggle (20% annual discount), volume + incremental per-category discounts (capped at 40%), 4 plan tiers (Starter → Enterprise), Stripe Checkout + webhook provisioning |
| **Leads** | Dashboard with KPI strip, filter by category/status, status workflow (new → contacted → qualified → converted), lead replacement requests, CSV export, intent scoring, 50/page pagination |

---

## Project structure

```
app/                     # Next.js App Router (UI)
  layout.js              # root layout + fonts
  page.js                # auth gate → category selector → checkout
  dashboard/page.js      # lead dashboard
  globals.css            # full LeadForge design system
components/
  AuthCard.jsx           # login / signup / forgot / otp / reset
  CategorySelector.jsx   # 28-category grid + live pricing bar
  LeadDashboard.jsx      # KPI strip + lead table
  AppShell.jsx           # header / nav / logout
lib/
  categories.js          # the 28 categories + tiers
  pricing.js             # real-time pricing engine
  db.js                  # Prisma client singleton
  auth.js                # JWT sign/verify + getUserFromToken
  email.js               # transactional email (console-logs in dev)
  stripe.js              # Stripe client
  rateLimit.js           # in-memory limiter
  client.js              # browser token storage + fetch helper
pages/api/               # API routes (Pages Router)
  auth/                  # signup, login, forgot-password, reset-password, verify-email
  categories/select.js
  billing/               # create-checkout, webhook
  leads/                 # index, [id]/status, [id]/replace, export
prisma/
  schema.prisma          # users, subscriptions, user_categories, leads, lead_deliveries, password_resets
  seed.mjs               # demo user + 60 sample leads
test/
  pricing.test.mjs       # pricing engine regression tests
```

## Getting started

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL + JWT_SECRET (Stripe optional)
npm run prisma:generate
npm run prisma:migrate        # create the schema
node prisma/seed.mjs          # optional: demo data (demo@leadforge.io / demo1234)
npm run dev                   # http://localhost:3000
```

### Environment

| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | long random string |
| `STRIPE_SECRET_KEY` | no | when unset, checkout is skipped and the app routes straight to the dashboard |
| `STRIPE_WEBHOOK_SECRET` | no | required for subscription provisioning via webhook |
| `NEXT_PUBLIC_APP_URL` | no | used in emails + Stripe return URLs |
| `EMAIL_API_KEY` | no | when unset, emails (verification, OTP) are logged to the console |

## Pricing model

`calculatePrice(count, cycle)` picks a plan tier by category count, then applies a
**volume discount** (per tier) plus an **incremental discount** of 2.5% per category
beyond the tier minimum, combined and capped at **40%**. Annual billing takes a
further **20%** off. See `test/pricing.test.mjs` for the pinned outputs.

```
 1 cat  → Starter    $49/mo
 3 cats → Starter    $81/mo  (5% incremental)
 4 cats → Growth     $73/mo  (8% volume)
 8 cats → Growth     $117/mo (18%)
10 cats → Pro        $118/mo (18%)
16 cats → Enterprise $149/mo (25%)
28 cats → Enterprise $199/mo (40% cap)
```

## Deploying (auto-deploy from `main`)

The build/start scripts wire up the Prisma lifecycle so a host deploy works:

- `postinstall` → `prisma generate` (client is generated even when the host caches installs)
- `build` → `prisma generate && next build`
- `start` → `prisma migrate deploy && next start` (applies migrations on boot)

`@prisma/client` **and** the `prisma` CLI are in `dependencies` (not devDependencies)
so they survive a production install and migrations can run on the host.

**Required on the host** (set these in the platform's env settings, not a local `.env`):

| Var | Required |
|-----|----------|
| `POSTGRES_PRISMA_URL` | yes — pooled connection (runtime). Auto-injected by the Vercel + Supabase integration. |
| `POSTGRES_URL_NON_POOLING` | yes — direct connection (migrations). Auto-injected by the Vercel + Supabase integration. |
| `JWT_SECRET` | yes |
| `NEXT_PUBLIC_APP_URL` | recommended |

> On **Vercel + Supabase**, `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
> are added automatically when you link the database — you only need to add
> `JWT_SECRET` yourself. For a non-Supabase host, set both Postgres vars to your
> connection string (see `.env.example`).

After deploying, hit **`/api/health`** — it reports which env vars are missing and
whether the database is reachable and migrated. On serverless hosts (e.g. Vercel)
where `start` isn't used, run migrations in the build step or once via
`npx prisma migrate deploy` against `DATABASE_URL`.

## Tests

```bash
npm test
```
