# Phase 6: Dashboard - Research

**Researched:** 2026-03-08
**Domain:** React dashboard UI, charting, data aggregation queries, Next.js dynamic routes
**Confidence:** HIGH

## Summary

Phase 6 delivers the visualization and data display layer: upgrading the monitor list with status/response-time data, creating a dedicated monitor detail page with response time charts, uptime percentages, and incident history. The tech stack is well-established: Recharts v3.8.0 (confirmed React 19.2 compatible via peer deps), Drizzle ORM for data queries, Next.js 16 dynamic routes for the detail page, and the existing Base UI + Tailwind v4 component library.

The main implementation challenges are: (1) writing efficient Drizzle queries against the three data tables (heartbeats, heartbeats_hourly, heartbeats_daily) with proper time-range filtering and resolution switching, (2) structuring the server/client component boundary correctly -- server components for data fetching, a client component for the interactive chart/time-range selector, and (3) correctly implementing the 60-second auto-refresh without visible loading spinners.

**Primary recommendation:** Use Recharts 3.8.0 with AreaChart + gradient fill for response time visualization. Fetch data server-side via Drizzle queries in dedicated `lib/queries/` files, pass serialized data to client components, and use `useRouter().refresh()` or `router.refresh()` on a 60-second interval for silent re-fetching.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Monitor detail view at dedicated `/monitors/[id]` route (not slide-out panel)
- Clicking a monitor row navigates to detail page (replaces Phase 3 click-to-edit)
- Layout order: header -> response time chart -> uptime percentages -> incident log
- Edit button on detail page opens existing slide-out panel (reuse Phase 3 panel)
- Global time range selector (24h, 7d, 30d, 90d) controls all sections at once
- Auto-refresh data every 60 seconds (silent re-fetch, no loading spinners on refresh)
- Recharts library for response time charts (not Tremor)
- Line chart with area fill (light gradient below the line)
- Average response time only (no min/max bands)
- Hover tooltip shows exact timestamp and response time
- Data resolution: 24h = raw heartbeats, 7d = hourly rollups, 30d/90d = daily rollups
- Monitor list row shows: status dot (green=up, red=down, gray=paused), name, URL, type badge, latest response time, 24h uptime percentage
- Summary bar: "5 monitors: 4 up, 1 down" (or "all operational")
- Create button ("+ New") in the summary bar header
- Row click navigates to `/monitors/[id]` detail page
- Down monitors show response time as "--" or last known value
- Incident history: chronological log, newest first, 10 initially + "Show more"
- Ongoing incidents pinned at top with red dot and "Ongoing" label with live duration
- Incident list filtered by global time range selector
- Empty state: "No incidents in the last [time range]"

### Claude's Discretion
- Recharts configuration details (colors, grid, axis formatting, responsive container)
- Uptime percentage display format on detail page (cards, inline text, etc.)
- Loading states and skeleton screens
- Back navigation implementation (link vs router.back)
- Server component vs client component boundaries for the detail page
- Data fetching functions organization (lib/queries/ or colocated)
- "Show more" implementation (client state vs URL params)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | User sees all monitors in a list with current status (up/down/paused) and response time | Enhanced MonitorList component with status dots (green/red/gray using `monitors.isUp` + `monitors.status`), latest heartbeat response time, and 24h uptime from daily rollups |
| DASH-02 | User can view response time charts for a monitor (24h, 7d, 30d, 90d) | Recharts 3.8.0 AreaChart with gradient fill, data from heartbeats (24h), heartbeatsHourly (7d), heartbeatsDaily (30d/90d) |
| DASH-03 | User can see uptime percentages per monitor (24h, 7d, 30d, 90d) | Computed from heartbeatsHourly (24h/7d) and heartbeatsDaily (30d/90d) as `SUM(successfulChecks) / SUM(totalChecks) * 100` |
| DASH-04 | User can view a log of downtime incidents per monitor with start/end times and duration | Query incidents table filtered by monitorId + time range, ordered by startedAt DESC, paginated with LIMIT/OFFSET |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 | Response time charts (AreaChart with gradient) | React 19.2 compatible via peer deps (`react: ^19.0.0`), well-maintained, declarative API, SVG-based |
| drizzle-orm | 0.45.1 (existing) | Data queries for charts/uptime/incidents | Already used throughout project, direct SQL support for aggregations |
| next | 16.1.6 (existing) | Dynamic route `/monitors/[id]`, searchParams, server components | Already the project framework |
| @base-ui/react | 1.2.0 (existing) | Dialog for edit panel reuse | Already used for MonitorPanel and DeleteDialog |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-is | 19.x (peer dep) | Required peer dependency for recharts | Installed automatically with recharts 3.8.0 |
| lucide-react | 0.577.0 (existing) | Icons for back navigation, status indicators | Already available in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Tremor | Tremor has unverified React 19.2 compatibility (noted in STATE.md blockers); Recharts confirmed working |
| Recharts | Visx | Lower-level, more work for standard charts; Recharts covers the use case directly |
| URL searchParams for time range | Client state | URL params allow shareable links and survive refresh; use searchParams |

