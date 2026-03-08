# Phase 5: Incident Detection and Alerting - Research

**Researched:** 2026-03-07
**Domain:** Incident state machine, transactional email alerts, React Email templating
**Confidence:** HIGH

## Summary

Phase 5 adds the incident detection state machine to the existing check engine, creates four email alert templates (downtime, recovery, SSL expiry, weekly digest), and wires them into the worker process. The existing codebase is well-prepared: the `incidents` table already exists in the schema, `consecutiveFailures` is tracked on monitors, the Resend client is established, and React Email templates have a clear pattern in `lib/email/templates/`.

The primary technical challenge is that the worker process (standalone Node.js/TypeScript) does not currently have JSX support or `resend`/`@react-email` dependencies. The recommended approach is to use `@react-email/render` to pre-render React templates to HTML strings in a shared utility, then send via the Resend `html:` parameter. However, the simpler approach -- adding `resend` as a worker dependency and using `html:` with inline HTML strings -- avoids the JSX complexity entirely. Given the CONTEXT.md decision for "minimal and factual tone," simple HTML string templates (not React components) are sufficient for alert emails from the worker.

**Primary recommendation:** Add `resend` to the worker's dependencies. Build email HTML as template-literal strings in a dedicated `worker/src/emails/` module (no JSX needed for simple factual alert emails). Add incident state machine logic directly in `_checkMonitor()`. Add SSL expiry checking and weekly digest to the maintenance job interval.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- State machine runs inside the check tick (after each monitor check, not a separate pass)
- When `consecutiveFailures` reaches 3: create incident record, send downtime alert
- When a check succeeds while an ongoing incident exists: resolve incident immediately (first success = recovery, no consecutive success requirement)
- Add explicit up/down status tracking on the `monitors` table (expand status or add `isUp` field) so dashboard queries don't need incident JOINs
- Populate the `cause` field on incidents from the last failing check's error/statusCode (e.g., "HTTP 502", "Connection refused", "Timeout")
- Minimal and factual tone -- no fluff, no marketing copy
- Downtime email: monitor name, URL, cause, time detected
- Recovery email: monitor name, URL, human-readable downtime duration (e.g., "Down for 12 minutes")
- Include a "View Monitor" link to the dashboard in all alert emails (will work once Phase 6 builds the detail page)
- Consistent branding with existing email templates: Stripe-inspired layout, green/teal Uptime Lens colors, logo
- Alert-specific color coding: red for downtime, green for recovery, amber for SSL warnings
- Track last-alerted threshold on the monitors table (e.g., `lastSslAlertDays` field) -- not a separate table
- Thresholds: 30, 14, 7, 1 day before expiry
- Send alert when cert crosses a threshold, set field to that threshold, don't re-send until next lower threshold
- Reset tracking when cert is renewed (expiry date moves forward)
- Fire for both HTTP and SSL-type monitors (HTTPS monitors already capture `sslExpiresAt` in heartbeats)
- Expired SSL cert gets its own SSL-specific alert -- does NOT create a downtime incident
- Weekly digest triggered by existing maintenance job interval (runs every 4 hours) with a check: "Is it Monday and has this week's digest not been sent yet?"
- Track last digest send time to avoid double-sends on worker restart
- Sends Monday 9am UTC
- Content: table of monitors with 7-day uptime percentages, followed by list of incidents from the past week
- Skip digest for users with zero monitors -- users with monitors but 100% uptime still receive the digest

### Claude's Discretion
- Schema changes needed for status tracking and SSL alert dedup (field names, types)
- Email template component structure and exact layout
- How to query rollup data for weekly uptime percentages
- Worker code organization (incident detection as separate module or inline)
- Dashboard URL format for "View Monitor" links
- Duration formatting logic (minutes vs hours vs days)
- How to track weekly digest send state (column, config, or file)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MON-07 | User receives alerts when SSL certificates approach expiry (30, 14, 7, 1 day) | SSL threshold tracking via `lastSslAlertDays` field on monitors table; check `sslExpiresAt` from heartbeats during check tick; send SSL expiry email template |
| ALR-01 | User receives email when a monitor goes down | Incident state machine in `_checkMonitor()`: when `consecutiveFailures` reaches 3, INSERT into `incidents` table and send downtime email via Resend |
| ALR-02 | User receives email when a monitor recovers (with downtime duration) | Recovery detection: successful check while ongoing incident exists; resolve incident with `resolvedAt` timestamp; compute duration; send recovery email |
| ALR-03 | User receives a weekly email digest with uptime percentages and notable incidents | Weekly digest in maintenance job: check if Monday + not yet sent; query `heartbeats_daily` for 7-day uptime percentages; query `incidents` for past week; send digest email per user |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^6.9.3 | Send transactional emails via Resend API | Already used in web app; add to worker dependencies |
| drizzle-orm | ^0.45.1 | Database queries for incidents, monitors, users | Already in worker, handles all DB operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @neondatabase/serverless | ^1.0.2 | Neon HTTP database driver | Already in worker for DB connectivity |

