# Technology Stack

**Project:** Uptime Lens
**Researched:** 2026-03-06
**Overall confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.x (latest stable) | Full-stack framework | Turbopack stable (2-5x faster builds), React 19.2, Server Actions for mutations, Cache Components for dashboard perf. Dominates the SaaS ecosystem with the strongest deployment story. Next.js 16 is current stable as of Oct 2025. | HIGH |
| React | 19.2 | UI library | Shipped with Next.js 16. View Transitions for navigation, Activity component for background rendering (useful for dashboard tabs), useEffectEvent for cleaner effect logic. | HIGH |
| TypeScript | 5.x | Type safety | Required by Next.js 16 (min 5.1.0). Non-negotiable for a SaaS with billing and monitoring logic. | HIGH |
| Tailwind CSS | 4.2.x | Styling | v4 rewrites the engine: 5x faster full builds, 100x faster incremental. Config moves to CSS @theme directives (no JS config file). shadcn/ui targets v4. | HIGH |

### UI Components

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | latest | Component library | Copy-paste components built on Radix UI + Tailwind CSS. Full Next.js 16 + React 19 + Tailwind v4 support confirmed. Not a dependency -- components live in your codebase, so you own them completely. | HIGH |
| Tremor | latest | Dashboard charts | Purpose-built for analytics dashboards with 35+ components: KPI cards, line/bar/area charts, data tables. Built on Recharts internally. Acquired by Vercel, so aligned with Next.js ecosystem. Perfect fit for response time charts and uptime percentages. | MEDIUM |
| React Email | latest | Email templates | JSX-based email templates that render to HTML. First-party Resend integration. Build magic link and alert emails with real components instead of raw HTML. | HIGH |

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Better Auth | 1.4.x | Authentication | Auth.js (NextAuth) team joined Better Auth in Sept 2025. Better Auth is now the recommended choice for new projects. TypeScript-first, built-in rate limiting, CSRF protection. First-party magic link plugin with configurable expiry. Works with any email provider (Resend, Nodemailer). | HIGH |
| Better Auth Magic Link Plugin | (bundled) | Passwordless auth | Plugin architecture: import from "better-auth/plugins". Sends verification links via configurable sendMagicLink callback. Default 5-min expiry. Pairs directly with Resend for delivery. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | Handles concurrent writes from check workers, supports time-series queries for response time data, scales to production SaaS loads. SQLite cannot handle concurrent writes from multiple workers. Neon provides serverless Postgres with generous free tier. | HIGH |
| Neon | (managed) | Database hosting | Serverless Postgres: scales to zero when idle, 100 CU-hours/month free, 0.5 GB storage free. Compute cost dropped 15-25% after Databricks acquisition. Perfect for micro-SaaS cost structure. Storage at $0.35/GB-month on paid plans. | HIGH |
| Drizzle ORM | 0.45.x | Database ORM | ~7.4kb minified+gzipped, zero dependencies, zero binary requirements. Code-first schemas in TypeScript (no schema language or codegen step). Up to 14x lower latency on joins vs N+1 ORMs. Faster cold starts than Prisma on serverless. SQL-level control for time-series queries. | HIGH |
| drizzle-kit | latest | Migrations | Companion CLI for schema migrations. Push-based workflow (drizzle-kit push) for dev, generate for production migrations. | HIGH |

### Background Job Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| BullMQ | latest | Job queue | Redis-backed job queue with cron scheduling, retries, rate limiting, priorities. Exactly-once semantics. Powers millions of background jobs at production companies. Successor to Bull, rewritten in TypeScript with Redis Streams. Handles the 3-minute check scheduling and email alert dispatch. | HIGH |
| Redis / Upstash Redis | latest | Queue backend | BullMQ requires Redis. Upstash provides serverless Redis with a free tier (10K commands/day). For higher volume, Railway or Render offer managed Redis at low cost. | HIGH |

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | latest SDK | Transactional email | Developer-first email API. Free tier: 3,000 emails/month (100/day). First-class Next.js integration via Server Actions. Webhook events for delivery tracking. Pro plan at $20/month for 50K emails if needed. | HIGH |
| React Email | latest | Email templates | Build magic link emails and downtime alert emails as React components. Renders to cross-client HTML. Co-created by Resend team, so the integration is seamless. | HIGH |

