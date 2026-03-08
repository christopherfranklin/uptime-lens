# Phase 5: Incident Detection and Alerting - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

State machine for incident lifecycle (up -> down -> recovered) plus email notifications on downtime, recovery, SSL certificate expiry, and weekly digest. Users are notified by email when monitors go down, recover, or have expiring SSL certificates. No dashboard UI changes, no notification channel configuration, no alert preferences -- this phase delivers the detection engine and email alerts only.

Requirements: MON-07, ALR-01, ALR-02, ALR-03

</domain>

<decisions>
## Implementation Decisions

### Incident lifecycle
- State machine runs inside the check tick (after each monitor check, not a separate pass)
- When `consecutiveFailures` reaches 3: create incident record, send downtime alert
- When a check succeeds while an ongoing incident exists: resolve incident immediately (first success = recovery, no consecutive success requirement)
- Add explicit up/down status tracking on the `monitors` table (expand status or add `isUp` field) so dashboard queries don't need incident JOINs
- Populate the `cause` field on incidents from the last failing check's error/statusCode (e.g., "HTTP 502", "Connection refused", "Timeout")

### Alert email content
- Minimal and factual tone -- no fluff, no marketing copy
- Downtime email: monitor name, URL, cause, time detected
- Recovery email: monitor name, URL, human-readable downtime duration (e.g., "Down for 12 minutes")
- Include a "View Monitor" link to the dashboard in all alert emails (will work once Phase 6 builds the detail page)
- Consistent branding with existing email templates: Stripe-inspired layout, green/teal Uptime Lens colors, logo
- Alert-specific color coding: red for downtime, green for recovery, amber for SSL warnings

### SSL expiry alerts
- Track last-alerted threshold on the monitors table (e.g., `lastSslAlertDays` field) -- not a separate table
- Thresholds: 30, 14, 7, 1 day before expiry
- Send alert when cert crosses a threshold, set field to that threshold, don't re-send until next lower threshold
- Reset tracking when cert is renewed (expiry date moves forward)
- Fire for both HTTP and SSL-type monitors (HTTPS monitors already capture `sslExpiresAt` in heartbeats)
- Expired SSL cert gets its own SSL-specific alert -- does NOT create a downtime incident (different problem than site being down)

### Weekly digest
- Triggered by the existing maintenance job interval (runs every 4 hours) with a check: "Is it Monday and has this week's digest not been sent yet?"
- Track last digest send time to avoid double-sends on worker restart
- Sends Monday 9am UTC
- Content: table of monitors with 7-day uptime percentages, followed by list of incidents from the past week (monitor name, duration, cause)
- Skip digest for users with zero monitors -- users with monitors but 100% uptime still receive the digest

### Claude's Discretion
- Schema changes needed for status tracking and SSL alert dedup (field names, types)
- Email template component structure and exact layout
- How to query rollup data for weekly uptime percentages
- Worker code organization (incident detection as separate module or inline)
- Dashboard URL format for "View Monitor" links
- Duration formatting logic (minutes vs hours vs days)
- How to track weekly digest send state (column, config, or file)

</decisions>

<specifics>
## Specific Ideas

- The worker already has a maintenance job interval (4 hours) -- reuse that for weekly digest scheduling rather than adding new infrastructure
- Phase 4 deliberately left incident creation to Phase 5, with `consecutiveFailures` as the handoff point
- Emails from alerts@uptimelens.io (established in Phase 1)
- Existing react-email templates (magic-link.tsx, email-change.tsx) provide the pattern for new alert templates

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/email/resend.ts`: Resend client with Proxy pattern for lazy init -- use for sending all alerts
- `lib/email/templates/magic-link.tsx`: React email template pattern to follow for alert templates
- `worker/src/check-engine.ts`: `_checkMonitor()` function where incident state machine logic should be added
- `worker/src/rollup.ts`: Hourly/daily rollup data for computing weekly uptime percentages
- `lib/db/schema.ts`: `incidents` table already defined with `ongoing`/`resolved` enum, `cause`, `startedAt`, `resolvedAt`

### Established Patterns
- Worker uses `setInterval` loops (30s for checks, 4h for maintenance) -- no BullMQ
- Drizzle ORM for all database operations in worker (`worker/src/db.ts`)
- React email components with `@react-email/components` for styled HTML emails
- `resend.emails.send()` with `react:` parameter for template rendering
- `ProbeResult` interface: `{ status: 1|0, responseTimeMs, statusCode?, error?, sslExpiresAt? }`

### Integration Points
- `worker/src/check-engine.ts` `_checkMonitor()`: Add incident open/close logic after check result
- `worker/src/index.ts` `startMaintenanceJob()`: Add weekly digest check to existing 4-hour maintenance interval
- `monitors` table: Need to add `isUp` boolean and `lastSslAlertDays` integer fields
- `incidents` table: Already exists, ready to use -- just need to INSERT/UPDATE from worker
- `lib/email/templates/`: Add new templates for downtime, recovery, SSL expiry, and weekly digest

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 05-incident-detection-and-alerting*
*Context gathered: 2026-03-07*
