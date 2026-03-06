# Architecture Research

**Domain:** Uptime monitoring micro-SaaS
**Researched:** 2026-03-06
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Web Dashboard (SPA or SSR)                       │  │
│  │  Status List / Response Time Charts / Uptime Percentages     │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
├─────────────────────────────┼───────────────────────────────────────┤
│                       API LAYER                                     │
│  ┌────────────┐  ┌──────────┴──────┐  ┌────────────────────────┐   │
│  │ Auth API   │  │  Monitor CRUD   │  │  Billing/Subscription  │   │
│  │ (magic     │  │  API            │  │  API                   │   │
│  │  link)     │  │                 │  │                        │   │
│  └────────────┘  └─────────────────┘  └────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                       CORE ENGINE                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Scheduler   │  │  Checker     │  │  Incident Manager        │  │
│  │  (tick/cron) │──│  (HTTP/TCP/  │──│  (state machine:         │  │
│  │              │  │   DNS/SSL)   │  │   UP -> DOWN -> RESOLVED)│  │
│  └──────────────┘  └──────────────┘  └────────────┬─────────────┘  │
│                                                    │                │
│  ┌──────────────────────────────────────────────────┴────────────┐  │
│  │                    Alert Dispatcher                           │  │
│  │                    (email for v1)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                       DATA LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Monitors    │  │  Heartbeats  │  │  Incidents / Alerts      │  │
│  │  (config)    │  │  (raw checks │  │  (state, timestamps,     │  │
│  │              │  │   + rollups) │  │   notifications sent)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │  Users       │  │  Subscriptions│                               │
│  │  (accounts)  │  │  (billing)   │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Scheduler** | Triggers checks at regular intervals (every 3 min) for all active monitors | Cron-based timer or queue-based job dispatcher. For <1K monitors, a simple `setInterval`/cron loop is sufficient. At scale, a queue (BullMQ + Redis) distributes work across workers. |
| **Checker** | Executes the actual probe against a target (HTTP request, TCP connect, DNS lookup, SSL certificate read) | Protocol-specific modules. Each check type is a function that takes target config and returns `{ status, responseTime, error? }`. |
| **Incident Manager** | Tracks monitor state transitions (UP/DOWN/PENDING), applies confirmation logic (consecutive failures before declaring DOWN), records incidents | State machine per monitor. Requires consecutive failure count (2-3 failures) before transitioning UP -> DOWN to prevent false positives. |
| **Alert Dispatcher** | Sends notifications when incidents are created or resolved | Email service integration (e.g., Resend, SES, Postmark). Triggered by incident state changes, not raw check results. |
| **Dashboard API** | Serves monitor config, check history, uptime stats, response time data to frontend | REST or tRPC endpoints. Computes uptime percentages and serves time-series data for charts. |
| **Auth** | Passwordless magic link authentication | Generates token, emails link, validates on click, issues session/JWT. |
| **Billing** | Manages subscription lifecycle, enforces plan limits | Stripe integration for subscriptions, webhooks for lifecycle events. |