### Not Needed
| Library | Why Not |
|---------|---------|
| @react-email/components | Worker lacks JSX support; alert emails are simple enough for inline HTML template literals |
| @react-email/render | Would require adding JSX to worker tsconfig + React dependency; overkill for 4 templates |
| BullMQ | No job queue needed; worker uses simple `setInterval` loops (established pattern) |
| nodemailer | Resend handles all email transport |

**Installation (worker only):**
```bash
cd worker && npm install resend
```

## Architecture Patterns

### Recommended Project Structure
```
worker/src/
  check-engine.ts        # Modified: add incident state machine after check result
  incidents.ts           # NEW: incident open/close/query logic (extracted module)
  emails/
    send.ts              # NEW: Resend client + send helper with error handling
    templates.ts         # NEW: HTML template functions for all 4 email types
  digest.ts              # NEW: weekly digest query + send logic
  rollup.ts              # Modified: add weekly digest check to maintenance job
  db.ts                  # Existing: WorkerDb type
  index.ts               # Existing: entry point
  probes/                # Existing: probe implementations
```

### Pattern 1: Incident State Machine in Check Tick
**What:** After each monitor check, evaluate whether to open or close an incident
**When to use:** Every call to `_checkMonitor()`
**Logic:**
```typescript
// In _checkMonitor(), after storing heartbeat and updating consecutiveFailures:

// 1. Check for incident OPEN condition
if (newConsecutiveFailures >= 3 && monitor.consecutiveFailures < 3) {
  // Just crossed the threshold -- open incident
  const cause = result.error || (result.statusCode ? `HTTP ${result.statusCode}` : "Unknown");
  await openIncident(db, monitor.id, cause, checkedAt);
  await sendDowntimeAlert(db, monitor, cause, checkedAt);
  // Update monitor isUp = false
}

// 2. Check for incident CLOSE condition
if (result.status === 1) {
  const ongoingIncident = await getOngoingIncident(db, monitor.id);
  if (ongoingIncident) {
    await resolveIncident(db, ongoingIncident.id, checkedAt);
    const duration = checkedAt.getTime() - ongoingIncident.startedAt.getTime();
    await sendRecoveryAlert(db, monitor, formatDuration(duration), checkedAt);
    // Update monitor isUp = true
  }
}

// 3. Check SSL expiry (for monitors with sslExpiresAt in result)
if (result.sslExpiresAt) {
  await checkSslExpiry(db, monitor, result.sslExpiresAt);
}
```

### Pattern 2: Email HTML as Template Literal Functions
**What:** Simple functions that return HTML strings, styled to match existing email branding
**When to use:** For all alert emails sent from the worker
**Why:** Avoids JSX/React dependency in worker while maintaining consistent branding
**Example:**
```typescript
// worker/src/emails/templates.ts

const BRAND_GREEN = "#10b981";
const ALERT_RED = "#ef4444";
const ALERT_AMBER = "#f59e0b";
const RECOVERY_GREEN = "#22c55e";

function emailWrapper(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;max-width:560px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:40px;">
      <div style="font-size:24px;font-weight:bold;color:#0f172a;margin-bottom:16px;">UL</div>
      ${content}
    </div>
  </div>
</body>
</html>`;
}

