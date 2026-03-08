# Roadmap: Uptime Lens

## Overview

Uptime Lens goes from empty repo to production SaaS in 8 phases. The build starts with project scaffolding and database schema (designed with data retention from day one), then layers on authentication, monitor CRUD, the background check engine, incident detection with alerting, a dashboard to visualize it all, Stripe billing to monetize it, and finally production hardening for launch readiness. Each phase delivers a coherent, testable capability that builds on the last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Foundation** - Scaffold Next.js app, design database schema with rollup strategy, set up dev environment and email infrastructure
- [x] **Phase 2: Authentication** - Magic link login, persistent sessions, logout, and email change (completed 2026-03-07)
- [ ] **Phase 3: Monitor Management** - CRUD interface for creating, editing, deleting, and pausing monitors
- [ ] **Phase 4: Check Engine** - Background worker that executes HTTP, TCP, and SSL checks on a 3-minute schedule with retry logic
- [ ] **Phase 5: Incident Detection and Alerting** - State machine for incident lifecycle plus email notifications on downtime, recovery, SSL expiry, and weekly digest
- [ ] **Phase 6: Dashboard** - Monitor list with status, response time charts, uptime percentages, and incident history
- [ ] **Phase 7: Billing and Plan Enforcement** - Free trial, Stripe subscription, monitor limits per plan, and failed payment handling
- [ ] **Phase 8: Production Hardening** - Data retention jobs, error monitoring, rate limiting, security headers, and onboarding polish

## Phase Details

### Phase 1: Project Foundation
**Goal**: A running Next.js 16 application with complete database schema (including rollup tables), Resend email infrastructure, marketing landing page, and full deployment across Vercel + Railway + Neon -- ready for feature work
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure phase -- enables all subsequent requirements)
**Success Criteria** (what must be TRUE):
  1. Next.js application starts locally with Turbopack and connects to a development Neon Postgres database
  2. All database tables exist (users, monitors, heartbeats, hourly/daily rollup tables, incidents, subscriptions) with proper indexes and foreign keys
  3. Drizzle ORM is configured with typed schema and migrations run successfully
  4. Resend email sending works (verified with a test send) with SPF/DKIM/DMARC configured on the sending domain
**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Scaffold Next.js 16 app, install dependencies, configure tooling, define complete Drizzle database schema
- [x] 01-02-PLAN.md -- Build marketing landing page with Stripe-inspired design, set up Resend email infrastructure
- [x] 01-03-PLAN.md -- Deploy to Vercel + Railway + Neon, create worker scaffold, verify full stack

### Phase 2: Authentication
**Goal**: Users can create accounts and securely access the application via passwordless magic link email
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can enter their email and receive a magic link that logs them in on click
  2. User's session survives browser refresh without requiring re-login
  3. User can log out from any page in the application and is redirected to the landing page
  4. User can change their account email address (with verification of the new email)
**Plans:** 2/2 plans complete

Plans:
- [ ] 02-01-PLAN.md -- Install Better Auth, extend schema with auth tables, configure auth server/client, create API route and email templates
- [ ] 02-02-PLAN.md -- Build login page, route protection, dashboard shell, settings page with email change and logout

### Phase 3: Monitor Management
**Goal**: Users can manage a set of monitors for their sites and services through a complete CRUD interface
**Depends on**: Phase 2
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):
  1. User can create a new monitor by specifying a name, URL or host, and check type (HTTP, TCP, or SSL)
  2. User can edit any existing monitor's name, expected status code, timeout, and check interval
  3. User can delete a monitor and all its associated data
  4. User can pause a monitor (stops checks) and resume it (restarts checks)
**Plans:** 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Create monitor CRUD server actions with tests, update dashboard page to fetch monitors
- [ ] 03-02-PLAN.md -- Build monitor list UI, slide-out create/edit panel, delete dialog, and wire to server actions

### Phase 4: Check Engine
**Goal**: Monitors are automatically checked in the background every 3 minutes with protocol-specific probes and intelligent retry before failure declaration
**Depends on**: Phase 3
**Requirements**: MON-05, MON-06, CHK-01, CHK-02, CHK-03
**Success Criteria** (what must be TRUE):
  1. An active HTTP monitor is checked every 3 minutes and the result (status code, response time, error) is stored
  2. An active TCP monitor is checked every 3 minutes for port connectivity and the result is stored
  3. HTTPS monitors have their SSL certificate expiry date extracted and stored with each check
  4. A single check failure does not mark a monitor as down -- 2-3 consecutive failures are required before the monitor is considered failed
  5. Check results are queryable by monitor and time range for downstream dashboard consumption
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Incident Detection and Alerting
**Goal**: Users are notified by email when their monitors go down, recover, or have expiring SSL certificates, and receive a weekly summary of uptime health
**Depends on**: Phase 4
**Requirements**: MON-07, ALR-01, ALR-02, ALR-03
**Success Criteria** (what must be TRUE):
  1. User receives an email within minutes when a monitor transitions from up to down (after consecutive failure confirmation)
  2. User receives an email when a monitor recovers, including how long it was down
  3. User receives email alerts when an SSL certificate is approaching expiry at 30, 14, 7, and 1 day thresholds
  4. User receives a weekly email digest summarizing uptime percentages and notable incidents across all monitors
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Dashboard
**Goal**: Users can see the health of all their monitors at a glance and drill into detailed response time, uptime, and incident data
**Depends on**: Phase 4 (needs check data), Phase 2 (needs auth)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. User sees a list of all monitors showing current status (up, down, or paused) and latest response time
  2. User can view response time line charts for any monitor across 24-hour, 7-day, 30-day, and 90-day windows
  3. User can see uptime percentage for any monitor across 24-hour, 7-day, 30-day, and 90-day windows
  4. User can view a chronological log of downtime incidents for any monitor with start time, end time, and duration
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Billing and Plan Enforcement
**Goal**: Users can start with a free trial and transition to a paid subscription, with monitor creation gated by plan limits
**Depends on**: Phase 3 (needs monitor creation to enforce limits), Phase 6 (product must be usable before charging)
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04
**Success Criteria** (what must be TRUE):
  1. New user can start a free trial immediately after signup without entering payment information
  2. User can subscribe to a paid plan through Stripe Checkout and their subscription status is reflected in the app
  3. User is prevented from creating monitors beyond their plan's limit, with a clear upgrade prompt
  4. When a payment fails, the user is notified and given a grace period before monitors are paused
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Production Hardening
**Goal**: The application is reliable, secure, and polished enough for public launch with real users and real money
**Depends on**: Phases 1-7
**Requirements**: None (cross-cutting production concerns -- quality phase, not feature phase)
**Success Criteria** (what must be TRUE):
  1. Check data older than 48 hours is automatically rolled up to hourly aggregates, and data older than 90 days is rolled up to daily aggregates
  2. Application errors are captured and reported via error tracking (Sentry or equivalent)
  3. API routes are rate-limited to prevent abuse
  4. New user can go from signup to first monitor in under 5 clicks, including a test alert to verify email delivery works
  5. Application serves proper security headers and all pages are responsive on mobile viewports
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 3/3 | Complete | 2026-03-07 |
| 2. Authentication | 2/2 | Complete   | 2026-03-07 |
| 3. Monitor Management | 0/2 | In progress | - |
| 4. Check Engine | 0/0 | Not started | - |
| 5. Incident Detection and Alerting | 0/0 | Not started | - |
| 6. Dashboard | 0/0 | Not started | - |
| 7. Billing and Plan Enforcement | 0/0 | Not started | - |
| 8. Production Hardening | 0/0 | Not started | - |