### Payments

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Stripe | npm v20.x, API 2026-02-25 | Subscription billing | Industry standard for SaaS billing. Checkout mode=subscription handles trial periods, failed payment retries (Smart Retries), dunning emails, proration. Pin API version for stability. Vercel provides an official Next.js + Stripe subscription template. | HIGH |
| @stripe/stripe-js | latest | Client-side Stripe | Stripe Elements for payment forms. Loads Stripe.js from CDN. | HIGH |

### Deployment & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | (platform) | Frontend + API hosting | Native Next.js 16 support (same company). Free tier generous for side projects. Serverless functions for API routes. Edge functions available. Automatic preview deployments. | HIGH |
| Railway | (platform) | Worker process hosting | Container-based deployment for the background check worker. Usage-based pricing ($5/month minimum). Managed Redis and PostgreSQL available. A typical micro-SaaS worker runs $8-15/month. Vercel cannot run long-lived worker processes. | HIGH |

### Development Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Biome | latest | Linting + formatting | Next.js 16 removed `next lint`. Biome replaces ESLint + Prettier in a single tool. 25-100x faster than ESLint. | MEDIUM |
| Turbopack | (bundled) | Bundler | Default in Next.js 16. Up to 10x faster Fast Refresh, 2-5x faster production builds vs webpack. No config needed. | HIGH |

### Monitoring (Self-monitoring)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Sentry | latest | Error tracking | Catch runtime errors in the dashboard and worker. Free tier covers a micro-SaaS. First-class Next.js SDK. | MEDIUM |

## Architecture Decision: Split Deployment

The most critical architectural decision is **splitting the app into two deployable units**:

1. **Web app (Vercel):** Next.js dashboard, API routes, auth, billing webhooks
2. **Worker process (Railway):** BullMQ worker that runs uptime checks on cron, writes results to Postgres, dispatches alert emails via Resend

**Why split?** Vercel runs serverless functions with execution time limits (10s on free, 60s on Pro). Uptime checks need a persistent process that runs on a schedule. A BullMQ worker on Railway solves this cleanly: it reads the monitor list from Postgres, runs checks every 3 minutes via BullMQ's repeatable jobs, and writes results back to Postgres. The Next.js app reads the same database for the dashboard.