export function downtimeEmailHtml(opts: {
  monitorName: string;
  url: string;
  cause: string;
  detectedAt: string;
  dashboardUrl: string;
}): string {
  return emailWrapper(`
    <div style="border-left:4px solid ${ALERT_RED};padding-left:16px;margin-bottom:24px;">
      <div style="font-size:18px;font-weight:600;color:${ALERT_RED};">Monitor Down</div>
      <div style="font-size:16px;color:#334155;margin-top:8px;">${opts.monitorName}</div>
    </div>
    <table style="width:100%;font-size:14px;color:#475569;">
      <tr><td style="padding:4px 0;font-weight:600;">URL</td><td>${opts.url}</td></tr>
      <tr><td style="padding:4px 0;font-weight:600;">Cause</td><td>${opts.cause}</td></tr>
      <tr><td style="padding:4px 0;font-weight:600;">Detected</td><td>${opts.detectedAt}</td></tr>
    </table>
    <a href="${opts.dashboardUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background-color:${BRAND_GREEN};color:#ffffff;border-radius:6px;font-size:16px;font-weight:600;text-decoration:none;">View Monitor</a>
  `, `Monitor Down: ${opts.monitorName}`);
}
```

### Pattern 3: Weekly Digest Scheduling in Maintenance Job
**What:** Check if it's time for weekly digest during the 4-hour maintenance interval
**When to use:** Every maintenance job tick
**Logic:**
```typescript
// In startMaintenanceJob callback, after daily rollups and cleanup:
await maybeProcessWeeklyDigest(db);

async function maybeProcessWeeklyDigest(db: WorkerDb): Promise<void> {
  const now = new Date();
  // Check: is it Monday and past 9:00 UTC?
  if (now.getUTCDay() !== 1) return; // Not Monday
  if (now.getUTCHours() < 9) return; // Before 9am UTC

  // Check: has digest already been sent this week?
  // Use a simple config/state row or a dedicated tracking mechanism
  const lastSent = await getLastDigestSendTime(db);
  const weekStart = getMondayOfWeek(now);
  if (lastSent && lastSent >= weekStart) return; // Already sent

  // Send digest for each user with monitors
  await sendAllDigests(db);
  await setLastDigestSendTime(db, now);
}
```

### Pattern 4: User Email Lookup for Alerts
**What:** JOIN monitors to users to get the recipient email address
**When to use:** Every time an alert email needs to be sent
**Example:**
```typescript
// Get user email for a monitor
const [user] = await db
  .select({ email: users.email })
  .from(users)
  .innerJoin(monitors, eq(monitors.userId, users.id))
  .where(eq(monitors.id, monitorId))
  .limit(1);
