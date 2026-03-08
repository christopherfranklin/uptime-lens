---
phase: 04-check-engine
plan: 02
subsystem: worker
tags: [check-engine, tick-loop, heartbeats, rollup, drizzle, vitest, tdd, promise-allsettled]

# Dependency graph
requires:
  - phase: 04-check-engine
    plan: 01
    provides: ProbeResult interface, HTTP/TCP/SSL probe functions, URL parsing helpers, Worker Drizzle DB client
provides:
  - Check engine tick loop (30s interval) that queries due monitors and dispatches probes
  - Heartbeat storage with status, responseTimeMs, statusCode, error, sslExpiresAt
  - consecutiveFailures tracking (increment on failure, reset on success)
  - Hourly rollup upsert with running average, min, max response times
  - Daily rollup aggregation from hourly data
  - Old heartbeat cleanup (7-day retention)
  - Worker entry point integration with graceful shutdown
affects: [05-alerting, 06-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [tick-loop with setInterval, Promise.allSettled for parallel probes, Drizzle onConflictDoUpdate for upserts, SQL running average formula]

key-files:
  created:
    - worker/src/check-engine.ts
    - worker/src/rollup.ts
    - tests/worker/check-engine.test.ts
    - tests/worker/rollup.test.ts
  modified:
    - worker/src/index.ts

key-decisions:
  - "Removed worker's local drizzle-orm from node_modules to resolve dual-installation type conflicts with root node_modules"
  - "verifyDatabase uses static import of sql from drizzle-orm instead of dynamic import for type safety"

patterns-established:
  - "Tick loop pattern: 30s setInterval calling async tick(), immediate first tick on startup"
  - "Parallel probe dispatch: Promise.allSettled to check all due monitors without one failure blocking others"
  - "Running average via SQL: (oldAvg * oldCount + newValue) / (oldCount + 1) in onConflictDoUpdate"
  - "Graceful shutdown: clearInterval for all background jobs before closing HTTP server"

requirements-completed: [CHK-01, CHK-02, CHK-03]

# Metrics
duration: 7min
completed: 2026-03-08
---

# Phase 4 Plan 2: Check Engine Tick Loop & Rollups Summary

**30-second tick loop querying due monitors, dispatching HTTP/TCP/SSL probes in parallel, storing heartbeats with consecutiveFailures tracking, and maintaining hourly/daily rollup aggregates**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-08T01:52:45Z
- **Completed:** 2026-03-08T02:00:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Check engine tick loop runs every 30 seconds, queries due monitors where lastCheckedAt is null or elapsed >= checkIntervalSeconds
- HTTP/TCP/SSL monitors dispatched to correct probe based on type, all in parallel via Promise.allSettled
- Heartbeat records stored with full ProbeResult fields; consecutiveFailures increments on failure, resets to 0 on success
- Hourly rollup upserted after each check with running average, min, max response times
- Daily rollup aggregation from hourly data and 7-day heartbeat cleanup run every 4 hours
- Worker entry point wired up with graceful shutdown clearing all intervals
- 21 new tests (13 check-engine + 8 rollup), 97 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing tests for check engine** - `ed8d728` (test)
2. **Task 1 GREEN: Implement check engine tick loop** - `11408a7` (feat)
3. **Task 2 RED: Add failing tests for rollup logic** - `a74f557` (test)
4. **Task 2 GREEN: Implement rollup logic** - `5981163` (feat)
5. **Task 3: Wire into worker entry point** - `c7d8eec` (feat)

## Files Created/Modified
- `worker/src/check-engine.ts` - Tick loop orchestrator: query due monitors, dispatch probes, store heartbeats, update monitor state, call rollup
- `worker/src/rollup.ts` - Hourly upsert with running average formula, daily aggregation via raw SQL, old heartbeat cleanup
- `worker/src/index.ts` - Updated entry point: createWorkerDb, startCheckEngine, startMaintenanceJob, graceful shutdown with interval cleanup
- `tests/worker/check-engine.test.ts` - 13 tests for tick loop, probe dispatch, heartbeat storage, consecutiveFailures logic
- `tests/worker/rollup.test.ts` - 8 tests for hourly upsert, running average, daily aggregation, cleanup

## Decisions Made
- Removed worker's local `node_modules/drizzle-orm` to resolve dual-installation type conflicts -- both root and worker had identical v0.45.1 but TypeScript treated them as incompatible types due to separate private class declarations
- Changed `verifyDatabase` from dynamic import (`await import("drizzle-orm")`) to static import for consistent type resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved dual drizzle-orm installation type conflicts**
- **Found during:** Task 3 (worker entry point wiring)
- **Issue:** Worker's local `node_modules/drizzle-orm` and root's `node_modules/drizzle-orm` were both v0.45.1 but TypeScript treated them as incompatible types due to separate private class field declarations, causing 12 type errors
- **Fix:** Removed worker's local `node_modules/drizzle-orm` so it resolves from root; changed dynamic import to static import in verifyDatabase
- **Files modified:** worker/src/index.ts
- **Verification:** `cd worker && npx tsc --noEmit` compiles cleanly
- **Committed in:** c7d8eec (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary for compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Check engine is fully operational: monitors are queried, probed, and results stored as heartbeats with rollup aggregation
- consecutiveFailures tracking provides the signal Phase 5 (alerting) needs to detect incidents
- Hourly and daily rollups provide the aggregated data Phase 6 (dashboard) needs for charts
- Worker graceful shutdown ensures clean process lifecycle

## Self-Check: PASSED

All 5 created/modified files verified present. All 5 commit hashes (ed8d728, 11408a7, a74f557, 5981163, c7d8eec) verified in git log.

---
*Phase: 04-check-engine*
*Completed: 2026-03-08*
