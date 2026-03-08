# Phase 6: Dashboard - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see the health of all their monitors at a glance and drill into detailed response time, uptime, and incident data. This phase delivers the dashboard list upgrade, monitor detail page with charts, uptime percentages, and incident history. No new alerting, no billing, no monitor CRUD changes -- this phase delivers the visualization and data display layer only.

Requirements: DASH-01, DASH-02, DASH-03, DASH-04

</domain>

<decisions>
## Implementation Decisions

### Monitor detail view
- Dedicated page at `/monitors/[id]` route (not slide-out panel)
- Clicking a monitor row on the dashboard navigates to the detail page (replaces the Phase 3 click-to-edit behavior)
- Layout order (vertical scroll): header (name, status, URL, Edit button) -> response time chart -> uptime percentages -> incident log
- Edit button on detail page opens the existing slide-out panel (reuse Phase 3 panel for edit, pause/resume, delete)
- Global time range selector (24h, 7d, 30d, 90d) controls all sections on the detail page at once
- Auto-refresh data every 60 seconds (silent re-fetch, no loading spinners on refresh)

### Chart library and style
- Recharts library for response time charts (not Tremor -- avoids unverified React 19.2 compatibility concern)
- Line chart with area fill (light gradient below the line)
- Average response time only (no min/max bands)
- Hover tooltip shows exact timestamp and response time
- Data resolution per time range: 24h = raw heartbeats, 7d = hourly rollups, 30d/90d = daily rollups

### Monitor list upgrade
- Each row shows: status dot (green=up, red=down, gray=paused), monitor name, URL, type badge, latest response time, 24h uptime percentage
- Summary bar above the list: "5 monitors: 4 up, 1 down" (or "all operational")
- Create button ("+ New") in the summary bar header
- Row click navigates to `/monitors/[id]` detail page
- Down monitors show response time as "--" or last known value

### Incident history
- Simple chronological log list on the detail page, newest first
- Each entry shows: date range (start - end), human-readable duration, cause text
- Ongoing incidents pinned at top with red dot/badge and "Ongoing" label with live duration
- Show 10 incidents initially, "Show more" button loads next batch
- Empty state: "No incidents in the last [time range]" text message
- Incident list filtered by the global time range selector

### Claude's Discretion
- Recharts configuration details (colors, grid, axis formatting, responsive container)
- Uptime percentage display format on detail page (cards, inline text, etc.)
- Loading states and skeleton screens
- Back navigation implementation (link vs router.back)
- Server component vs client component boundaries for the detail page
- Data fetching functions organization (lib/queries/ or colocated)
- "Show more" implementation (client state vs URL params)

</decisions>

<specifics>
## Specific Ideas

- Phase 3 established the compact list pattern -- enhance it rather than replacing it
- The Edit panel should feel identical to Phase 3 (same component, just triggered from the detail page instead of the list)
- Chart should use the brand teal color from the existing CSS custom properties (--color-brand-*)
- 60s auto-refresh matches the product's 3-minute check interval -- users see near-real-time data without overwhelming the server

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/monitors/monitor-list.tsx`: Client component with status dots and type badges -- needs enhancement for response time + uptime
- `components/monitors/monitor-panel.tsx`: Slide-out edit panel with Base UI Dialog -- reuse on detail page
- `components/monitors/delete-dialog.tsx`: Delete confirmation modal -- reuse on detail page
- `components/ui/card.tsx`: Card component with size variants and slot-based composition
- `components/ui/button.tsx`: Button with CVA variants (default, outline, secondary, ghost, destructive)
- `components/ui/badge.tsx`: Badge component for type labels and status badges
- `lib/dal.ts`: Data Access Layer with `verifySession()` for auth on new routes
- `lib/db/schema.ts`: All tables ready -- monitors (with isUp), heartbeats, heartbeatsHourly, heartbeatsDaily, incidents

### Established Patterns
- Server components by default, client components only when needed ("use client" directive)
- `verifySession()` called at top of server components for auth
- Server actions for mutations (app/actions/monitors.ts)
- Direct Drizzle ORM queries (no repository layer)
- Base UI + Tailwind v4 for all UI (not shadcn -- Base UI Dialog, custom styled components)
- Route groups: (dashboard) for authenticated pages
- `revalidatePath("/dashboard")` after mutations
- CSS custom properties for theme: --color-brand-{50..950}, --color-chart-{1..5}

### Integration Points
- `app/(dashboard)/dashboard/page.tsx`: Current monitor list page -- enhance with summary bar and updated list
- `app/(dashboard)/layout.tsx`: Dashboard shell with nav -- may need route awareness for detail page
- `lib/db/schema.ts`: heartbeats (raw), heartbeatsHourly, heartbeatsDaily for chart data; incidents for history
- `monitors.isUp` boolean (Phase 5) for fast up/down status on list
- Chart color CSS vars (--color-chart-1 through --color-chart-5) already defined in theme

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 06-dashboard*
*Context gathered: 2026-03-08*