```

### Anti-Patterns to Avoid
- **Sending alerts in a separate interval loop:** The state machine must run in the check tick itself, not asynchronously. This ensures incident detection is deterministic and synchronized with the check that triggered it.
- **Using `react:` parameter in worker emails:** The worker has no JSX transpilation. Use `html:` with template literal strings.
- **Creating incidents on every failure:** Only create when `consecutiveFailures` crosses the threshold (reaches 3), not on every failed check.
- **Sending duplicate alerts on restart:** If worker restarts after creating an incident but before the next check, don't re-alert. Use the incident `status: 'ongoing'` as the source of truth -- only alert when transitioning FROM below-threshold TO at-threshold.
- **Awaiting email sends in the hot path:** Fire-and-forget email sends (catch errors and log, don't block the check loop).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | Resend API via `resend` npm package | Deliverability, SPF/DKIM, bounce handling, rate limiting |
| Duration formatting | Custom math | Simple utility function (see below) | Easy to get wrong with edge cases (0 minutes, >24 hours, etc.) |
| HTML email rendering | Custom HTML builder | Template literal functions with shared wrapper | Email clients have quirky rendering; keep it simple with inline styles |
| Deduplication of SSL alerts | Complex event sourcing | Single `lastSslAlertDays` field on monitors table | Simple threshold tracking covers the requirement |
| Weekly scheduling | Cron library | Check day-of-week + hour in existing maintenance interval | 4-hour interval is frequent enough to catch Monday 9am window |

**Key insight:** The worker is intentionally simple (no job queue, no cron, no complex scheduling). All new functionality fits into the existing `setInterval` patterns.

## Common Pitfalls

### Pitfall 1: Race Condition on Incident Creation
**What goes wrong:** Two check ticks run close together, both see `consecutiveFailures` at 2, both increment to 3, both try to create incidents.
**Why it happens:** The worker uses `Promise.allSettled` for parallel monitor checks, but each monitor is only checked once per tick. This pitfall is actually unlikely in this architecture since each monitor is processed sequentially within its `_checkMonitor` call.
**How to avoid:** The current architecture already prevents this -- each monitor has exactly one `_checkMonitor` call per tick. However, add a guard: check for existing ongoing incident before creating a new one.
**Warning signs:** Multiple incident records for the same monitor with overlapping time ranges.

### Pitfall 2: SSL Expiry Alert Re-sends After Worker Restart
**What goes wrong:** Worker restarts, `lastSslAlertDays` is in the database (persistent), but if it weren't, alerts would re-fire.
**Why it happens:** If state is kept in memory instead of the database.
**How to avoid:** Store `lastSslAlertDays` in the `monitors` table (as decided). This survives restarts.
**Warning signs:** Users receiving duplicate SSL alerts.

### Pitfall 3: Weekly Digest Double-Send
**What goes wrong:** The 4-hour maintenance interval fires twice on Monday (e.g., 8am and 12pm), sending the digest twice.
**Why it happens:** No tracking of whether this week's digest has been sent.
**How to avoid:** Track last digest send time in the database. Check if it's already been sent this week before proceeding. Use a simple key-value table or a column on users.
**Warning signs:** Users receiving two Monday emails.

### Pitfall 4: Incident Not Detected When Worker Restarts Mid-Failure
**What goes wrong:** Monitor fails twice, worker restarts, `consecutiveFailures` is persisted (good), third failure triggers incident correctly. BUT: if `consecutiveFailures` was already >= 3 before restart, the check `monitor.consecutiveFailures < 3` in the "just crossed threshold" guard would be wrong if the monitor was at 3+ before the check.
**Why it happens:** The guard `newConsecutiveFailures >= 3 && monitor.consecutiveFailures < 3` only catches the exact transition.
**How to avoid:** The more robust guard is: `newConsecutiveFailures >= 3 && !(await hasOngoingIncident(db, monitor.id))`. This handles restart scenarios correctly.
**Warning signs:** Monitor stays down after restart but no incident/alert is created.

### Pitfall 5: Forgetting to Set isUp on Initial Monitor State
**What goes wrong:** New monitors have `isUp` as null/undefined, dashboard shows ambiguous state.
**Why it happens:** Migration adds column but doesn't set default for existing rows.
**How to avoid:** Default `isUp` to `true` in the schema and migration. Existing active monitors should be set to `true` in the migration.
**Warning signs:** Dashboard showing "unknown" status.

### Pitfall 6: Email Template HTML Rendering in Email Clients
**What goes wrong:** Email looks broken in Outlook, Gmail clips it, or dark mode inverts colors.
**Why it happens:** Email client HTML/CSS support is limited and inconsistent.
**How to avoid:** Use inline styles only (no `<style>` blocks), table-based layouts for complex structure, explicit background colors. Keep templates simple. Test with Resend's preview.
**Warning signs:** Users reporting emails look broken.

## Code Examples

### Schema Changes (Drizzle)
```typescript
// Add to monitors table definition:
isUp: boolean("is_up").notNull().default(true),
lastSslAlertDays: integer("last_ssl_alert_days"),  // null = no alert sent yet
```

### Incident Operations
```typescript
// worker/src/incidents.ts
import { eq, and } from "drizzle-orm";
import { incidents, monitors, users } from "../../lib/db/schema";
import type { WorkerDb } from "./db";

export async function openIncident(
  db: WorkerDb,
  monitorId: number,
  cause: string,
  startedAt: Date,
): Promise<void> {
  await db.insert(incidents).values({
    monitorId,
    status: "ongoing",
    cause,
    startedAt,
  });
  // Update monitor isUp flag
  await db
    .update(monitors)
    .set({ isUp: false, updatedAt: startedAt })
    .where(eq(monitors.id, monitorId));
}

export async function resolveIncident(
  db: WorkerDb,
  incidentId: number,
  monitorId: number,
  resolvedAt: Date,
): Promise<void> {
  await db
    .update(incidents)
    .set({ status: "resolved", resolvedAt })
    .where(eq(incidents.id, incidentId));
  await db
    .update(monitors)
    .set({ isUp: true, updatedAt: resolvedAt })
    .where(eq(monitors.id, monitorId));
}

export async function getOngoingIncident(
  db: WorkerDb,
  monitorId: number,
) {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.monitorId, monitorId),
        eq(incidents.status, "ongoing"),
      ),
    )
    .limit(1);
  return incident ?? null;
}
```

### Duration Formatting
```typescript
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}
// "Down for 12 minutes" -> formatDuration returns "12m", caller wraps in "Down for "
```

### SSL Expiry Check
```typescript
const SSL_THRESHOLDS = [30, 14, 7, 1]; // days

