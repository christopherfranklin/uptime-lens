# Project Research Summary

**Project:** Uptime Lens
**Domain:** Uptime monitoring micro-SaaS for indie developers
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Uptime Lens is an uptime monitoring SaaS targeting indie developers who need simple, affordable website and service monitoring -- a market ripped open by UptimeRobot's 425% price hike to $34/month. The expert approach to building this type of product is a split-deployment architecture: a Next.js 16 web dashboard hosted on Vercel for the frontend and API layer, paired with a persistent BullMQ worker process on Railway that executes scheduled health checks against user-configured targets. PostgreSQL (Neon serverless) stores both configuration and time-series check data, and the two deployable units share the database. This is the dominant pattern for modern monitoring tools that need both a responsive dashboard and a reliable background scheduler.

The recommended stack is high-confidence and well-aligned: Next.js 16, Better Auth (magic link), Drizzle ORM, Neon Postgres, BullMQ on Redis, Resend for transactional email, Stripe for billing, and shadcn/ui + Tremor for the dashboard. Every technology choice has strong ecosystem alignment and targets low operational cost, which is essential for sustaining a $5-7/month price point. The stack is mature enough that no experimental or unproven technology is required.

The dominant risks are all in the monitoring engine, not the web stack. False positive alerts from single-region monitoring, alert flapping from naive state transitions, and unbounded check-data storage are the three pitfalls that can sink the product before it gains traction. Mitigation is straightforward but must be designed in from day one: consecutive-failure confirmation before alerting, hysteresis in the state machine, and a tiered data retention strategy with rollup tables. The single most important engineering decision is the incident state machine -- getting this wrong means users receive spurious alerts, lose trust, and churn.

## Key Findings

### Recommended Stack

The stack is a modern TypeScript full-stack with a split deployment. Next.js 16 with React 19.2 handles the web layer (Turbopack default, Server Actions for mutations). Better Auth replaces the now-maintenance-mode Auth.js/NextAuth with a TypeScript-first library that includes a built-in magic link plugin. Drizzle ORM provides lightweight, type-safe database access with minimal bundle size and no codegen step -- critical for serverless cold starts on Vercel. BullMQ on Redis handles the scheduling of periodic health checks with cron-like repeatable jobs, retries, and persistence.

**Core technologies:**
- **Next.js 16 + React 19.2:** Full-stack framework with Turbopack, Server Actions, and Vercel-native deployment
- **Better Auth:** TypeScript-first auth with bundled magic link plugin; replaces Auth.js which is now maintenance-only
- **Drizzle ORM + Neon Postgres:** Lightweight ORM (7.4kb) with SQL-level control; serverless Postgres with scale-to-zero
- **BullMQ + Redis (Upstash):** Persistent job queue with cron scheduling for the check worker process
- **Resend + React Email:** Transactional email with JSX templates for magic links and alerts
- **Stripe:** Subscription billing with Smart Retries and dunning; pin API version for stability
- **Vercel + Railway:** Split deployment -- Vercel for the web app, Railway for the persistent worker
- **shadcn/ui + Tremor:** Owned UI components plus purpose-built dashboard charts (KPI cards, line charts)

### Expected Features

The feature landscape is well-defined. The v1 MVP is focused on proving that indie developers will pay for a simple, cheap uptime monitor. Aggressive simplicity IS the competitive advantage.

**Must have (table stakes):**
- HTTP(S) and TCP port monitoring with 3-minute fixed intervals
- Email alerts on state change (down/up) with retry-before-alert (2-3 consecutive failures)
- SSL certificate expiry monitoring (piggybacks on HTTPS checks, no separate monitor type)
- Dashboard with monitor list, response time charts, uptime percentages, and downtime incident log
- Magic link authentication
- Stripe subscription billing with free trial
- Monitor CRUD (add, edit, delete, pause/resume)

**Should have (competitive differentiators):**
- Dead-simple UX: fewer than 5 clicks to first monitor, setup in 60 seconds
- Aggressive pricing at $5-7/month for 20-30 monitors (market gap after UptimeRobot price hike)
- Clean, fast dashboard with no feature bloat -- loads under 1 second
- 90-day uptime timeline visualization (GitHub-style green/red bars)
- Webhook notifications (generic POST, covers Slack/Discord without native integrations)
- Weekly email digest for retention