## Recommended Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/             # Auth routes (login, verify)
│   ├── (dashboard)/        # Authenticated dashboard routes
│   │   ├── monitors/       # Monitor CRUD pages
│   │   ├── incidents/      # Incident history
│   │   └── settings/       # Account & billing
│   └── api/                # API routes
│       ├── auth/           # Magic link endpoints
│       ├── monitors/       # Monitor CRUD
│       ├── webhooks/       # Stripe webhooks
│       └── cron/           # Cron trigger endpoint
├── lib/
│   ├── checks/             # Protocol-specific check implementations
│   │   ├── http.ts         # HTTP/HTTPS checker
│   │   ├── tcp.ts          # TCP port checker
│   │   ├── dns.ts          # DNS resolution checker
│   │   └── ssl.ts          # SSL certificate expiry checker
│   ├── engine/             # Core monitoring engine
│   │   ├── scheduler.ts    # Dispatches checks on interval
│   │   ├── incident.ts     # Incident state machine
│   │   └── alerter.ts      # Notification dispatch
│   ├── db/                 # Database layer
│   │   ├── schema.ts       # Drizzle/Prisma schema
│   │   ├── queries.ts      # Common query functions
│   │   └── migrations/     # Database migrations
│   ├── auth/               # Authentication logic
│   ├── billing/            # Stripe integration
│   └── email/              # Email sending (alerts + auth)
├── components/             # React UI components
│   ├── monitors/           # Monitor-specific components
│   ├── charts/             # Response time charts
│   └── layout/             # Shell, nav, etc.
└── types/                  # Shared TypeScript types
```

### Structure Rationale

- **`lib/checks/`:** Each protocol checker is isolated. Adding a new check type means adding one file. Clean separation from scheduling logic.
- **`lib/engine/`:** The scheduler, incident manager, and alerter are the "brain" of the app. They are pure business logic, not tied to HTTP or UI concerns.
- **`app/api/cron/`:** The scheduler is triggered externally (e.g., Vercel Cron, Railway cron) via an HTTP endpoint, keeping the app stateless. This is the dominant pattern for serverless deployments.
- **`lib/db/`:** Single source of truth for schema and queries. All components access data through this layer.

## Architectural Patterns

### Pattern 1: Externally-Triggered Scheduler (Cron-to-HTTP)

**What:** Instead of running a persistent process with timers, the scheduler is triggered by an external cron service (Vercel Cron, Railway, or a simple OS cron) that hits an API endpoint every N minutes.

**When to use:** Serverless or platform-hosted deployments where you cannot run persistent background processes.

**Trade-offs:**
- Pro: Stateless, scales with platform, no process management
- Pro: Natural fit for Vercel/Railway/Render deployment
- Con: Minimum granularity is 1 minute (sufficient for 3-minute checks)
- Con: Cold starts may add latency (acceptable since checks are background work)

**Example:**
```typescript
// app/api/cron/check/route.ts
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch all monitors due for checking
  const monitors = await db.getMonitorsDueForCheck();

  // Execute checks concurrently (with concurrency limit)
  const results = await Promise.allSettled(
    monitors.map(monitor => executeCheck(monitor))
  );

  // Process results: update state, trigger alerts
  for (const [i, result] of results.entries()) {
    await processCheckResult(monitors[i], result);
  }

  return Response.json({ checked: monitors.length });
}
```

### Pattern 2: Incident State Machine with Confirmation

**What:** Monitors maintain state (UP, DOWN, PENDING) and require consecutive failures before transitioning to DOWN. This prevents false-positive alerts from transient network glitches.

**When to use:** Always. This is not optional -- without confirmation logic, users will receive spurious alerts and lose trust in the product.

**Trade-offs:**
- Pro: Dramatically reduces false positives
- Pro: Simple to implement (counter per monitor)
- Con: Adds detection latency (2-3 check intervals before alert)
- Con: Requires storing "consecutive failure count" per monitor

**Example:**
```typescript
// lib/engine/incident.ts
interface MonitorState {
  status: "up" | "down" | "pending";
  consecutiveFailures: number;
  currentIncidentId: string | null;
}

const FAILURE_THRESHOLD = 2; // Require 2 consecutive failures