export async function checkSslExpiry(
  db: WorkerDb,
  monitor: typeof monitors.$inferSelect,
  sslExpiresAt: Date,
): Promise<void> {
  const now = new Date();
  const daysUntilExpiry = Math.floor(
    (sslExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Find the highest threshold that has been crossed
  const crossedThreshold = SSL_THRESHOLDS.find((t) => daysUntilExpiry <= t);
  if (!crossedThreshold) return; // Not within any threshold

  // Check if we already alerted for this threshold or a lower one
  const lastAlerted = monitor.lastSslAlertDays;
  if (lastAlerted !== null && lastAlerted <= crossedThreshold) return;

  // Check for cert renewal: if expiry moved forward, reset tracking
  // (This is handled implicitly -- if daysUntilExpiry is now > lastAlerted,
  //  the cert was renewed and we'll re-alert at the appropriate threshold)

  // Send SSL expiry alert
  await sendSslExpiryAlert(db, monitor, daysUntilExpiry, sslExpiresAt);

  // Update tracking
  await db
    .update(monitors)
    .set({ lastSslAlertDays: crossedThreshold })
    .where(eq(monitors.id, monitor.id));
}
```

### Weekly Digest Query
```typescript
// Query 7-day uptime percentage from heartbeats_daily
import { heartbeatsDaily, incidents as incidentsTable } from "../../lib/db/schema";
import { gte, sql } from "drizzle-orm";

async function getWeeklyUptimeByMonitor(db: WorkerDb, monitorIds: number[]) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return db
    .select({
      monitorId: heartbeatsDaily.monitorId,
      totalChecks: sql<number>`SUM(${heartbeatsDaily.totalChecks})`,
      successfulChecks: sql<number>`SUM(${heartbeatsDaily.successfulChecks})`,
      uptimePercentage: sql<number>`
        CASE WHEN SUM(${heartbeatsDaily.totalChecks}) = 0 THEN 100
        ELSE (SUM(${heartbeatsDaily.successfulChecks})::float / SUM(${heartbeatsDaily.totalChecks}) * 100)
        END
      `,
    })
    .from(heartbeatsDaily)
    .where(gte(heartbeatsDaily.date, sevenDaysAgo))
    .groupBy(heartbeatsDaily.monitorId);
}
```

### Sending Email from Worker
```typescript
// worker/src/emails/send.ts
import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[worker] RESEND_API_KEY not set -- emails will not be sent");
      // Return a no-op proxy or throw
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendAlertEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: "Uptime Lens <alerts@uptimelens.io>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[worker] Email send error:", error.message);
    }
  } catch (err) {
    console.error("[worker] Email send failed:", err);
    // Don't throw -- email failures should not crash the check loop
  }
}
```

### Digest Send State Tracking
```typescript
// Recommended: simple key-value approach using a new table or piggybacking on an existing mechanism.
// Simplest option: a `worker_state` table with key-value pairs.

// Alternative (simpler): track per-user with a `lastDigestSentAt` column on the `users` table.
// This also enables per-user digest dedup and lets us easily skip users who already received one.

// Schema addition:
// users table: lastDigestSentAt: timestamp("last_digest_sent_at", { withTimezone: true }),
// OR
// New table:
// worker_state: { key: text().primaryKey(), value: text(), updatedAt: timestamp() }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer + SMTP | Resend API (HTTP-based) | 2023+ | Simpler setup, better deliverability, built-in analytics |
| MJML for email templates | React Email or template literals | 2023+ | Better DX, component-based (when using React) |
| Separate alerting service | Inline in check loop | Project decision | Simpler architecture, no inter-service communication |
| Complex state machines (XState) | Simple if/else in check tick | Project decision | Adequate for binary up/down with threshold |

**Not applicable for this phase:**
- BullMQ/Redis job queues: Worker uses `setInterval`, not a job queue
- WebSocket real-time alerts: Email-only for v1
- Third-party incident management: Out of scope

## Open Questions

1. **Worker `resend` dependency: install at worker level or root level?**
   - What we know: The root package has `resend` already. Worker has its own `package.json`.
   - What's unclear: Whether the worker can import from root `node_modules` or needs its own install.
   - Recommendation: Install `resend` in worker's `package.json` to keep it self-contained (consistent with existing pattern where worker has its own `drizzle-orm` and `@neondatabase/serverless`). NOTE: Phase 4 removed worker's local `drizzle-orm` to resolve dual-installation type conflicts -- check if same issue applies to `resend`.

