---
phase: 05-incident-detection-and-alerting
plan: 02
subsystem: worker, alerting
tags: [incident-detection, ssl-expiry, check-engine, state-machine, email-alerts]

# Dependency graph
requires:
  - phase: 04-check-engine
    provides: "Worker check engine tick loop, heartbeat storage, monitor state"
  - phase: 05-incident-detection-and-alerting
    plan: 01
    provides: "Incident CRUD module, email send helper, HTML alert templates, formatDuration"
provides:
  - "Incident state machine wired into check engine (open at 3 failures, close on recovery)"
  - "Downtime email alerts with cause derivation and recovery emails with duration"
  - "SSL expiry threshold alerts at 30/14/7/1 days with dedup and renewal reset"
  - "Fire-and-forget email pattern that never crashes check loop"
affects: [05-03, 06-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [incident state machine in check tick, SSL threshold tightest-match algorithm, expired cert as special threshold 0]

key-files:
  created:
    - worker/src/ssl-expiry.ts
    - tests/alerting/incident-detection.test.ts
    - tests/alerting/ssl-expiry.test.ts
  modified:
    - worker/src/check-engine.ts
    - tests/worker/check-engine.test.ts

key-decisions:
  - "SSL expiry uses tightest-match threshold algorithm: iterate descending [30,14,7,1], take last match for smallest crossed threshold"
  - "Expired cert (daysUntilExpiry < 0) handled as special threshold 0, separate from standard threshold logic"
  - "Incident open guard uses getOngoingIncident (not fragile consecutiveFailures check) per research Pitfall #4"

patterns-established:
  - "Incident state machine pattern: check after rollup upsert, open condition then close condition, fire-and-forget email in try/catch"
  - "SSL threshold dedup pattern: lastSslAlertDays tracks lowest threshold sent, reset to null on cert renewal"

requirements-completed: [ALR-01, ALR-02, MON-07]

# Metrics
duration: 7min
completed: 2026-03-08
---

# Phase 5 Plan 02: Incident Detection & SSL Expiry Alerts Summary

**Incident state machine wired into check engine tick with 3-failure threshold, recovery detection with duration, and SSL expiry alerts at 30/14/7/1 day thresholds with dedup**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-08T05:31:06Z
- **Completed:** 2026-03-08T05:38:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Incident state machine integrated into _checkMonitor: opens incidents at 3 consecutive failures with getOngoingIncident guard, resolves on first success
- Downtime alerts with cause derivation (error field, HTTP status code, or "Unknown") and recovery alerts with human-readable downtime duration
- SSL expiry alerts at 30/14/7/1 day thresholds with tightest-match dedup algorithm and cert renewal reset
- All email sends fire-and-forget with try/catch -- email failures never crash the check loop
- 167 total tests pass with zero regressions (16 new alerting tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Incident state machine tests and implementation** - `55a908e` (test: RED) -> `9bcdfed` (feat: GREEN)
2. **Task 2: SSL expiry threshold alerts with tests** - `cb7bbee` (test: RED) -> `1153ec8` (feat: GREEN)

_TDD tasks have RED (test) and GREEN (feat) commits._

## Files Created/Modified
- `worker/src/check-engine.ts` - Added incident state machine (open/close) and SSL expiry check after each monitor check
- `worker/src/ssl-expiry.ts` - SSL expiry threshold checking with tightest-match algorithm and cert renewal detection
- `tests/alerting/incident-detection.test.ts` - 8 tests covering incident open/close, cause derivation, email resilience
- `tests/alerting/ssl-expiry.test.ts` - 8 tests covering 30/14/7/1 day thresholds, dedup, renewal reset, expired cert
- `tests/worker/check-engine.test.ts` - Updated with incident/email/ssl mocks to prevent regression from new imports

## Decisions Made
- SSL expiry uses tightest-match threshold algorithm (iterate descending, take last match) rather than first-match, ensuring alerts fire for the correct threshold when multiple are crossed
- Expired cert handled as special threshold 0 with `daysUntilExpiry < 0` check, separate from standard threshold logic to avoid dedup guard blocking expired alerts
- Incident open guard uses getOngoingIncident query (robust) rather than checking `consecutiveFailures < 3` (fragile), per research Pitfall #4 for worker restart resilience

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing check-engine tests with incident/email/ssl mocks**
- **Found during:** Task 1 (GREEN phase verification)
- **Issue:** Existing check-engine.test.ts did not mock the newly imported incident, email, and ssl-expiry modules, causing `db.select().from().where().limit is not a function` errors when getOngoingIncident was called
- **Fix:** Added vi.mock declarations for incidents, emails/send, emails/templates, and ssl-expiry modules. Added isUp and lastSslAlertDays to mock monitor factory.
- **Files modified:** tests/worker/check-engine.test.ts
- **Verification:** All 13 existing check-engine tests pass with new mocks
- **Committed in:** 9bcdfed (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Fixed SSL threshold algorithm from first-match to tightest-match**
- **Found during:** Task 2 (GREEN phase test failures)
- **Issue:** `SSL_THRESHOLDS.find(t => daysUntilExpiry <= t)` with [30,14,7,1] returned 30 (first match) for daysUntilExpiry=10, but the correct threshold is 14 (tightest match). This caused 14/7/1-day alerts to never fire when a higher threshold was already tracked.
- **Fix:** Changed from Array.find to iterative loop that takes the last match (tightest threshold), and separated expired cert as special threshold 0.
- **Files modified:** worker/src/ssl-expiry.ts
- **Verification:** All 8 SSL expiry tests pass including threshold progression and expired cert
- **Committed in:** 1153ec8 (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Incident detection and SSL expiry alerts fully wired into check engine
- Ready for Plan 03 (weekly digest cron job) to complete Phase 5
- All email templates from Plan 01 are now consumed by the check engine
- 167 tests passing with comprehensive alerting coverage

## Self-Check: PASSED

All 5 created/modified files verified present. All 4 task commits verified in git log.

---
*Phase: 05-incident-detection-and-alerting*
*Completed: 2026-03-08*