function processCheckResult(
  state: MonitorState,
  checkResult: CheckResult
): { newState: MonitorState; action?: "create_incident" | "resolve_incident" } {
  if (checkResult.success) {
    if (state.status === "down") {
      return {
        newState: { status: "up", consecutiveFailures: 0, currentIncidentId: null },
        action: "resolve_incident",
      };
    }
    return {
      newState: { status: "up", consecutiveFailures: 0, currentIncidentId: state.currentIncidentId },
    };
  }

  // Check failed
  const failures = state.consecutiveFailures + 1;
  if (failures >= FAILURE_THRESHOLD && state.status !== "down") {
    return {
      newState: { status: "down", consecutiveFailures: failures, currentIncidentId: null },
      action: "create_incident",
    };
  }

  return {
    newState: {
      status: failures >= FAILURE_THRESHOLD ? "down" : "pending",
      consecutiveFailures: failures,
      currentIncidentId: state.currentIncidentId,
    },
  };
}
```

### Pattern 3: Tiered Data Retention with Rollups

**What:** Store raw check results for a short period (7-30 days), then aggregate into hourly/daily rollups for long-term storage. This keeps the database small and queries fast.

**When to use:** Once data volume grows beyond a few thousand monitors. For v1 with a small user base, simple raw storage is fine, but design the schema to support rollups later.

**Trade-offs:**
- Pro: Keeps database small (raw data is the biggest table by far)
- Pro: Historical queries remain fast (pre-computed aggregates)
- Con: Adds complexity (rollup jobs, separate tables)
- Con: Loses raw granularity for old data

## Data Flow

### Check Execution Flow

```
External Cron (every 3 min)
    │
    ▼
[Cron API Endpoint]
    │  Verify auth, fetch monitors due for check
    ▼
[Scheduler] ──── for each monitor ────┐
    │                                  │
    ▼                                  ▼
[Checker]                          [Checker]
    │  HTTP/TCP/DNS/SSL probe          │
    ▼                                  ▼
[Check Result]                     [Check Result]
    │  { status, responseTime,         │
    │    statusCode, error? }          │
    ▼                                  ▼
[Incident Manager] ◄──────────────────┘
    │  Compare with previous state
    │  Apply confirmation logic
    │
    ├── status unchanged ──► [Store Heartbeat] ──► DB
    │
    ├── UP → DOWN confirmed ──► [Create Incident] ──► DB
    │                               │
    │                               ▼
    │                          [Alert Dispatcher]
    │                               │
    │                               ▼
    │                          [Send Email]
    │
    └── DOWN → UP ──► [Resolve Incident] ──► DB
                          │
                          ▼
                     [Alert Dispatcher]
                          │
                          ▼
                     [Send Recovery Email]
```

### Dashboard Data Flow

```
[User Browser]
    │
    ▼
[Dashboard Page] ──── SSR or API call ────┐
    │                                      │
    │                                      ▼
    │                               [API Routes]
    │                                      │
    │                                      ▼
    │                               [DB Queries]
    │                                      │
    │  ┌───────────────────────────────────┘
    │  │
    ▼  ▼
[Render]
  ├── Monitor list with current status (UP/DOWN badge)
  ├── Response time chart (last 24h from heartbeats table)
  ├── Uptime percentage (computed: successful / total checks)
  └── Incident history (from incidents table)
