---
phase: 06-dashboard
plan: 01
subsystem: ui
tags: [recharts, drizzle, dashboard, monitor-list, queries, uptime]

# Dependency graph
requires:
  - phase: 04-check-engine
    provides: heartbeats, heartbeatsHourly, heartbeatsDaily tables with data
  - phase: 05-alerting
    provides: incidents table with data, monitors.isUp field
  - phase: 03-monitors
    provides: MonitorPanel component, monitor CRUD actions
provides:
  - lib/queries/monitors.ts with getMonitorsWithStats and getMonitorById
  - lib/queries/uptime.ts with getUptimeForAllRanges
  - lib/queries/charts.ts with getChartData (resolution switching)
  - lib/queries/incidents.ts with getIncidentsForMonitor (paginated)
  - lib/utils.ts with formatDuration, formatResponseTime, getRangeSince
  - Enhanced MonitorList with status dots, response time, 24h uptime, navigation
affects: [06-02-detail-page]

# Tech tracking
tech-stack:
  added: [recharts@3.8.0]
  patterns: [query-modules-in-lib-queries, enriched-monitor-type, n-plus-1-for-small-sets]

key-files:
  created:
    - lib/queries/monitors.ts
    - lib/queries/uptime.ts
    - lib/queries/charts.ts
    - lib/queries/incidents.ts
  modified:
    - lib/utils.ts
    - components/monitors/monitor-list.tsx
    - app/(dashboard)/dashboard/page.tsx
    - package.json

key-decisions:
  - "N+1 query approach for monitor stats (simple, fine for 5-20 monitors)"
  - "Row click navigates to /monitors/[id] via Link, replacing openEdit panel behavior"
  - "Down monitors display '--' for response time"

patterns-established:
  - "Query modules in lib/queries/ for data access functions"
  - "Enriched type via Awaited<ReturnType<typeof query>> for server-to-client data passing"
  - "getRangeSince utility for consistent time range filtering across queries"

requirements-completed: [DASH-01]

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 6 Plan 1: Data Layer and Monitor List Summary

**Recharts installed, five query modules created (monitors, uptime, charts, incidents), and monitor list upgraded with status dots, response time, 24h uptime, and detail page navigation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T06:32:55Z
- **Completed:** 2026-03-08T06:38:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Installed recharts@3.8.0 for response time charts (React 19.2 compatible)
- Created five query/utility modules providing the complete data layer for dashboard and detail page
- Upgraded MonitorList with status dots (green/red/gray), latest response time, 24h uptime percentage, and summary bar
- Row click now navigates to /monitors/[id] detail page via Next.js Link (replacing edit panel click)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Recharts, create query modules and utilities** - `dc9baa5` (feat)
2. **Task 2: Upgrade monitor list with status, response time, uptime, and navigation** - `bfd84ab` (feat)

## Files Created/Modified
- `lib/queries/monitors.ts` - getMonitorsWithStats (enriched monitor list), getMonitorById (with ownership check)
- `lib/queries/uptime.ts` - getUptimeForAllRanges (4 time ranges, hourly/daily table switching)
- `lib/queries/charts.ts` - getChartData (resolution switching: raw/hourly/daily by range)
- `lib/queries/incidents.ts` - getIncidentsForMonitor (paginated, ongoing pinned first)
- `lib/utils.ts` - Added formatDuration, formatResponseTime, getRangeSince helpers
- `components/monitors/monitor-list.tsx` - Enhanced with status dots, response time, uptime, Link navigation, summary bar
- `app/(dashboard)/dashboard/page.tsx` - Uses getMonitorsWithStats instead of inline Drizzle query
- `package.json` - Added recharts@3.8.0 dependency

## Decisions Made
- N+1 query pattern for monitor stats: simple and appropriate for indie dev scale (5-20 monitors)
- Row click navigates to /monitors/[id] via Next.js Link component, completely replacing the old openEdit panel behavior
- Down monitors show "--" for response time (not last known value) for clarity
- formatDuration duplicated from worker/src/emails/templates.ts to avoid cross-package imports
- Uptime color thresholds: green >= 99.5%, amber >= 95%, red < 95%

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All query modules ready for Plan 02 (monitor detail page) to consume
- getMonitorById, getChartData, getUptimeForAllRanges, getIncidentsForMonitor all prepared for the detail page
- Recharts installed and ready for response time chart component

## Self-Check: PASSED

All 4 created files verified present. All 4 modified files verified present. Both task commits (dc9baa5, bfd84ab) verified in git log.

---
*Phase: 06-dashboard*
*Completed: 2026-03-08*