**Defer (v2+):**
- Multi-region monitoring (3-5x infrastructure cost increase)
- Public status pages (doubles product surface area)
- Native Slack/Discord/Teams integrations (webhooks cover 80% of value at 10% effort)
- API for programmatic monitor management
- Team/multi-user accounts
- SMS/voice alerts (cost and compliance burden)

### Architecture Approach

The architecture follows a four-layer design: Presentation (dashboard), API (auth, CRUD, billing webhooks), Core Engine (scheduler, checker, incident manager, alert dispatcher), and Data (monitors, heartbeats, incidents, users, subscriptions). The critical architectural pattern is the separation of scheduling from execution -- BullMQ dispatches check jobs, workers execute them concurrently with `Promise.allSettled` and a concurrency limiter (`p-limit`). The incident manager is a state machine with three states (UP, PENDING, DOWN) that requires consecutive failures before transitioning to DOWN, preventing false positives.

**Major components:**
1. **Scheduler (BullMQ)** -- Dispatches check jobs at 3-minute intervals for all active monitors via repeatable jobs
2. **Checker (HTTP/TCP/DNS/SSL)** -- Protocol-specific probe modules that return `{ status, responseTime, error? }`; each check type is an isolated function
3. **Incident Manager** -- State machine per monitor with consecutive-failure confirmation; the trust-critical component
4. **Alert Dispatcher** -- Sends email notifications on incident creation and resolution via Resend; decoupled from check logic
5. **Dashboard API** -- Serves monitor config, check history, uptime stats to the Next.js frontend; read-heavy, cacheable
6. **Billing Integration** -- Stripe Checkout + webhooks for subscription lifecycle; enforces monitor limits per plan

### Critical Pitfalls

1. **False positives from single-region monitoring** -- ~20% of alerts are false positives without confirmation logic. Require 2-3 consecutive failures AND a delayed recheck before declaring DOWN. This must be in the initial monitoring engine, not deferred.
2. **Alert flapping** -- Services hovering near failure threshold generate rapid down/up/down/up notifications. Build hysteresis into the state machine: require N consecutive failures to alert AND N consecutive successes to send recovery. Consider minimum incident duration.
3. **Unbounded check data storage** -- 100 monitors at 3-minute intervals generate 14.4M rows/year per user. Design the schema with rollups from day one: raw data for 48 hours, hourly aggregates for 90 days, daily aggregates indefinitely.
4. **Scheduler drift under load** -- Sequential check execution causes checks to pile up when targets are slow or timing out. Use BullMQ to decouple scheduling from execution; set aggressive timeouts (10s max) on checks.
5. **Email deliverability as single point of failure** -- Email is the only alert channel in v1 AND the only auth mechanism (magic links). Set up SPF/DKIM/DMARC from day one, use Resend's delivery tracking, send a test alert during onboarding.

## Implications for Roadmap

Based on the dependency graph from architecture research and pitfall severity analysis, the following phase structure is recommended.