```

### Key Data Flows

1. **Check-to-Alert flow:** Cron triggers checks -> results stored as heartbeats -> incident manager evaluates state -> alert dispatcher sends email if state changed. This is the critical path -- must complete within the check interval (3 min).

2. **Dashboard query flow:** User requests dashboard -> API queries monitors + latest heartbeats + computed uptime stats -> renders charts. This is read-heavy and can be optimized with caching or materialized views.

3. **Auth flow:** User enters email -> server generates magic link token, stores in DB, sends email -> user clicks link -> server validates token, issues session cookie -> user is authenticated.

4. **Billing flow:** User selects plan -> Stripe Checkout session created -> user completes payment on Stripe -> Stripe sends webhook -> server updates subscription status -> monitor limits enforced based on plan.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 monitors | Monolith is fine. Single cron endpoint checks all monitors sequentially or with `Promise.allSettled`. Heartbeats table with basic indexes. Response under 3 min check interval easily. |
| 500-5K monitors | Add concurrency limits to checker (batch 50 at a time). Consider a simple queue (pg-boss or BullMQ) to distribute checks. Add database indexes on `(monitor_id, created_at)`. May need to split cron into per-batch invocations. |
| 5K-50K monitors | Queue-based architecture is necessary. Multiple workers processing check jobs. Implement data rollups to keep heartbeats table manageable. Add read replicas or caching layer for dashboard queries. |
| 50K+ monitors | Distributed checking nodes across regions. Sharding by tenant/monitor. Dedicated time-series storage. This is well beyond v1 scope. |

### Scaling Priorities

1. **First bottleneck: Check execution time exceeding the interval.** If 500 monitors each take 5s to check, that is 2500s sequentially -- far exceeding 3 minutes. Solution: parallel execution with concurrency limits (`Promise.allSettled` with p-limit). At 50 concurrent checks, 500 monitors complete in ~50s.

2. **Second bottleneck: Heartbeats table size.** At 500 monitors checked every 3 min, that is 240K rows/day, 7.2M rows/month. Without rollups, queries slow down. Solution: add hourly/daily aggregation tables and prune raw data older than 30 days.

3. **Third bottleneck: Dashboard query latency.** Computing uptime percentages across large time ranges gets slow. Solution: pre-compute and cache uptime stats, update on each check rather than querying all heartbeats.

## Anti-Patterns

### Anti-Pattern 1: Alerting on First Failure

**What people do:** Send an alert email the moment a single check fails.
**Why it's wrong:** Transient network issues, brief server restarts, and DNS hiccups cause frequent single-check failures. Users get flooded with false alarms, lose trust, and disable notifications -- defeating the product's purpose.
**Do this instead:** Require 2-3 consecutive failures before declaring an incident and sending alerts. This is the universal standard across UptimeRobot, Uptime.com, and every serious monitoring tool.

### Anti-Pattern 2: Storing Every Check Result Forever

**What people do:** Insert a row for every check result with no cleanup strategy.
**Why it's wrong:** At 3-minute intervals, each monitor generates 480 rows/day, 14,400/month. With 1,000 monitors, that is 14.4M rows/month. Within months, the heartbeats table becomes the dominant cost and performance bottleneck.
**Do this instead:** Design the schema with rollups in mind from day one. Raw heartbeats for 30 days, hourly aggregates for 12 months, daily aggregates indefinitely. Run a nightly rollup job.

### Anti-Pattern 3: Synchronous Check Execution in the Request Handler

**What people do:** Execute all checks one-by-one in a single synchronous loop within the cron handler.
**Why it's wrong:** Check execution involves network I/O with unpredictable latency (timeouts, slow DNS). Sequential execution means total time = sum of all check times. With 100 monitors averaging 2s each, the handler takes 200s -- dangerously close to or exceeding the cron interval.
**Do this instead:** Use `Promise.allSettled` with a concurrency limiter (e.g., `p-limit`). Run 20-50 checks concurrently. Total time drops to `(total_checks / concurrency) * avg_check_time`.

### Anti-Pattern 4: Coupling Check Logic to Alert Logic

**What people do:** Put alert-sending code inside the checker function.
**Why it's wrong:** Makes it impossible to test checks without sending emails. Makes it hard to add new notification channels. Violates single responsibility -- the checker's job is "is this thing up?" not "who should I tell?"
**Do this instead:** Checker returns a result. Incident manager evaluates state transitions. Alert dispatcher handles notifications. Three separate concerns, three separate modules.

### Anti-Pattern 5: Running Checks from a Single Location

**What people do:** Check from one server and assume results represent global availability.
**Why it's wrong:** Network routing, regional outages, and CDN behavior mean a site can be down in one region but up in others. Single-location checking also means your monitoring goes down if that one server has issues.
**Do this instead:** For v1, single-region is acceptable (it is in scope), but design the checker interface so that adding multi-region confirmation later is a configuration change, not a rewrite. Accept this limitation explicitly and communicate it to users.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Email (Resend/SES)** | REST API from alert dispatcher | Use for both magic link auth and downtime alerts. Batch-send if multiple monitors go down simultaneously. Rate limits apply. |
| **Stripe** | Checkout Sessions + Webhooks | Create checkout session for signup. Listen for `customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted` webhooks. Store subscription status locally. |
| **Cron service** | HTTP trigger to API endpoint | Vercel Cron, Railway Cron, or external (cron-job.org). Must include auth secret. Minimum 1-min granularity. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Dashboard <-> API | HTTP (REST or tRPC) | Standard request/response. Auth via session cookie. |
| Cron Trigger <-> Check Engine | HTTP (internal API route) | Authenticated with bearer token/secret. Must complete within timeout. |
| Check Engine <-> Incident Manager | Direct function call | Same process. Checker returns result, incident manager is called with result. No need for message queue at v1 scale. |
| Incident Manager <-> Alert Dispatcher | Direct function call | Same process. Incident manager calls alerter when state changes. Could be decoupled via events later. |
| Alert Dispatcher <-> Email Service | HTTP (external API) | Outbound only. Fire-and-forget with retry on failure. |
| Billing <-> Stripe | HTTP (webhooks inbound, API outbound) | Webhook endpoint must verify Stripe signatures. Subscription state cached locally in DB. |

## Build Order (Dependency Graph)

Components should be built in this order based on dependencies:

```
Phase 1: Foundation
  Database schema + Auth (magic link)
  └── Everything depends on users and data storage