**Installation:**
```bash
npm install recharts@3.8.0
```

Note: `react-is` is listed as a peer dependency of recharts 3.8.0 (`^19.0.0`). The dry-run install completes without peer dependency warnings with React 19.2.3. No `--force` or `--legacy-peer-deps` needed.

## Architecture Patterns

### Recommended Project Structure
```
app/(dashboard)/
  dashboard/
    page.tsx                    # Enhanced: fetch monitors + latest heartbeat + 24h uptime
  monitors/
    [id]/
      page.tsx                  # NEW: server component, fetches all detail data
lib/
  queries/
    monitors.ts                 # NEW: dashboard list queries (monitors + response time + uptime)
    charts.ts                   # NEW: chart data queries (heartbeats, hourly, daily by time range)
    uptime.ts                   # NEW: uptime percentage queries
    incidents.ts                # NEW: incident history queries with pagination
components/
  monitors/
    monitor-list.tsx            # MODIFIED: enhanced with response time, uptime, summary bar, nav
    monitor-detail.tsx          # NEW: client component wrapper for detail page interactivity
    response-chart.tsx          # NEW: client component with Recharts AreaChart
    uptime-cards.tsx            # NEW: uptime percentage display (4 time ranges)
    incident-log.tsx            # NEW: client component for incident list with "Show more"
    monitor-panel.tsx           # EXISTING: reused on detail page for edit
    delete-dialog.tsx           # EXISTING: reused on detail page for delete
```

### Pattern 1: Server/Client Component Boundary for Detail Page
**What:** The detail page server component fetches all data and passes it as props to client children. The client wrapper manages the time range selector and auto-refresh.
**When to use:** When you need interactive controls (time range, auto-refresh) but want server-side data fetching.
**Example:**
```typescript
// app/(dashboard)/monitors/[id]/page.tsx (Server Component)
import { verifySession } from "@/lib/dal";
import { getMonitorById } from "@/lib/queries/monitors";
import { getChartData } from "@/lib/queries/charts";
import { getUptimeData } from "@/lib/queries/uptime";
import { getIncidents } from "@/lib/queries/incidents";
import { MonitorDetail } from "@/components/monitors/monitor-detail";

export default async function MonitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await verifySession();
  const { id } = await params;
  const { range = "24h" } = await searchParams;

  const monitorId = Number(id);
  // Fetch all data in parallel
  const [monitor, chartData, uptimeData, incidentData] = await Promise.all([
    getMonitorById(monitorId, session.user.id),
    getChartData(monitorId, range),
    getUptimeData(monitorId),
    getIncidents(monitorId, range, 10, 0),
  ]);

  if (!monitor) notFound();

  return (
    <MonitorDetail
      monitor={monitor}
      chartData={chartData}
      uptimeData={uptimeData}
      incidents={incidentData}
      currentRange={range}
    />
  );
}
```

### Pattern 2: Time Range via URL Search Params
**What:** Use URL `?range=24h|7d|30d|90d` to control time range. Client component updates URL with `router.push()` (shallow). Server component reads `searchParams` to determine data resolution.
**When to use:** For the global time range selector that controls chart, uptime, and incidents.
**Example:**
```typescript
// Inside client component
"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function TimeRangeSelector({ currentRange }: { currentRange: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`${pathname}?${params.toString()}`);
  }
  // ...
}
```

### Pattern 3: Silent Auto-Refresh with router.refresh()
**What:** Use `setInterval` with `router.refresh()` every 60 seconds to re-fetch server component data without triggering loading states.
**When to use:** For the 60-second auto-refresh requirement on the detail page.
**Example:**
```typescript
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AutoRefresh({ interval = 60_000 }: { interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), interval);
    return () => clearInterval(id);
  }, [router, interval]);
  return null;
}
```

