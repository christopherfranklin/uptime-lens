---
phase: 03-monitor-management
plan: 01
subsystem: api
tags: [drizzle, server-actions, crud, next.js, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Database schema with monitors table, Drizzle ORM setup, db proxy"
  - phase: 02-authentication
    provides: "verifySession() DAL function for auth enforcement"
provides:
  - "Four server actions: createMonitor, updateMonitor, deleteMonitor, toggleMonitorStatus"
  - "Dashboard page queries monitors for authenticated user sorted newest first"
  - "Input validation for HTTP URLs, TCP host:port, SSL URLs"
  - "Ownership verification on all mutation actions"
affects: [03-monitor-management, 04-check-engine, 05-incidents-alerting]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Server actions with FormData for CRUD mutations", "Ownership verification pattern (select + check before mutate)", "Type-specific input validation (HTTP URL, TCP host:port, SSL URL)"]

key-files:
  created:
    - app/actions/monitors.ts
    - tests/monitors/actions.test.ts
  modified:
    - app/(dashboard)/dashboard/page.tsx

key-decisions:
  - "Manual validation (no Zod) for server actions -- forms are simple (3-5 fields)"
  - "Type and URL locked after creation (updateMonitor excludes these fields)"
  - "Ownership verified via AND clause (monitors.id AND monitors.userId) before every mutation"

patterns-established:
  - "Server action pattern: verifySession() -> validate input -> verify ownership -> execute -> revalidatePath"
  - "FormData extraction pattern for server actions with type casting"
  - "Delegate pattern for vi.mock in test files (continued from Phase 2)"

requirements-completed: [MON-01, MON-02, MON-03, MON-04]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 3 Plan 1: Monitor CRUD Server Actions Summary

**Four server actions (create/update/delete/toggle) with auth enforcement, ownership verification, type-specific input validation, and 20 passing unit tests via TDD**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T00:35:23Z
- **Completed:** 2026-03-08T00:40:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Four server actions exported from `app/actions/monitors.ts` covering full CRUD lifecycle
- Input validation covers HTTP/SSL URL format, TCP host:port with port 1-65535, required fields
- Ownership verification on update, delete, and toggle prevents cross-user access
- Dashboard page fetches authenticated user's monitors sorted newest first
- 20 unit tests covering happy paths, validation errors, ownership rejection, and auth enforcement

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests** - `bc091a9` (test)
2. **Task 1 (GREEN): Implement server actions** - `7c4094e` (feat)
3. **Task 2: Update dashboard page** - `610bcbc` (feat)

_TDD task had RED and GREEN commits._

## Files Created/Modified
- `app/actions/monitors.ts` - Server actions for createMonitor, updateMonitor, deleteMonitor, toggleMonitorStatus
- `tests/monitors/actions.test.ts` - 20 unit tests covering all four actions with mocked DB and session
- `app/(dashboard)/dashboard/page.tsx` - Added Drizzle query for user's monitors with debug JSON output

## Decisions Made
- Manual validation (no Zod library) -- forms are simple with 3-5 fields, no benefit from adding a dependency
- Type and URL are locked after creation -- updateMonitor explicitly excludes these fields from the update object
- Ownership verified via compound WHERE clause (id AND userId) before every mutation
- Used `returning({ id: monitors.id })` on insert to get the new monitor ID without a separate query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Server actions ready for Plan 02's UI components (MonitorList, MonitorPanel, slide-out create/edit)
- Dashboard page has monitor data query in place; Plan 02 replaces the rendering with `<MonitorList monitors={userMonitors} />`
- All four requirements (MON-01 through MON-04) handled at the action level

## Self-Check: PASSED

All files verified present. All commit hashes confirmed in git log.

---
*Phase: 03-monitor-management*
*Completed: 2026-03-07*
