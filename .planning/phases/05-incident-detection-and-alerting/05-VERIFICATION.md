---
phase: 05-incident-detection-and-alerting
verified: 2026-03-08T05:50:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 5: Incident Detection and Alerting Verification Report

**Phase Goal:** Users are notified by email when their monitors go down, recover, or have expiring SSL certificates, and receive a weekly summary of uptime health
**Verified:** 2026-03-08T05:50:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User receives an email within minutes when a monitor transitions from up to down (after consecutive failure confirmation) | VERIFIED | `worker/src/check-engine.ts` lines 157-185: incident state machine opens incident at `newConsecutiveFailures >= 3` with `getOngoingIncident` guard, sends downtime email via `sendAlertEmail` with `downtimeEmailHtml`. 8 incident-detection tests pass covering open, dedup, cause derivation, and email resilience. |
| 2 | User receives an email when a monitor recovers, including how long it was down | VERIFIED | `worker/src/check-engine.ts` lines 188-215: on `result.status === 1`, checks for ongoing incident, calls `resolveIncident`, sends recovery email with `formatDuration(checkedAt - ongoing.startedAt)`. Test "resolves incident and sends recovery alert when check succeeds" confirms. |
| 3 | User receives email alerts when an SSL certificate is approaching expiry at 30, 14, 7, and 1 day thresholds | VERIFIED | `worker/src/ssl-expiry.ts`: tightest-match threshold algorithm iterates [30,14,7,1], dedup via `lastSslAlertDays`, renewal reset, expired cert as threshold 0. Wired into check engine at line 218-220 (`if (result.sslExpiresAt)`). 8 SSL expiry tests pass covering all thresholds, dedup, renewal reset, and expired cert. |
| 4 | User receives a weekly email digest summarizing uptime percentages and notable incidents across all monitors | VERIFIED | `worker/src/digest.ts`: `maybeProcessWeeklyDigest` fires Monday after 9am UTC, queries `heartbeatsDaily` for 7-day uptime, queries `incidents` for past week, calls `weeklyDigestEmailHtml`, dedup via `lastDigestSentAt`. Wired into `worker/src/rollup.ts` line 62 in maintenance job. 11 weekly digest tests pass covering scheduling, content, dedup, zero-monitor skip, 100% uptime send, and error isolation. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/db/schema.ts` | isUp, lastSslAlertDays on monitors; lastDigestSentAt on users | VERIFIED | Lines 131-132: `isUp: boolean("is_up").notNull().default(true)`, `lastSslAlertDays: integer("last_ssl_alert_days")`. Line 41: `lastDigestSentAt: timestamp("last_digest_sent_at", { withTimezone: true })`. |
| `drizzle/0001_add-alerting-fields.sql` | Migration SQL for alerting fields | VERIFIED | 4-line migration: ALTER TABLE monitors ADD is_up + last_ssl_alert_days, ALTER TABLE users ADD last_digest_sent_at, UPDATE backfill. |
| `worker/src/emails/send.ts` | Resend email send helper with error handling | VERIFIED | 43 lines. Lazy-init Resend client, `sendAlertEmail({to, subject, html})`, warns on missing API key, catches errors (never throws). Exports `_resetClient` for test isolation. |
| `worker/src/emails/templates.ts` | HTML templates for downtime, recovery, SSL, digest | VERIFIED | 151 lines. `emailWrapper` with Stripe-inspired branding (bg #f6f9fc, white card, UL logo). 4 template functions: `downtimeEmailHtml` (red #ef4444), `recoveryEmailHtml` (green #22c55e), `sslExpiryEmailHtml` (amber #f59e0b), `weeklyDigestEmailHtml` (monitor table + incidents). `formatDuration` handles seconds through days. Inline styles only. |
| `worker/src/incidents.ts` | Incident CRUD operations | VERIFIED | 67 lines. `openIncident` (insert + set isUp=false), `resolveIncident` (update status + set isUp=true), `getOngoingIncident` (query by monitorId + status=ongoing, LIMIT 1), `getUserEmailForMonitor` (JOIN monitors to users). All use WorkerDb parameter for testability. |
| `worker/src/check-engine.ts` | Incident state machine + SSL expiry wired in | VERIFIED | 221 lines. After heartbeat insert + monitor update + hourly rollup: (1) incident OPEN at consecutiveFailures >= 3 with getOngoingIncident guard, (2) incident CLOSE on success with ongoing check, (3) SSL expiry check when sslExpiresAt present. All email sends in try/catch (fire-and-forget). |
| `worker/src/ssl-expiry.ts` | SSL expiry threshold checking with dedup | VERIFIED | 108 lines. `checkSslExpiry(db, monitor, sslExpiresAt)`. Tightest-match algorithm, expired cert as threshold 0, renewal reset (lastSslAlertDays -> null when > 30 days). Fire-and-forget email with try/catch. |
| `worker/src/digest.ts` | Weekly digest scheduling, query, and per-user send | VERIFIED | 169 lines. `maybeProcessWeeklyDigest(db)`. Monday + 9am UTC gates. `selectDistinct` + `innerJoin` for users with monitors. Per-user: dedup via lastDigestSentAt >= mondayStart, query heartbeatsDaily (7d), query incidents (7d), format + send + update lastDigestSentAt. Error isolation per user. |
| `worker/src/rollup.ts` | Maintenance job calling digest | VERIFIED | Line 4: imports `maybeProcessWeeklyDigest`. Line 62: `await maybeProcessWeeklyDigest(db)` called after `_cleanupOldHeartbeats`. |
| `tests/alerting/email-templates.test.ts` | Tests for 4 email templates | VERIFIED | 25 test cases across downtimeEmailHtml (7), recoveryEmailHtml (5), sslExpiryEmailHtml (5), weeklyDigestEmailHtml (4), emailWrapper (4). |
| `tests/alerting/format-duration.test.ts` | Tests for duration formatting | VERIFIED | 8 test cases: 0ms, seconds, 1 minute, minutes, 1h 0m, hours+minutes, 1 day, days+hours. |
| `tests/alerting/incident-detection.test.ts` | Tests for incident state machine | VERIFIED | 8 test cases: open at 3 failures, no open below threshold, no duplicate with ongoing, resolve on success, no resolve without ongoing, cause from error, cause from statusCode, email failure resilience. |
| `tests/alerting/ssl-expiry.test.ts` | Tests for SSL expiry alerts | VERIFIED | 8 test cases: 30/14/7/1 day thresholds, no re-send for same, not within any, renewal reset, expired cert. |
| `tests/alerting/weekly-digest.test.ts` | Tests for weekly digest | VERIFIED | 11 test cases: skip non-Monday, skip before 9am, process after 9am, skip already sent, send next Monday, uptime percentages, past incidents, zero monitors skip, 100% uptime send, lastDigestSentAt update, error isolation. |
| `tests/alerting/incidents.test.ts` | Tests for incident CRUD | VERIFIED | 6 test cases: openIncident, resolveIncident, getOngoingIncident (null + found), getUserEmailForMonitor (found + null). |
| `tests/alerting/send-email.test.ts` | Tests for email send helper | VERIFIED | 4 test cases: correct parameters, no throw on error, no throw on network failure, warns without API key. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `worker/src/emails/send.ts` | `resend` | `new Resend(process.env.RESEND_API_KEY)` | WIRED | Line 11: `_resend = new Resend(process.env.RESEND_API_KEY)`. Resend constructor used with lazy init pattern. |
| `worker/src/incidents.ts` | `lib/db/schema.ts` | Drizzle ORM insert/update on incidents and monitors | WIRED | Line 11: `db.insert(incidents).values(...)`. Line 18: `db.update(monitors).set({ isUp: false })`. Line 30: `db.update(incidents).set({ status: "resolved" })`. |
| `worker/src/check-engine.ts` | `worker/src/incidents.ts` | openIncident, resolveIncident, getOngoingIncident | WIRED | Line 11-15: imports all 4 functions. Lines 158/163: `getOngoingIncident` + `openIncident`. Lines 189-192: `getOngoingIncident` + `resolveIncident`. |
| `worker/src/check-engine.ts` | `worker/src/ssl-expiry.ts` | checkSslExpiry call when sslExpiresAt present | WIRED | Line 22: `import { checkSslExpiry }`. Line 219: `await checkSslExpiry(db, monitor, result.sslExpiresAt)`. |
| `worker/src/check-engine.ts` | `worker/src/emails/send.ts` | sendAlertEmail for downtime and recovery | WIRED | Line 16: `import { sendAlertEmail }`. Line 175-179: sendAlertEmail for downtime. Line 205-209: sendAlertEmail for recovery. |
| `worker/src/rollup.ts` | `worker/src/digest.ts` | maybeProcessWeeklyDigest in maintenance job | WIRED | Line 4: `import { maybeProcessWeeklyDigest }`. Line 62: `await maybeProcessWeeklyDigest(db)`. |
| `worker/src/digest.ts` | `worker/src/emails/templates.ts` | weeklyDigestEmailHtml for content | WIRED | Line 10: `import { weeklyDigestEmailHtml, formatDuration }`. Line 135: `weeklyDigestEmailHtml({...})`. |
| `worker/src/digest.ts` | `lib/db/schema.ts` | Query heartbeatsDaily + incidents + monitors + users | WIRED | Line 2-7: imports `users, monitors, heartbeatsDaily, incidents` from schema. Lines 36-42: selectDistinct users+monitors. Lines 74-89: query heartbeatsDaily. Lines 105-118: query incidents. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ALR-01 | 05-01, 05-02 | User receives email when a monitor goes down | SATISFIED | Incident state machine opens at 3 consecutive failures, sends downtime email with cause, monitor name, URL. 8 incident-detection tests confirm. |
| ALR-02 | 05-01, 05-02 | User receives email when a monitor recovers (with downtime duration) | SATISFIED | Incident resolve on first success after incident, sends recovery email with `formatDuration(downtime)`. Tests confirm recovery email includes duration. |
| ALR-03 | 05-03 | User receives a weekly email digest with uptime percentages and notable incidents | SATISFIED | `maybeProcessWeeklyDigest` fires Monday after 9am UTC, queries 7-day uptime from heartbeatsDaily, queries past-week incidents, sends `weeklyDigestEmailHtml`. 11 digest tests confirm. |
| MON-07 | 05-01, 05-02 | User receives alerts when SSL certificates approach expiry (30, 14, 7, 1 day) | SATISFIED | `checkSslExpiry` fires at 30/14/7/1 thresholds with tightest-match dedup, renewal reset, expired cert handling. Wired into check engine for all monitors with `sslExpiresAt`. 8 SSL tests confirm. |

No orphaned requirements found. REQUIREMENTS.md traceability table maps MON-07, ALR-01, ALR-02, ALR-03 to Phase 5 and all are covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected |

No TODO, FIXME, PLACEHOLDER, empty implementations, or stub patterns found in any phase 5 files. All implementations are substantive.

### Human Verification Required

### 1. Downtime Email Visual Check

**Test:** Trigger a downtime email (configure a monitor pointing to a non-existent URL, wait for 3 consecutive failures)
**Expected:** Email arrives with red left border, "Monitor Down" heading, monitor name, URL, cause, detected time, and "View Monitor" CTA button. Stripe-inspired layout with white card on grey background.
**Why human:** Email rendering varies across clients (Gmail, Outlook, Apple Mail). Inline styles must be verified visually.

### 2. Recovery Email with Duration

**Test:** After downtime email received, restore the monitored URL and wait for recovery
**Expected:** Recovery email arrives with green left border, "Monitor Recovered" heading, correct human-readable downtime duration (e.g., "12m"), and "View Monitor" link.
**Why human:** Duration calculation accuracy and email rendering need visual confirmation.

### 3. SSL Expiry Alert Threshold Progression

**Test:** Monitor a domain with an SSL certificate expiring within 30 days, observe alerts over time
**Expected:** Alerts fire at each threshold (30, 14, 7, 1 day) without re-sending for the same threshold. Subject line shows correct days remaining.
**Why human:** Requires real SSL certificate with approaching expiry date; mock tests cover logic but not real-world timing.

### 4. Weekly Digest Content

**Test:** Wait until Monday after 9am UTC with active monitors
**Expected:** Digest email arrives with "Weekly Uptime Digest" heading, table of all monitors with uptime percentages, any incidents from the past week listed with name/duration/cause.
**Why human:** Digest content correctness with real data (actual uptime percentages, real incidents) and visual layout need manual review.

### 5. Resend Email Delivery

**Test:** Verify emails actually arrive via Resend in production/staging environment
**Expected:** All 4 email types deliver successfully with correct from address "Uptime Lens <alerts@uptimelens.io>"
**Why human:** Requires actual Resend API key and DNS configuration. Cannot verify deliverability programmatically.

### Gaps Summary

No gaps found. All 4 success criteria from ROADMAP.md are fully verified:

1. Downtime email on monitor transition to down (after 3 consecutive failures) -- incident state machine wired into check engine with getOngoingIncident guard and fire-and-forget email.
2. Recovery email with downtime duration -- incident resolution on first success, formatDuration calculates human-readable time.
3. SSL expiry alerts at 30/14/7/1 day thresholds -- tightest-match algorithm with dedup, renewal reset, expired cert handling.
4. Weekly email digest with uptime percentages and incidents -- Monday 9am UTC scheduling, heartbeatsDaily aggregation, per-user dedup via lastDigestSentAt, error isolation.

All 4 requirements (MON-07, ALR-01, ALR-02, ALR-03) are satisfied. 70 alerting tests pass. Worker TypeScript compiles cleanly. No anti-patterns detected.

---

_Verified: 2026-03-08T05:50:00Z_
_Verifier: Claude (gsd-verifier)_