### Phase 1: Foundation (Database Schema + Authentication)
**Rationale:** Every component depends on user accounts and the data model. The schema must include the data retention/rollup strategy from day one (Pitfall #3). Auth must work before any authenticated feature.
**Delivers:** Working user registration/login via magic link, database schema for all entities (users, monitors, heartbeats, incidents, subscriptions), Drizzle ORM setup with Neon.
**Addresses:** Magic link auth, account management, database foundation
**Avoids:** Pitfall #3 (storage explosion) by designing aggregation tables into the initial schema; Pitfall #13 (email contention) by setting up email infrastructure with proper SPF/DKIM/DMARC

### Phase 2: Core Monitoring Engine
**Rationale:** This is the product's core value. The check execution pipeline, incident state machine, and alert dispatcher must be built and validated before the dashboard has meaning. This phase contains the highest-density pitfall zone.
**Delivers:** HTTP and TCP checkers, BullMQ scheduler with repeatable jobs, incident state machine with consecutive-failure confirmation, email alert dispatch on state change, SSL expiry detection on HTTPS checks.
**Addresses:** HTTP(S) monitoring, TCP monitoring, SSL monitoring, email alerts, retry-before-alert, downtime incident logging
**Avoids:** Pitfall #1 (false positives) via consecutive-failure threshold; Pitfall #2 (flapping) via hysteresis in state machine; Pitfall #4 (scheduler drift) via BullMQ queue decoupling; Pitfall #10 (WAF blocking) via realistic User-Agent and probe IP documentation

### Phase 3: Dashboard and Monitor Management
**Rationale:** Depends on auth (Phase 1) and check data existing (Phase 2). The dashboard is how users interact with the product. Response time charts and uptime percentages are computed from stored heartbeat data.
**Delivers:** Monitor CRUD UI, monitor list with status indicators, response time line charts (Tremor), uptime percentage display (24h/7d/30d/90d), downtime incident history view.
**Addresses:** Dashboard, response time charts, uptime percentage display, monitor CRUD, downtime incident log UI
**Avoids:** Pitfall #6 (uptime calculation complexity) by defining calculation semantics explicitly; Pitfall #11 (timezone confusion) by storing UTC and displaying in user's local timezone

### Phase 4: Billing and Plan Enforcement
**Rationale:** Must have a working product to charge for. Billing gates how many monitors a user can create. Can be deferred during a free trial period but must exist before paid launch.
**Delivers:** Stripe Checkout integration, subscription webhook handling, plan tier enforcement (monitor limits), trial period management, failed payment handling.
**Addresses:** Subscription billing, free trial, monitor limits per plan
**Avoids:** Billing/pricing cost scaling surprises by modeling per-user infrastructure cost before setting price tiers

### Phase 5: Production Hardening and Polish
**Rationale:** Everything works end-to-end. This phase adds the reliability and polish needed for a production launch: data retention jobs, error monitoring, rate limiting, onboarding flow, and the "less than 5 clicks to first monitor" UX goal.
**Delivers:** Data rollup/retention cron job, error tracking (Sentry), rate limiting on API routes, onboarding flow with test alert, security headers, responsive mobile layout.
**Addresses:** Data retention, production reliability, onboarding UX, security
**Avoids:** Pitfall #14 (not monitoring your own monitoring) by setting up external heartbeat monitoring; Pitfall #7 (email deliverability) by adding onboarding test alert flow

### Phase Ordering Rationale

- Phase 1 before Phase 2: The monitoring engine needs the database schema and user model to exist. Auth is a prerequisite for associating monitors with users.
- Phase 2 before Phase 3: The dashboard displays data produced by the monitoring engine. Building the UI first would require mock data and lead to rework when the actual data model solidifies.
- Phase 3 before Phase 4: Billing is a gate, not a feature. Users need to experience the product before deciding to pay. The dashboard is the product experience.
- Phase 4 before Phase 5: Revenue enablement must come before polish. The free trial buys time, but the billing integration must work before public launch.
- Phase 5 as final: Hardening is continuous but gets focused attention once the end-to-end flow works. Data rollups, in particular, require the check pipeline to be stable before tuning retention.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Core Monitoring Engine):** Highest pitfall density. BullMQ repeatable job configuration, incident state machine edge cases, and HTTP check timeout tuning all warrant phase-level research. The interaction between concurrent check execution and database write contention should be validated.
- **Phase 4 (Billing):** Stripe subscription lifecycle has many edge cases (proration, dunning, trial expiration, webhook replay). The Vercel + Stripe template may accelerate this, but webhook handling needs careful research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Better Auth magic link setup is well-documented. Drizzle schema definition follows established patterns. No novel decisions.
- **Phase 3 (Dashboard):** Standard Next.js App Router pages with Tremor charts. Well-documented patterns for all components.
- **Phase 5 (Hardening):** Standard production concerns with established solutions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are current stable releases with strong documentation. Better Auth replacing Auth.js is the newest decision but is well-sourced. No experimental dependencies. |
| Features | HIGH | Competitive landscape is well-mapped. The market gap after UptimeRobot's price hike is validated by multiple sources. Feature prioritization aligns with the simplicity thesis. |
| Architecture | HIGH | Split-deployment pattern (web + worker) is standard for monitoring tools. Referenced implementations include Uptime Kuma, UptimeRobot, and multiple builder post-mortems. Build order follows clear dependency logic. |
| Pitfalls | HIGH | Top pitfalls (false positives, flapping, storage explosion) are confirmed by multiple independent sources including Google SRE, Datadog, and real-world builder experiences. No speculative warnings. |