### Pattern 4: Data Resolution Switching
**What:** Query different tables based on the selected time range for optimal performance.
**When to use:** For chart data queries.
**Example:**
```typescript
// lib/queries/charts.ts
import { db, heartbeats, heartbeatsHourly, heartbeatsDaily } from "@/lib/db";

export async function getChartData(monitorId: number, range: string) {
  const now = new Date();
  const since = getRangeSince(range, now);

  switch (range) {
    case "24h":
      // Raw heartbeats for highest resolution
      return db.select({
        time: heartbeats.checkedAt,
        responseTime: heartbeats.responseTimeMs,
      })
      .from(heartbeats)
      .where(and(
        eq(heartbeats.monitorId, monitorId),
        gte(heartbeats.checkedAt, since),
      ))
      .orderBy(asc(heartbeats.checkedAt));

    case "7d":
      // Hourly rollups
      return db.select({
        time: heartbeatsHourly.hour,
        responseTime: heartbeatsHourly.avgResponseTimeMs,
      })
      .from(heartbeatsHourly)
      .where(and(
        eq(heartbeatsHourly.monitorId, monitorId),
        gte(heartbeatsHourly.hour, since),
      ))
      .orderBy(asc(heartbeatsHourly.hour));

    case "30d":
    case "90d":
      // Daily rollups
      return db.select({
        time: heartbeatsDaily.date,
        responseTime: heartbeatsDaily.avgResponseTimeMs,
      })
      .from(heartbeatsDaily)
      .where(and(
        eq(heartbeatsDaily.monitorId, monitorId),
        gte(heartbeatsDaily.date, since),
      ))
      .orderBy(asc(heartbeatsDaily.date));
  }
}
```