Phase 2: Core Monitoring Engine
  Checkers (HTTP first, then TCP/DNS/SSL)
  └── Incident state machine
      └── Alert dispatcher (email)
  └── Scheduler (cron endpoint)
  * This is the product's core value -- must work before anything else

Phase 3: Dashboard
  Monitor CRUD UI
  └── Status display + response time charts
      └── Uptime percentage calculations
  * Depends on: schema, auth, check data existing

Phase 4: Billing
  Stripe integration (checkout + webhooks)
  └── Plan enforcement (monitor limits)
  * Depends on: auth, working product to charge for

Phase 5: Production Hardening
  Data retention / rollups
  └── Error handling / retry logic
      └── Rate limiting, security headers
  * Depends on: everything working end-to-end first
```

**Build order rationale:**
- Auth and DB schema are prerequisites for everything.
- The monitoring engine is the core product -- build and validate it before the UI.
- Dashboard is useless without data, so it follows the engine.
- Billing comes after you have a working product (no one pays for a dashboard with no monitoring).
- Production hardening is a continuous concern but gets focused attention after the core works.

## Sources

- [How I built architecture of uptime monitoring service - DEV Community](https://dev.to/vponamariov/how-i-built-architecture-of-uptime-monitoring-service-54h8) -- Real-world architecture walkthrough with Laravel, Redis queues, distributed nodes
- [Uptime Kuma Architecture Overview - DeepWiki](https://deepwiki.com/louislam/uptime-kuma/2-architecture) -- Open-source reference implementation: Vue + Node.js + Socket.IO + SQLite, heartbeat system, monitor state machine
- [How to build an event-driven Uptime Monitoring System - Encore.dev](https://encore.dev/docs/ts/tutorials/uptime) -- Event-driven architecture with Pub/Sub for state transitions, TypeScript
- [UptimeRobot New Core Architecture](https://uptimerobot.com/blog/new-core-architecture/) -- Multi-cloud distributed monitoring nodes, DNS optimization
- [From Cron to Queue: Reducing Monitor Scheduling CPU by 40% - Medium](https://medium.com/@mahayesh7/from-cron-to-queue-how-i-reduced-monitor-scheduling-cpu-usage-by-40-4627ef987315) -- BullMQ queue-based scheduling vs cron for monitoring
- [Reducing False Positive Alerts: Proven Strategies - Upstat](https://upstat.io/blog/reducing-false-positive-alerts) -- Consecutive failure confirmation, multi-location verification
- [Efficient Rollup Tables with HyperLogLog in Postgres - Citus](https://docs.citusdata.com/en/v8.0/articles/efficient_rollup.html) -- PostgreSQL rollup table patterns for time-series aggregation
- [Schedulers in Node: Top 10 Libraries - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) -- Node.js scheduling approaches comparison

---
*Architecture research for: Uptime monitoring micro-SaaS*
*Researched: 2026-03-06*