**Overall confidence:** HIGH

### Gaps to Address

- **Multi-region confirmation strategy:** Research confirms single-region is the biggest false-positive risk but the v1 scope is single-region. The gap is: what is the minimal viable confirmation strategy for v1 that does not require multi-region infrastructure? A "recheck from same region after 30-second delay" pattern needs validation during Phase 2 planning.
- **Data rollup implementation details:** The retention strategy is clear conceptually (raw 48h, hourly 90d, daily forever) but the specific PostgreSQL implementation (partitioning vs. cron job, pg_partman vs. manual, continuous aggregates vs. batch) needs research during Phase 1 schema design.
- **BullMQ repeatable jobs at scale:** BullMQ handles the scheduling, but how repeatable jobs behave when the monitor count grows (500+) and whether per-monitor repeatable jobs or batched dispatch is better needs validation during Phase 2.
- **Tremor + Next.js 16 compatibility:** Tremor was acquired by Vercel, but its compatibility with React 19.2 Server Components needs verification. Dashboard charts are client components regardless, but import patterns may need attention.
- **Neon connection pooling:** Serverless Postgres with many concurrent check-result writes from the worker process may hit connection limits. Neon's built-in connection pooler behavior under write-heavy load from BullMQ workers needs validation.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 release blog](https://nextjs.org/blog/next-16) -- Framework version, Turbopack, React 19.2
- [Better Auth docs + magic link plugin](https://better-auth.com/docs/plugins/magic-link) -- Auth library configuration
- [BullMQ official site](https://bullmq.io/) -- Job queue capabilities and API
- [Neon pricing](https://neon.com/pricing) -- Database hosting costs
- [Resend pricing and Next.js integration](https://resend.com/nextjs) -- Email service capabilities
- [Stripe npm package](https://www.npmjs.com/package/stripe) -- Billing integration
- [Google SRE Book: Distributed Periodic Scheduling](https://sre.google/sre-book/distributed-periodic-scheduling/) -- Scheduling architecture
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) -- ORM capabilities
- [shadcn/ui installation docs](https://ui.shadcn.com/docs/installation/next) -- UI component setup

### Secondary (MEDIUM confidence)
- [FlareWarden: Cross-Region Uptime Verification](https://dev.to/khrome83/how-we-built-cross-region-uptime-verification-and-why-single-location-monitoring-is-broken-24mo) -- False positive rates for single-region monitoring
- [Architecture of Uptime Monitoring Service](https://dev.to/vponamariov/how-i-built-architecture-of-uptime-monitoring-service-54h8) -- Builder experience, storage challenges
- [Uptime Kuma Architecture (DeepWiki)](https://deepwiki.com/louislam/uptime-kuma/2-architecture) -- Open-source reference implementation
- [UptimeRobot Alternatives After Price Hike](https://earezki.com/ai-news/2026-03-01-uptimerobot-alternatives-who-survived-the-2025-price-hike/) -- Market gap validation
- [Phare.io Best Practices](https://phare.io/blog/best-practices-to-configure-an-uptime-monitoring-service/) -- False positive prevention
- [Squadcast Flapping Guide](https://www.squadcast.com/blog/how-squadcast-helps-with-flapping-alerts) -- Alert flapping patterns
- [Tremor dashboard components](https://www.tremor.so/) -- Chart library capabilities
- [Drizzle vs Prisma comparison](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) -- ORM selection rationale

### Tertiary (LOW confidence)
- None. All findings are corroborated by at least two independent sources.

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