### Pattern 5: Recharts AreaChart with Gradient Fill
**What:** Use SVG `<defs>` with `<linearGradient>` for the area fill under the response time line.
**When to use:** For the response time chart component.
**Example:**
```typescript
"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

function ResponseChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="time"
          tickFormatter={(val) => formatTimeLabel(val)}
          stroke="var(--muted-foreground)"
          fontSize={12}
        />
        <YAxis
          tickFormatter={(val) => `${val}ms`}
          stroke="var(--muted-foreground)"
          fontSize={12}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="responseTime"
          stroke="var(--color-brand-500)"
          strokeWidth={2}
          fill="url(#responseGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Anti-Patterns to Avoid
- **Fetching chart data client-side:** Don't use `useEffect` + `fetch` for initial data load. Server components fetch data during SSR; pass pre-fetched data to chart client component.
- **Storing time range in component state only:** Use URL searchParams so the range persists across page refreshes and is shareable.
- **Using `loading.tsx` for auto-refresh:** The `router.refresh()` call re-runs server components without triggering Suspense boundaries, achieving the "no loading spinners on refresh" requirement. Don't wrap the detail page in Suspense for refresh.
- **Querying raw heartbeats for 90-day charts:** Raw heartbeats older than 7 days are cleaned up by the worker's maintenance job. Use daily rollups for 30d/90d.
- **Using `CartesianGrid` without matching axis IDs:** In Recharts v3, CartesianGrid has `xAxisId`/`yAxisId` props. If you use custom axis IDs, pass them to CartesianGrid too, or grid lines won't render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Response time charts | Custom SVG/Canvas chart | Recharts AreaChart | Handles responsive sizing, tooltips, axis formatting, animations, accessibility |
| Time formatting for chart axes | Custom date formatting | `Intl.DateTimeFormat` or simple format functions | Locale-aware, handles edge cases |
| Duration formatting | Custom ms-to-string | Reuse `formatDuration` from `worker/src/emails/templates.ts` | Already implemented and tested in the project |
| Uptime percentage calculation | Client-side math from raw data | SQL aggregation in Drizzle query | Accurate, handles NULL/empty data, single source of truth |
| Data resolution switching | Single table with filtering | Multi-table strategy (heartbeats/hourly/daily) | Tables already designed for this purpose; raw heartbeats are cleaned up after 7 days |
| Slide-out edit panel | New edit UI on detail page | Existing MonitorPanel component | Reuse identical UX from Phase 3 as specified |

**Key insight:** The data layer (heartbeats, heartbeats_hourly, heartbeats_daily, incidents) was designed in Phase 1 and populated by the Phase 4 worker specifically to support this dashboard phase. The rollup architecture means queries are fast even for long time ranges -- don't bypass it.

## Common Pitfalls

### Pitfall 1: Raw Heartbeats Cleaned Up After 7 Days
**What goes wrong:** Querying `heartbeats` table for 30d or 90d data returns nothing because the worker deletes heartbeats older than 7 days.
**Why it happens:** `_cleanupOldHeartbeats` in `worker/src/rollup.ts` runs `DELETE FROM heartbeats WHERE checked_at < NOW() - INTERVAL '7 days'` every 4 hours.
**How to avoid:** Use `heartbeats` only for 24h range. Use `heartbeatsHourly` for 7d. Use `heartbeatsDaily` for 30d/90d.
**Warning signs:** Empty charts for time ranges > 7 days.

### Pitfall 2: Next.js 16 Async Params
**What goes wrong:** Accessing `params.id` directly without `await` causes a type error or runtime crash in Next.js 16.
**Why it happens:** In Next.js 16, `params` and `searchParams` are Promises and must be awaited.
**How to avoid:** Always `const { id } = await params;` and `const { range } = await searchParams;`.
**Warning signs:** TypeScript errors about Promise types, or "cannot read property of undefined" at runtime.

### Pitfall 3: Recharts v3 CartesianGrid Axis ID Mismatch
**What goes wrong:** Grid lines don't render if CartesianGrid's `xAxisId`/`yAxisId` don't match the corresponding axis components.
**Why it happens:** Recharts v3 changed CartesianGrid to require explicit axis ID matching (v2 auto-detected).
**How to avoid:** Use default axis IDs (don't set custom IDs on XAxis/YAxis), or if you do, pass matching IDs to CartesianGrid.
**Warning signs:** Chart renders data but no grid lines appear.

### Pitfall 4: Recharts v3 accessibilityLayer Default
**What goes wrong:** Unexpected keyboard navigation behavior in charts.
**Why it happens:** Recharts v3 sets `accessibilityLayer={true}` by default (was false in v2). This adds keyboard event handling and focus management.
**How to avoid:** This is actually desired behavior -- leave it enabled. Be aware it exists when debugging interaction issues.
**Warning signs:** Focus rings appearing on chart elements unexpectedly.

### Pitfall 5: Monitor Ownership Not Verified on Detail Page
**What goes wrong:** User A can view User B's monitor detail page by guessing the monitor ID.
**Why it happens:** Forgetting to filter by `userId` in the detail page query.
**How to avoid:** Always include `eq(monitors.userId, session.user.id)` in the WHERE clause, matching the established pattern from `app/actions/monitors.ts`.
**Warning signs:** No test coverage for ownership verification.

### Pitfall 6: MonitorList Click Handler Conflict
**What goes wrong:** Row click on the enhanced monitor list opens the edit panel instead of navigating to the detail page.
**Why it happens:** The existing `MonitorList` uses `onClick={() => openEdit(monitor)}` which opens the slide-out panel.
**How to avoid:** Replace the row click handler with navigation to `/monitors/[id]`. The create button remains in the summary bar. Edit is only accessed from the detail page.
**Warning signs:** Clicking a monitor row opens the panel instead of navigating.

### Pitfall 7: Uptime Percentage Division by Zero
**What goes wrong:** `NaN` or `Infinity` displayed when a monitor has no check data for a time range.
**Why it happens:** Dividing `successfulChecks / totalChecks` when `totalChecks` is 0.
**How to avoid:** Use `NULLIF(SUM(total_checks), 0)` in SQL (already used in worker's digest.ts) and default to 100% when no data (matching project convention from Phase 5).
**Warning signs:** "NaN%" displayed on dashboard.

### Pitfall 8: Date Serialization Between Server and Client
**What goes wrong:** Dates come through as strings when passed from server component to client component via props.
**Why it happens:** React Server Components serialize props as JSON; Date objects become ISO strings.
**How to avoid:** Either: (a) convert dates to ISO strings server-side and parse in client, or (b) convert to timestamps (numbers) for chart data. For chart data, timestamps are ideal since Recharts works with numbers.
**Warning signs:** Chart shows "Invalid Date" or timestamps instead of formatted dates.

## Code Examples

### Uptime Percentage Query (all 4 time ranges in parallel)
```typescript
// lib/queries/uptime.ts
import { db, heartbeatsHourly, heartbeatsDaily } from "@/lib/db";
import { and, eq, gte, sql } from "drizzle-orm";

interface UptimeResult {
  range: string;
  percentage: number;
}

