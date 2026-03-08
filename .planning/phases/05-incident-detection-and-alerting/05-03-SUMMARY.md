---
phase: 05-incident-detection-and-alerting
plan: 03
subsystem: alerting
tags: [email, digest, cron, drizzle, vitest, tdd]

# Dependency graph
requires:
  - phase: 05-01
    provides: "sendAlertEmail, weeklyDigestEmailHtml, formatDuration, lastDigestSentAt column"
  - phase: 04-02
    provides: "startMaintenanceJob, heartbeatsDaily rollup data"
provides:
  - "maybeProcessWeeklyDigest -- weekly digest scheduling, query, and per-user send"
  - "Digest wired into maintenance job (no new infrastructure)"
affects: [06-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-user-digest-dedup-via-timestamp, error-isolation-per-user-loop]

key-files:
  created:
    - worker/src/digest.ts
    - tests/alerting/weekly-digest.test.ts
  modified:
    - worker/src/rollup.ts

key-decisions:
  - "selectDistinct + innerJoin to find users with monitors (skips zero-monitor users at query level)"
  - "Per-user lastDigestSentAt check prevents double-sends on same Monday"
  - "No data for a monitor = 100% uptime assumption (new monitors with no checks)"
  - "Ongoing incidents (no resolvedAt) shown as 'Ongoing' duration"

patterns-established:
  - "Digest dedup: timestamp column on user row, compared against current Monday 00:00 UTC"
  - "Error isolation: try/catch per user in loop so one failure does not block others"

requirements-completed: [ALR-03]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 5 Plan 3: Weekly Email Digest Summary

**Weekly digest email with Monday 9am UTC scheduling, 7-day uptime percentages, incident history, and per-user dedup via lastDigestSentAt**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T05:31:00Z
- **Completed:** 2026-03-08T05:35:06Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Weekly digest fires on Monday after 9am UTC with proper scheduling gates
- Dedup via lastDigestSentAt prevents double-sends on same Monday
- Digest includes 7-day uptime percentages per monitor and past week's incidents
- Error isolation ensures one user's email failure doesn't block others
- Wired into existing maintenance job with zero new infrastructure

## Task Commits

Each task was committed atomically:

1. **Task 1: Weekly digest tests (RED)** - `8abdd4f` (test)
2. **Task 1: Weekly digest implementation (GREEN)** - `8bf90d7` (feat)
3. **Task 2: Wire digest into maintenance job** - `5d4d271` (feat)

**Plan metadata:** (pending) (docs: complete plan)

_Note: Task 1 used TDD with separate RED and GREEN commits_

## Files Created/Modified
- `worker/src/digest.ts` - Weekly digest scheduling, uptime query, incident query, per-user send
- `tests/alerting/weekly-digest.test.ts` - 11 tests: scheduling, content, dedup, resilience
- `worker/src/rollup.ts` - Added maybeProcessWeeklyDigest call in maintenance job callback

## Decisions Made
- Used selectDistinct + innerJoin to find users with monitors (skips zero-monitor users at query level)
- Per-user lastDigestSentAt compared against Monday 00:00 UTC for dedup
- No rollup data for a monitor = 100% uptime assumption (new monitors with no checks yet)
- Ongoing incidents (no resolvedAt) shown as "Ongoing" duration string

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (Incident Detection and Alerting) is now fully complete
- All three plans delivered: alerting foundation (05-01), incident detection (05-02), weekly digest (05-03)
- Ready for Phase 6 (Dashboard and Visualization)
- Pre-existing test timeout in tests/email/resend.test.ts (unrelated to this plan) noted but not addressed

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 05-incident-detection-and-alerting*
*Completed: 2026-03-08*