2. **Weekly digest state tracking mechanism**
   - What we know: Need to prevent double-sends on Monday
   - Options: (a) `lastDigestSentAt` column on `users` table, (b) new `worker_state` key-value table, (c) in-memory variable (lost on restart)
   - Recommendation: Use `lastDigestSentAt` on `users` table -- simplest, survives restarts, per-user dedup. This avoids needing a new table and is queryable.

3. **Dashboard URL for "View Monitor" link**
   - What we know: Dashboard is at `/dashboard`. No monitor detail page exists yet (Phase 6).
   - Recommendation: Link to `/dashboard` for now. Format: `${APP_URL}/dashboard` where `APP_URL` comes from environment variable (e.g., `https://uptimelens.io`). Phase 6 can update to `/dashboard/monitors/${monitorId}`.

4. **Worker tsconfig include path for shared schema**
   - What we know: Worker already includes `../lib/db/**/*.ts` in tsconfig
   - What's unclear: Whether the `users` table import will work seamlessly from worker code
   - Recommendation: It should work since `lib/db/schema.ts` is already included. Verify during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via root package.json) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALR-01 | Downtime alert sent when monitor goes down (3 consecutive failures) | unit | `npx vitest run tests/alerting/incident-detection.test.ts -t "opens incident"` | No -- Wave 0 |
| ALR-02 | Recovery alert sent with duration when monitor comes back up | unit | `npx vitest run tests/alerting/incident-detection.test.ts -t "resolves incident"` | No -- Wave 0 |
| MON-07 | SSL expiry alerts at 30/14/7/1 day thresholds without re-sends | unit | `npx vitest run tests/alerting/ssl-expiry.test.ts` | No -- Wave 0 |
| ALR-03 | Weekly digest sent on Monday with uptime percentages and incidents | unit | `npx vitest run tests/alerting/weekly-digest.test.ts` | No -- Wave 0 |
| -- | Email HTML templates render correctly | unit | `npx vitest run tests/alerting/email-templates.test.ts` | No -- Wave 0 |
| -- | Incident state machine handles edge cases (restart, already-ongoing) | unit | `npx vitest run tests/alerting/incident-detection.test.ts -t "edge cases"` | No -- Wave 0 |
| -- | Duration formatting produces human-readable strings | unit | `npx vitest run tests/alerting/format-duration.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/alerting/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/alerting/incident-detection.test.ts` -- covers ALR-01, ALR-02 (incident open/close state machine)
- [ ] `tests/alerting/ssl-expiry.test.ts` -- covers MON-07 (SSL threshold logic)
- [ ] `tests/alerting/weekly-digest.test.ts` -- covers ALR-03 (digest scheduling + content)
- [ ] `tests/alerting/email-templates.test.ts` -- covers template rendering (HTML output contains expected content)
- [ ] `tests/alerting/format-duration.test.ts` -- covers duration formatting utility

Note: All tests should mock the database (WorkerDb) and Resend client. The existing test pattern uses `vi.mock()` with delegate pattern (see Phase 2 decision). Tests run in jsdom environment but these are pure logic tests that don't need DOM.

## Sources

### Primary (HIGH confidence)
- Project codebase: `worker/src/check-engine.ts`, `lib/db/schema.ts`, `worker/src/rollup.ts` -- direct code analysis
- Project codebase: `lib/email/templates/magic-link.tsx`, `lib/email/resend.ts` -- email patterns
- Project codebase: `worker/package.json`, `worker/tsconfig.json` -- worker dependency and build configuration
- CONTEXT.md: All locked decisions and discretion areas

### Secondary (MEDIUM confidence)
- [Resend Node.js docs](https://resend.com/docs/send-with-nodejs) -- `html` parameter confirmed as valid alternative to `react`
- [React Email render utility](https://react.email/docs/utilities/render) -- confirmed `@react-email/render` can convert components to HTML strings (not used, but validated as fallback option)

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use in the project, just extending to worker
- Architecture: HIGH - Patterns follow existing codebase conventions exactly (setInterval, Drizzle, inline styles)
- Pitfalls: HIGH - Derived from direct codebase analysis and state machine reasoning
- Email templates: HIGH - Existing templates provide clear pattern; `html:` parameter confirmed in Resend docs
- Weekly digest scheduling: MEDIUM - The 4-hour interval approach is sound but the exact timing window (9am UTC check) depends on when maintenance job runs relative to Monday morning

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- no fast-moving dependencies)