export async function getUptimeForAllRanges(monitorId: number): Promise<UptimeResult[]> {
  const now = new Date();
  const ranges = [
    { key: "24h", hours: 24 },
    { key: "7d", hours: 168 },
    { key: "30d", hours: 720 },
    { key: "90d", hours: 2160 },
  ];

  const results = await Promise.all(
    ranges.map(async ({ key, hours }) => {
      const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

      // Use hourly for 24h/7d, daily for 30d/90d
      const useDaily = hours > 168;
      const table = useDaily ? heartbeatsDaily : heartbeatsHourly;
      const dateCol = useDaily ? heartbeatsDaily.date : heartbeatsHourly.hour;
      const totalCol = useDaily ? heartbeatsDaily.totalChecks : heartbeatsHourly.totalChecks;
      const successCol = useDaily ? heartbeatsDaily.successfulChecks : heartbeatsHourly.successfulChecks;
      const monitorCol = useDaily ? heartbeatsDaily.monitorId : heartbeatsHourly.monitorId;

      const [row] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${totalCol}), 0)`,
          successful: sql<number>`COALESCE(SUM(${successCol}), 0)`,
        })
        .from(table)
        .where(and(eq(monitorCol, monitorId), gte(dateCol, since)));

      const percentage =
        row && row.total > 0
          ? Math.round((row.successful / row.total) * 10000) / 100
          : 100; // No data = 100% (project convention)

      return { range: key, percentage };
    }),
  );

  return results;
}
```

### Monitor List Query with Latest Response Time and 24h Uptime
```typescript
// lib/queries/monitors.ts
import { db, monitors, heartbeats, heartbeatsHourly } from "@/lib/db";
import { and, eq, gte, desc, sql } from "drizzle-orm";

export async function getMonitorsWithStats(userId: string) {
  // Get all monitors
  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, userId))
    .orderBy(desc(monitors.createdAt));

  // Get latest heartbeat per monitor + 24h uptime in parallel
  const enhanced = await Promise.all(
    userMonitors.map(async (monitor) => {
      const [latestHeartbeat] = await db
        .select({ responseTimeMs: heartbeats.responseTimeMs })
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, monitor.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(1);

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [uptimeRow] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${heartbeatsHourly.totalChecks}), 0)`,
          successful: sql<number>`COALESCE(SUM(${heartbeatsHourly.successfulChecks}), 0)`,
        })
        .from(heartbeatsHourly)
        .where(and(
          eq(heartbeatsHourly.monitorId, monitor.id),
          gte(heartbeatsHourly.hour, since24h),
        ));

      const uptime24h = uptimeRow && uptimeRow.total > 0
        ? Math.round((uptimeRow.successful / uptimeRow.total) * 10000) / 100
        : 100;

      return {
        ...monitor,
        latestResponseTimeMs: latestHeartbeat?.responseTimeMs ?? null,
        uptime24h,
      };
    }),
  );

  return enhanced;
}
```

### Incident History Query with Pagination
```typescript
// lib/queries/incidents.ts
import { db, incidents } from "@/lib/db";
import { and, eq, gte, desc, or, isNull } from "drizzle-orm";

export async function getIncidentsForMonitor(
  monitorId: number,
  range: string,
  limit: number,
  offset: number,
) {
  const since = getRangeSince(range);

  const rows = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.monitorId, monitorId),
        or(
          gte(incidents.startedAt, since),
          // Include ongoing incidents regardless of start time
          eq(incidents.status, "ongoing"),
        ),
      ),
    )
    .orderBy(
      // Ongoing first, then newest
      sql`CASE WHEN ${incidents.status} = 'ongoing' THEN 0 ELSE 1 END`,
      desc(incidents.startedAt),
    )
    .limit(limit + 1) // Fetch one extra to know if there are more
    .offset(offset);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return { items, hasMore };
}
```

### Duration Formatting (reuse from worker)
```typescript
// Note: formatDuration already exists in worker/src/emails/templates.ts
// Extract to a shared utility or duplicate the simple function:
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x with react-smooth | Recharts 3.x (removed react-smooth dep) | 2025 | Cleaner dependency tree, React 19 support |
| Recharts `accessibilityLayer={false}` default | `accessibilityLayer={true}` default in v3 | 2025 | Charts are keyboard-navigable by default |
| Next.js sync `params`/`searchParams` | Async `params`/`searchParams` (Promise) in 16 | 2025 | Must `await` params in page components |
| Tremor for dashboards | Recharts directly (per user decision) | N/A | Avoids React 19.2 compatibility risk |

**Deprecated/outdated:**
- Recharts `<Customized>` component: No longer needed in v3, custom components can be direct children
- Recharts `Cell` component: Deprecated in v3.7.0, use `shape` prop instead (not relevant for AreaChart)
- Recharts `points` prop on Area: Removed in v3, internal state management changed

