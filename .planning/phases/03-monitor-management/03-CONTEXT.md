# Phase 3: Monitor Management - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD interface for creating, editing, deleting, and pausing monitors. Users manage monitors for their sites and services (HTTP, TCP, SSL). No check execution, no dashboard charts, no alerting -- this phase delivers the management layer only.

Requirements: MON-01, MON-02, MON-03, MON-04

</domain>

<decisions>
## Implementation Decisions

### Create monitor form
- Accessed via slide-out panel from the right (dashboard stays visible on left)
- Type selector (HTTP / TCP / SSL) shows/hides relevant fields dynamically
  - HTTP: URL + expected status code
  - TCP: host + port
  - SSL: URL only
- Advanced settings (timeout, check interval) collapsed under "Advanced" toggle -- defaults cover most cases
- After creation: panel closes, new monitor appears in list immediately

### Monitor list view
- Compact list layout (not full table, not cards) -- each monitor is a styled list item
- Each row shows: name, truncated URL, type badge (HTTP/TCP/SSL), status dot (green active, gray paused)
- No detail page in Phase 3 -- list + slide-out panel is sufficient (detail page comes in Phase 6)
- Default sort: newest first (most recently created at top)

### Delete and pause behavior
- Delete: confirmation dialog ("Delete [name]? This will remove all associated data.") with Cancel/Delete buttons
- Delete cascades all associated data (heartbeats, rollups, incidents) -- schema ON DELETE CASCADE
- Pause/resume: toggle lives inside the edit panel only (not on list rows)
- Paused monitors: gray/dimmed styling with "Paused" badge in the list

### Edit experience
- Same slide-out panel as create -- click a monitor row to open pre-filled
- Type is locked after creation (cannot change HTTP to TCP etc.)
- URL/host is locked after creation (changing URL = create new monitor)
- Editable fields: name, expected status code, timeout, check interval, pause/resume status
- Delete button at the bottom of the edit panel (red, destructive action placement)

### Claude's Discretion
- Server action vs API route architecture for CRUD operations
- Form validation library choice (if any)
- Slide-out panel animation and component implementation
- Error handling and loading states
- Input field styling within the established shadcn/ui + Tailwind patterns

</decisions>

<specifics>
## Specific Ideas

- The dashboard currently has a "Create your first monitor" empty state with a disabled button -- this phase enables that button and replaces the empty state when monitors exist
- Slide-out panel should feel consistent with the Stripe-inspired polish established in Phase 1

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/card.tsx`: Card component available for panel styling
- `components/ui/button.tsx`: Button component with variants
- `components/ui/badge.tsx`: Badge component for type labels (HTTP/TCP/SSL)
- `lib/dal.ts`: Data Access Layer with `verifySession()` -- use for auth checks on CRUD operations
- `lib/db/schema.ts`: `monitors` table fully defined with enums (`monitor_type`, `monitor_status`)

### Established Patterns
- Route groups: `(dashboard)` for authenticated pages, `(auth)` for login
- `verifySession()` called at top of server components for auth
- Proxy pattern for lazy client initialization (db, Resend)
- shadcn/ui + Tailwind v4 for all UI components
- Server components by default, client components only when needed (e.g., `settings-client.tsx`)

### Integration Points
- `app/(dashboard)/dashboard/page.tsx`: Empty state placeholder to replace with monitor list
- `app/(dashboard)/layout.tsx`: Dashboard nav -- may need "Monitors" link if monitors get their own route
- `lib/db/schema.ts`: `monitors` table with `userId` FK to `users` -- ready for queries

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 03-monitor-management*
*Context gathered: 2026-03-07*
