---
phase: 01-project-foundation
plan: 03
subsystem: infra
tags: [railway, worker, docker, deployment, base-ui, neon]

# Dependency graph
requires:
  - phase: 01-project-foundation (01-01)
    provides: "Next.js scaffold, Drizzle schema with 7 tables, Neon database client"
  - phase: 01-project-foundation (01-02)
    provides: "Landing page components, Resend email client"
provides:
  - "Railway worker scaffold with health check and DB connectivity verification"
  - "Docker build configuration for Railway deployment"
  - "Complete Phase 1 infrastructure ready for deployment"
affects: [04-check-engine, 05-incident-detection]

# Tech tracking
tech-stack:
  added: ["@neondatabase/serverless (worker)", "dotenv (worker)"]
  patterns: ["Standalone worker process with HTTP health check", "Graceful SIGTERM/SIGINT shutdown", "Docker multi-stage build for Railway"]

key-files:
  created:
    - worker/package.json
    - worker/src/index.ts
    - worker/Dockerfile
    - worker/tsconfig.json
    - worker/.dockerignore
  modified:
    - .gitignore
    - components/landing/hero.tsx
    - components/landing/pricing.tsx

key-decisions:
  - "Used nativeButton={false} on Base UI Button components rendered as Link elements to suppress accessibility warning while maintaining navigation semantics"
  - "Worker uses @neondatabase/serverless neon() for DB connectivity check, consistent with web app pattern"

patterns-established:
  - "Worker health check: HTTP GET / returning { status, timestamp, version }"
  - "Worker graceful shutdown: SIGTERM/SIGINT handlers that close server and exit cleanly"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 1 Plan 3: Railway Worker Scaffold and Infrastructure Verification Summary

**Railway worker with HTTP health check and Neon DB connectivity, plus Base UI button warning fix for landing page navigation links**

## Performance

- **Duration:** ~5 min (across two sessions: initial scaffold + continuation for fix and verification)
- **Started:** 2026-03-06T23:20:00Z (initial session)
- **Completed:** 2026-03-07T00:56:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created standalone Railway worker scaffold with HTTP health check endpoint and database connectivity verification
- Docker configuration for Railway deployment with Node.js 22-slim base
- Fixed Base UI `nativeButton` console warning on all Button components using `render={<Link>}` pattern
- Verified full Next.js production build compiles cleanly with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Railway worker scaffold and deploy full stack** - `fcb69fc` (feat)
2. **Fix: Base UI nativeButton warning** - `0ba88cf` (fix)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `worker/package.json` - Worker package config with build/start scripts
- `worker/src/index.ts` - Worker process with health check server and DB connectivity test
- `worker/tsconfig.json` - TypeScript config targeting ES2022/Node16
- `worker/Dockerfile` - Docker build for Railway deployment
- `worker/.dockerignore` - Excludes node_modules, src, tsconfig from Docker context
- `.gitignore` - Added worker/dist/ to ignore list
- `components/landing/hero.tsx` - Added nativeButton={false} to 2 Link-rendered buttons
- `components/landing/pricing.tsx` - Added nativeButton={false} to 1 Link-rendered button

## Decisions Made
- Used `nativeButton={false}` prop on Base UI Button components that render as Next.js Link elements, rather than restructuring the component hierarchy. This is the correct Base UI API for non-button rendered elements.
- Worker uses `@neondatabase/serverless` `neon()` constructor for database connectivity, consistent with the web app's Neon client pattern established in Plan 01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Base UI nativeButton console warning**
- **Found during:** Task 2 (Verification checkpoint - user reported)
- **Issue:** Button components using `render={<Link>}` triggered Base UI warning about non-native button elements affecting accessibility and form semantics
- **Fix:** Added `nativeButton={false}` prop to all 3 Button components that use `render={<Link>}` in hero.tsx and pricing.tsx
- **Files modified:** components/landing/hero.tsx, components/landing/pricing.tsx
- **Verification:** `npx next build` compiles cleanly, no console warnings
- **Committed in:** `0ba88cf`

---

**Total deviations:** 1 auto-fixed (1 bug fix per user report)
**Impact on plan:** Minor fix required for correct Base UI usage. No scope creep.

## Issues Encountered
- Deployment steps (Vercel, Railway, Neon production) require user accounts and credentials that are not yet configured. These are documented in the plan's `user_setup` section and will be completed when the user sets up the external services.

## User Setup Required

The following external services need manual configuration before full deployment:
- **Neon:** Create production project, obtain DATABASE_URL connection string
- **Vercel:** Deploy web app, set environment variables (DATABASE_URL, RESEND_API_KEY, NEXT_PUBLIC_APP_URL)
- **Railway:** Deploy worker with DATABASE_URL environment variable
- **Resend:** Configure SPF/DKIM/DMARC DNS records for uptimelens.io domain

## Next Phase Readiness
- Worker scaffold ready for Phase 4 (check engine) to add BullMQ and monitoring logic
- All 7 database tables designed and ready for production push via `drizzle-kit push`
- Landing page, email infrastructure, and worker scaffold complete for Phase 1

## Self-Check: PASSED

All 7 created/modified files verified present. Both commits (fcb69fc, 0ba88cf) verified in git log.

---
*Phase: 01-project-foundation*
*Completed: 2026-03-07*