## Open Questions

1. **formatDuration duplication vs sharing**
   - What we know: `formatDuration` exists in `worker/src/emails/templates.ts` but the worker has a separate package.json and build
   - What's unclear: Whether to extract to `lib/utils.ts` (shared) or duplicate in the web app
   - Recommendation: Duplicate the ~10-line function in `lib/utils.ts` rather than refactoring the worker import structure. Keep it simple.

2. **Monitor list query performance with many monitors**
   - What we know: Current approach queries latest heartbeat + uptime per monitor in a loop (N+1)
   - What's unclear: Whether this matters for typical indie dev usage (5-20 monitors)
   - Recommendation: Start with the simple per-monitor approach. If performance becomes an issue (unlikely at this scale), refactor to a single query with lateral joins or subqueries.

3. **CSS variable usage in Recharts SVG**
   - What we know: Recharts accepts string values for `stroke` and `fill`. CSS custom properties like `var(--color-brand-500)` work in SVG attributes in modern browsers.
   - What's unclear: Whether Recharts' internal rendering properly handles CSS custom properties in all contexts (e.g., gradient stops).
   - Recommendation: Use CSS variables for consistency with the design system. If issues arise, fall back to the raw oklch values from globals.css.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Monitor list shows status, response time, uptime | unit | `npx vitest run tests/dashboard/monitor-list.test.tsx -x` | Wave 0 |
| DASH-01 | Summary bar shows correct counts | unit | `npx vitest run tests/dashboard/monitor-list.test.tsx -x` | Wave 0 |
| DASH-02 | Chart data query returns correct resolution per range | unit | `npx vitest run tests/dashboard/chart-queries.test.ts -x` | Wave 0 |
| DASH-02 | ResponseChart component renders without errors | unit | `npx vitest run tests/dashboard/response-chart.test.tsx -x` | Wave 0 |
| DASH-03 | Uptime percentage calculation handles zero checks | unit | `npx vitest run tests/dashboard/uptime-queries.test.ts -x` | Wave 0 |
| DASH-03 | Uptime percentage defaults to 100% with no data | unit | `npx vitest run tests/dashboard/uptime-queries.test.ts -x` | Wave 0 |
| DASH-04 | Incident query returns paginated results | unit | `npx vitest run tests/dashboard/incident-queries.test.ts -x` | Wave 0 |
| DASH-04 | Ongoing incidents pinned at top | unit | `npx vitest run tests/dashboard/incident-queries.test.ts -x` | Wave 0 |
| DASH-04 | Incident list respects time range filter | unit | `npx vitest run tests/dashboard/incident-queries.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dashboard/monitor-list.test.tsx` -- covers DASH-01 (enhanced list rendering with stats)
- [ ] `tests/dashboard/chart-queries.test.ts` -- covers DASH-02 (data resolution switching, query correctness)
- [ ] `tests/dashboard/response-chart.test.tsx` -- covers DASH-02 (component renders, gradient, tooltip)
- [ ] `tests/dashboard/uptime-queries.test.ts` -- covers DASH-03 (percentage calculation, edge cases)
- [ ] `tests/dashboard/incident-queries.test.ts` -- covers DASH-04 (pagination, ordering, time filtering)

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view recharts@3.8.0`) -- version 3.8.0, peer deps `react: ^19.0.0`, `react-dom: ^19.0.0`, `react-is: ^19.0.0`
- npm dry-run install -- confirmed zero peer dependency warnings with React 19.2.3
- [Recharts v3 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- all breaking changes from v2 to v3
- [Recharts GitHub releases](https://github.com/recharts/recharts/releases) -- v3.8.0 latest, v3.7.0 deprecated Cell
- Project codebase inspection -- schema.ts, rollup.ts, digest.ts, monitor-list.tsx, dal.ts, globals.css

### Secondary (MEDIUM confidence)
- [Next.js searchParams docs](https://nextjs.org/docs/app/api-reference/file-conventions/page) -- async searchParams in Next.js 16
- [Recharts gradient area chart pattern](https://leanylabs.com/blog/awesome-react-charts-tips/) -- SVG linearGradient + Area fill pattern

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts 3.8.0 verified compatible, all other libraries already in project
- Architecture: HIGH -- follows established project patterns (server components, Drizzle queries, existing component library)
- Pitfalls: HIGH -- derived from actual codebase inspection (heartbeat cleanup, schema structure, Next.js 16 patterns)

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable libraries, established patterns)
