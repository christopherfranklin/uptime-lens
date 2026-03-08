---
phase: 05-incident-detection-and-alerting
plan: 01
subsystem: worker, email, database
tags: [resend, drizzle, email-templates, incidents, alerting]

# Dependency graph
requires:
  - phase: 01-project-scaffolding
    provides: "Drizzle schema, Resend client pattern, email template branding"
  - phase: 04-check-engine
    provides: "Worker process, check engine tick loop, heartbeat storage"
provides:
  - "isUp boolean on monitors table for dashboard up/down status"
  - "lastSslAlertDays on monitors for SSL alert deduplication"
  - "lastDigestSentAt on users for weekly digest tracking"
  - "sendAlertEmail fire-and-forget email helper for worker"
  - "4 HTML email templates: downtime, recovery, SSL expiry, weekly digest"
  - "formatDuration utility for human-readable time strings"
  - "Incident CRUD: openIncident, resolveIncident, getOngoingIncident, getUserEmailForMonitor"
affects: [05-02, 05-03, 06-dashboard]

# Tech tracking
tech-stack:
  added: [resend (worker uses root's)]
  patterns: [fire-and-forget email sends, lazy Resend init, HTML template literals with emailWrapper, function constructor mocks in Vitest 4]

key-files:
  created:
    - worker/src/emails/send.ts
    - worker/src/emails/templates.ts
    - worker/src/incidents.ts
    - drizzle/0001_add-alerting-fields.sql
    - tests/alerting/incidents.test.ts
    - tests/alerting/send-email.test.ts
    - tests/alerting/email-templates.test.ts
    - tests/alerting/format-duration.test.ts
  modified:
    - lib/db/schema.ts
    - worker/package.json

key-decisions:
  - "Worker uses root's resend package (not local install) to avoid dual-installation type conflicts, same as drizzle-orm"
  - "HTML template literal strings instead of React Email components -- worker lacks JSX and alert emails are simple enough"
  - "Vitest 4 constructor mocks require function keyword (not arrow functions) for vi.mock factory implementations"
  - "sendAlertEmail exports _resetClient for test isolation -- avoids vi.resetModules which breaks mock resolution"

patterns-established:
  - "Email template pattern: template function -> emailWrapper(content, previewText) -> full HTML document"
  - "Incident module pattern: pure functions taking WorkerDb as first parameter for testability"
  - "Worker Resend mock pattern: use function constructor in vi.mock factory, static import with _resetClient for test isolation"

requirements-completed: [ALR-01, ALR-02, MON-07]

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 5 Plan 01: Alerting Foundation Summary

**Incident CRUD module, Resend email helper, 4 HTML alert templates (downtime/recovery/SSL/digest), and schema fields for up/down tracking**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-08T05:17:02Z
- **Completed:** 2026-03-08T05:27:30Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Schema extended with isUp, lastSslAlertDays, lastDigestSentAt fields plus migration SQL
- Worker email infrastructure: Resend send helper with lazy init, fire-and-forget error handling
- Incident CRUD module: openIncident (inserts + sets isUp=false), resolveIncident (updates + sets isUp=true), getOngoingIncident, getUserEmailForMonitor
- 4 branded HTML email templates with Stripe-inspired layout, color-coded alerts (red/green/amber), View Monitor links
- formatDuration utility covering seconds through days
- 43 alerting tests pass, 140 total tests with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes, email send helper, incident module** - `a3ee056` (test: failing tests) -> `94c6255` (feat: implementation)
2. **Task 2: Email templates and duration formatter** - `8e89655` (test: failing tests) -> `6d3f810` (feat: implementation)

_TDD tasks have RED (test) and GREEN (feat) commits._

## Files Created/Modified
- `lib/db/schema.ts` - Added isUp, lastSslAlertDays to monitors; lastDigestSentAt to users
- `drizzle/0001_add-alerting-fields.sql` - Migration SQL with backfill for existing active monitors
- `worker/package.json` - Removed local drizzle-orm, removed local resend (use root's)
- `worker/src/emails/send.ts` - Resend send helper with lazy init and fire-and-forget error handling
- `worker/src/emails/templates.ts` - emailWrapper, formatDuration, downtimeEmailHtml, recoveryEmailHtml, sslExpiryEmailHtml, weeklyDigestEmailHtml
- `worker/src/incidents.ts` - openIncident, resolveIncident, getOngoingIncident, getUserEmailForMonitor
- `tests/alerting/incidents.test.ts` - 6 tests for incident CRUD operations
- `tests/alerting/send-email.test.ts` - 4 tests for email send with mock Resend
- `tests/alerting/email-templates.test.ts` - 25 tests for 4 email templates + wrapper
- `tests/alerting/format-duration.test.ts` - 8 tests for duration formatting

## Decisions Made
- Worker uses root's resend package (not local install) to avoid dual-installation type conflicts, consistent with the drizzle-orm approach from Phase 4
- HTML template literal strings instead of React Email components since worker lacks JSX and alert emails are simple factual content
- Vitest 4 constructor mocks require `function` keyword (not arrow functions) for vi.mock factory implementations -- discovered during test development
- sendAlertEmail exports `_resetClient()` for test isolation instead of using `vi.resetModules()` which breaks cross-package mock resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed worker's local drizzle-orm and resend to fix dual-installation type conflicts**
- **Found during:** Task 1 (worker type-check after adding new modules)
- **Issue:** Worker had drizzle-orm and resend installed locally alongside root's copies, causing TypeScript type incompatibility errors (private property conflicts between two copies of the same package)
- **Fix:** Removed drizzle-orm and resend from worker/package.json, deleted from worker/node_modules. Worker now uses root's packages via tsconfig rootDir resolution.
- **Files modified:** worker/package.json, worker/package-lock.json
- **Verification:** `cd worker && npx tsc --noEmit` compiles cleanly
- **Committed in:** 94c6255 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Vitest 4 constructor mock pattern for resend**
- **Found during:** Task 1 (send-email tests timing out / not intercepting)
- **Issue:** vi.mock("resend") with arrow function constructor mock failed in Vitest 4 -- "did not use 'function' or 'class' in its implementation"
- **Fix:** Used `function MockResend()` instead of arrow function, plus static import with `_resetClient()` instead of `vi.resetModules()` for test isolation
- **Files modified:** tests/alerting/send-email.test.ts, worker/src/emails/send.ts
- **Verification:** All 4 send-email tests pass with proper mock interception
- **Committed in:** 94c6255 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correct compilation and test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. RESEND_API_KEY is already configured from Phase 1.

## Next Phase Readiness
- Incident module ready for Plan 02 to wire into check engine state machine
- Email templates ready for Plan 02 (downtime/recovery/SSL alerts) and Plan 03 (weekly digest)
- Schema fields deployed for up/down tracking and SSL alert deduplication
- formatDuration ready for recovery email duration calculation

## Self-Check: PASSED

All 9 created/modified files verified present. All 4 task commits verified in git log.

---
*Phase: 05-incident-detection-and-alerting*
*Completed: 2026-03-08*