**Why not a single server?** You lose Vercel's CDN, preview deployments, and zero-config Next.js hosting. The split costs roughly the same ($0 Vercel free + $8-15 Railway) as a single Railway deployment but gives you better frontend performance and simpler Next.js upgrades.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix, SvelteKit | Next.js has the strongest SaaS ecosystem (auth libs, Stripe templates, Vercel hosting). Remix and SvelteKit are good but have smaller ecosystems for SaaS. |
| Auth | Better Auth | Auth.js/NextAuth v5 | Auth.js team joined Better Auth. Auth.js is in maintenance mode (security patches only). Better Auth is the recommended path forward for new projects. |
| Auth | Better Auth | Clerk, Auth0 | Third-party auth adds cost ($25+/month at scale) and vendor lock-in. Better Auth is self-hosted, free, and gives full control over the user table. For a micro-SaaS optimizing costs, own your auth. |
| ORM | Drizzle | Prisma | Prisma 7 improved perf but still larger bundle, requires codegen step, and has a separate schema language. Drizzle is lighter, faster on serverless, and schemas are just TypeScript. |
| Database | Neon Postgres | Supabase, PlanetScale | Neon is pure Postgres (no proprietary extensions to learn). Supabase bundles too much (auth, storage, realtime) when we only need the database. PlanetScale dropped their free tier. |
| Database | PostgreSQL | SQLite | SQLite cannot handle concurrent writes from multiple check workers. No network access (can't share between Vercel and Railway). Not suitable for multi-tenant SaaS. |
| Job Queue | BullMQ | node-cron, Agenda | node-cron runs in-process with no persistence or retry logic -- if the process crashes, scheduled jobs are lost. Agenda requires MongoDB. BullMQ provides persistence, retries, rate limiting, and cron scheduling via Redis. |
| Charts | Tremor | Recharts, Chart.js | Tremor is built on Recharts but provides dashboard-ready components (KPI cards, stat displays) out of the box. Less code to write for a monitoring dashboard. |
| Email | Resend | SendGrid, AWS SES | Resend has the best DX for Next.js (React Email integration, Server Actions support). SendGrid is older and heavier. SES requires AWS account setup. Resend free tier (3K/month) is sufficient for early stage. |
| Hosting | Vercel + Railway | Railway only, Fly.io | Railway-only works but loses Vercel's Next.js optimizations (Edge, ISR, preview deploys). Fly.io has lower costs but higher operational overhead (Dockerfile management, no managed Redis on free tier). |
| Styling | Tailwind + shadcn/ui | Material UI, Chakra UI | Tailwind v4 is faster and more flexible. shadcn/ui components are owned (not a dependency), composable, and designed for Tailwind. MUI and Chakra add bundle weight and have less alignment with the Next.js ecosystem. |

## Installation

```bash
# Core framework
npx create-next-app@latest uptime-lens --typescript --tailwind --app

# Database (ORM + driver)
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Authentication
npm install better-auth

# Job queue
npm install bullmq ioredis

# Email
npm install resend react-email @react-email/components

# Payments
npm install stripe
npm install @stripe/stripe-js

# UI components (shadcn CLI adds individual components)
npx shadcn@latest init

# Charts (dashboard)
npm install @tremor/react

# Dev dependencies
npm install -D @biomejs/biome
```

## Key Version Pinning Notes

- **Stripe API:** Pin to `2026-02-25.clover` in both dashboard settings and SDK initialization. Do not auto-upgrade.
- **Next.js:** Use 16.x stable. Turbopack is the default bundler; no webpack config needed.
- **Drizzle ORM:** Currently 0.45.x. Pre-1.0 but production-stable and widely adopted. Beta v1 is in progress.
- **Better Auth:** 1.4.x. Actively developed with frequent releases. Magic link plugin is bundled.
- **Tailwind CSS:** 4.2.x. Major breaking changes from v3 (CSS-based config, no tailwind.config.js). Use the v4 migration guide if referencing v3 examples.

## Sources

- [Next.js 16 release blog](https://nextjs.org/blog/next-16) - HIGH confidence
- [Auth.js joins Better Auth](https://better-auth.com/blog/authjs-joins-better-auth) - HIGH confidence
- [Better Auth magic link plugin docs](https://better-auth.com/docs/plugins/magic-link) - HIGH confidence
- [Better Auth vs NextAuth comparison](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/) - MEDIUM confidence
- [Drizzle vs Prisma 2026 comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) - MEDIUM confidence
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) - HIGH confidence
- [Neon pricing](https://neon.com/pricing) - HIGH confidence
- [Neon pricing breakdown](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/) - MEDIUM confidence
- [BullMQ official site](https://bullmq.io/) - HIGH confidence
- [BullMQ + Redis job queue guide](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - MEDIUM confidence
- [Resend pricing](https://resend.com/pricing) - HIGH confidence
- [Resend Next.js integration](https://resend.com/nextjs) - HIGH confidence
- [Stripe npm package](https://www.npmjs.com/package/stripe) - HIGH confidence
- [Stripe + Next.js guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) - MEDIUM confidence
- [Vercel vs Railway comparison](https://designrevision.com/blog/vercel-vs-railway) - MEDIUM confidence
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) - HIGH confidence
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) - HIGH confidence
- [Tremor dashboard components](https://www.tremor.so/) - MEDIUM confidence
- [Node.js schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) - MEDIUM confidence
