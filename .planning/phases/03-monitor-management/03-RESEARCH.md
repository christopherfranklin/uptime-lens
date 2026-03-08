# Phase 3: Monitor Management - Research

**Researched:** 2026-03-07
**Phase Goal:** Users can manage a set of monitors for their sites and services through a complete CRUD interface
**Requirements:** MON-01, MON-02, MON-03, MON-04

## Existing Codebase Analysis

### Schema (Ready)
The `monitors` table in `lib/db/schema.ts` is fully defined:
- `id`: integer, auto-generated identity PK
- `userId`: text FK to `users.id` with `ON DELETE CASCADE`
- `name`: varchar(255)
- `url`: text (used for URL, host, or host:port depending on type)
- `type`: `monitor_type` enum (`http`, `tcp`, `ssl`)
- `status`: `monitor_status` enum (`active`, `paused`)
- `expectedStatusCode`: integer, default 200
- `checkIntervalSeconds`: integer, default 180 (3 min)
- `timeoutMs`: integer, default 10000
- `consecutiveFailures`: integer, default 0
- `lastCheckedAt`: timestamp (nullable)
- `createdAt`, `updatedAt`: timestamps

Indexes: `monitors_user_id_idx`, `monitors_status_idx`

Related tables with `ON DELETE CASCADE` from `monitors.id`:
- `heartbeats` — individual check results
- `heartbeats_hourly` — rollup aggregates
- `heartbeats_daily` — rollup aggregates
- `incidents` — downtime incidents

CASCADE ensures MON-03 (delete monitor + all data) works at the DB level.

### Dashboard Shell (Ready)
- `app/(dashboard)/dashboard/page.tsx`: Empty state with disabled "Create Monitor" button and "Coming soon" text
- `app/(dashboard)/layout.tsx`: Dashboard nav with "Dashboard" and "Settings" links
- `lib/dal.ts`: `verifySession()` (redirects if no session) and `getOptionalSession()` (returns null)

### UI Components Available
- `components/ui/button.tsx` — CVA-based Button with variants (uses @base-ui/react)
- `components/ui/badge.tsx` — Badge component
- `components/ui/card.tsx` — Card component
- `components/ui/separator.tsx` — Separator

### Tech Stack
- Next.js 16.1.6, React 19.2.3
- Drizzle ORM 0.45 with Neon serverless driver
- shadcn v4 + Tailwind CSS v4 + class-variance-authority
- @base-ui/react for primitives
- Biome for linting
- Vitest 4.x for tests

## Architecture Decisions

### Server Actions vs API Routes
**Recommendation: Server Actions**

Server Actions are the idiomatic Next.js pattern for mutations. The project already uses them (`app/actions/auth.ts` for logout). Benefits:
- No separate API routes to maintain
- Progressive enhancement (forms work without JS)
- Automatic revalidation via `revalidatePath`
- Type-safe with Drizzle queries inline

Structure: `app/actions/monitors.ts` with `createMonitor`, `updateMonitor`, `deleteMonitor`, `toggleMonitorStatus` functions.

Each action must:
1. Call `verifySession()` for auth
2. Verify monitor ownership (`userId` matches session user)
3. Validate input
4. Execute Drizzle query
5. `revalidatePath("/dashboard")` to refresh list

### Form Validation
**Recommendation: Manual validation (no library)**

The forms are simple (3-5 fields). Adding Zod or a form library adds dependencies for minimal benefit. Use:
- HTML5 `required`, `type="url"`, `pattern` for client-side
- Server-side validation in the action (check required fields, validate URL format, validate port range for TCP)
- Return `{ error: string }` from actions for error display

### Slide-Out Panel Component
**Recommendation: Build with @base-ui/react Dialog**

The project uses @base-ui/react. Use `@base-ui/react/dialog` for the slide-out panel:
- `Dialog.Root` + `Dialog.Portal` + `Dialog.Backdrop` + `Dialog.Popup`
- CSS: `fixed inset-y-0 right-0 w-[480px]` with transform animation
- Handles focus trap, escape to close, backdrop click automatically
- Consistent with existing component patterns

### Monitor List Data Flow
```
DashboardPage (server component)
  → verifySession()
  → db.select().from(monitors).where(eq(monitors.userId, session.user.id))
  → Pass monitors[] to <MonitorList> (client component for interactivity)
    → Each row: click opens slide-out panel with monitor data
    → <MonitorPanel> (client component) handles create/edit form
```

## Implementation Patterns

### Dynamic Form Fields by Type
The create/edit panel needs type-dependent fields:
- **HTTP**: URL input + expected status code (number input)
- **TCP**: Host input + port input (number, 1-65535)
- **SSL**: URL input only

Use a single form component with conditional rendering based on selected type. When type changes, reset type-specific fields.

Per CONTEXT.md: type and URL/host are **locked after creation** in edit mode. Render as read-only text, not inputs.

### Optimistic UI
After create/edit/delete, the server action calls `revalidatePath("/dashboard")`. Next.js will re-fetch the server component data. For perceived speed:
- Use `useTransition` for pending states on form submit
- Show loading spinner on the submit button
- Close panel after successful action

### Empty State → List Transition
The current dashboard page has a hardcoded empty state. Replace with:
```tsx
{monitors.length === 0 ? <EmptyState onCreateClick /> : <MonitorList monitors />}
```
The "Create Monitor" button in empty state opens the same slide-out panel.

## Validation Architecture

### Unit Tests
- **Server actions**: Test `createMonitor`, `updateMonitor`, `deleteMonitor`, `toggleMonitorStatus` with mocked DB and session
- **Validation**: Test input validation (missing fields, invalid URL, port range, invalid type)
- **Authorization**: Test that actions reject when monitor doesn't belong to user

### Integration Tests
- **CRUD flow**: Create monitor → verify in list → edit name → verify updated → delete → verify removed
- **Type-specific fields**: Create HTTP monitor with status code, TCP with host+port, SSL with URL only
- **Pause/resume**: Create → pause → verify paused styling → resume → verify active

### What to Verify
- MON-01: Create form accepts name + URL/host + type, monitor appears in list
- MON-02: Edit panel shows current values, saves changes, list reflects updates
- MON-03: Delete shows confirmation, removes monitor, cascades (no orphan data)
- MON-04: Pause/resume toggle in edit panel, list shows paused badge/styling

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| @base-ui/react Dialog may not exist or have different API | Check installed version; fall back to manual portal + focus trap if needed |
| Drizzle `generatedAlwaysAsIdentity` may need migration | Run `db:push` during execution; schema already defined in Phase 1 |
| Slide-out panel animation performance | Use CSS transforms only (GPU-accelerated), avoid layout-triggering properties |
| TCP host:port needs different validation than URL | Separate validation paths per monitor type in server action |

## File Impact Estimate

### New Files
- `app/actions/monitors.ts` — server actions for CRUD
- `components/monitors/monitor-list.tsx` — list view (client component)
- `components/monitors/monitor-panel.tsx` — slide-out create/edit panel (client component)
- `components/monitors/monitor-empty-state.tsx` — empty state (extracted from current page)

### Modified Files
- `app/(dashboard)/dashboard/page.tsx` — fetch monitors, render list or empty state
- `lib/db/index.ts` — may need to export db for direct use in actions (verify current exports)

## RESEARCH COMPLETE
