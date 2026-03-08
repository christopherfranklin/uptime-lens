---
phase: 04-check-engine
plan: 01
subsystem: worker
tags: [probes, http, tcp, ssl, drizzle, neon-http, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: worker scaffold with health server, shared DB schema, @neondatabase/serverless
provides:
  - ProbeResult interface shared across all probe modules
  - HTTP probe function (probeHttp) with fetch, AbortSignal.timeout, redirect manual
  - TCP probe function (probeTcp) with net.createConnection, socket cleanup
  - SSL probe function (probeSsl) with tls.connect, getPeerCertificate, rejectUnauthorized false
  - URL parsing helpers (parseTcpTarget, parseHostname) for all URL formats
  - Worker Drizzle ORM client (createWorkerDb) using neon-http driver with shared schema
affects: [04-check-engine-plan-02, 05-alerting]

# Tech tracking
tech-stack:
  added: [drizzle-orm (worker)]
  patterns: [neon-http driver for worker DB, probe-always-resolves pattern, URL parsing with protocol detection]

key-files:
  created:
    - worker/src/db.ts
    - worker/src/probes/types.ts
    - worker/src/probes/http.ts
    - worker/src/probes/tcp.ts
    - worker/src/probes/ssl.ts
    - worker/src/probes/url.ts
    - tests/worker/probes/http.test.ts
    - tests/worker/probes/tcp.test.ts
    - tests/worker/probes/ssl.test.ts
    - tests/worker/url-parsing.test.ts
  modified:
    - worker/package.json
    - worker/tsconfig.json

key-decisions:
  - "Worker uses neon-http driver (not Pool/WebSocket) for low-frequency queries"
  - "Worker tsconfig rootDir set to parent (..) with include narrowed to lib/db/**/*.ts to avoid pulling in unrelated web app modules"
  - "URL parsing uses protocol detection (://) before attempting new URL() to handle bare host:port correctly"

patterns-established:
  - "Probe-always-resolves: all probe functions return Promise<ProbeResult> and never reject"
  - "Socket cleanup: socket.destroy() called in every event handler (connect, timeout, error)"
  - "vitest-environment node: worker tests use // @vitest-environment node comment since default is jsdom"

requirements-completed: [MON-05, MON-06]

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 4 Plan 1: Worker DB Client & Protocol Probes Summary

**Drizzle ORM worker DB client with neon-http driver, HTTP/TCP/SSL probe functions with uniform ProbeResult interface, URL parsing helpers, and 24 passing tests via TDD**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T01:44:00Z
- **Completed:** 2026-03-08T01:49:21Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Worker Drizzle ORM client using neon-http driver with shared schema from lib/db/schema.ts
- Three probe modules (HTTP, TCP, SSL) all following the always-resolve pattern with uniform ProbeResult
- URL parsing helpers handle tcp://, bare host:port, http://, and bare hostname formats
- 24 tests passing across 4 test files, developed via TDD (red-green cycle)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Drizzle ORM, fix tsconfig, create worker DB client** - `f851b7d` (feat)
2. **Task 2 RED: Add failing tests for probes and URL parsing** - `3c82659` (test)
3. **Task 2 GREEN: Implement probes and URL parsing** - `59edcd5` (feat)

## Files Created/Modified
- `worker/src/db.ts` - Drizzle ORM client for worker using neon-http driver
- `worker/src/probes/types.ts` - ProbeResult interface (status, responseTimeMs, statusCode, error, sslExpiresAt)
- `worker/src/probes/http.ts` - HTTP probe with fetch, AbortSignal.timeout, redirect: manual
- `worker/src/probes/tcp.ts` - TCP probe with net.createConnection, socket cleanup on all paths
- `worker/src/probes/ssl.ts` - SSL probe with tls.connect, rejectUnauthorized: false, cert expiry extraction
- `worker/src/probes/url.ts` - parseTcpTarget and parseHostname URL parsing helpers
- `tests/worker/probes/http.test.ts` - 7 tests for HTTP probe behavior
- `tests/worker/probes/tcp.test.ts` - 5 tests for TCP probe behavior
- `tests/worker/probes/ssl.test.ts` - 6 tests for SSL probe behavior
- `tests/worker/url-parsing.test.ts` - 6 tests for URL parsing
- `worker/package.json` - Added drizzle-orm dependency
- `worker/tsconfig.json` - rootDir set to parent, include narrowed to lib/db for shared schema

## Decisions Made
- Used neon-http driver (not Pool/WebSocket) since worker query volume is low -- simpler setup, no ws dependency needed
- Narrowed worker tsconfig include to `../lib/db/**/*.ts` instead of `../lib/**/*` to avoid pulling in web app modules (auth, email templates) that require JSX and ESM-only packages
- URL parsing uses protocol detection (`://`) before attempting `new URL()` to correctly handle bare `host:port` format, which `new URL()` misinterprets as a protocol scheme

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed URL parsing for bare host:port format**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** `new URL("example.com:3306")` doesn't throw -- it treats "example.com" as a protocol and returns empty hostname, causing parseTcpTarget to return `{ host: "", port: 80 }`
- **Fix:** Added protocol detection check (`url.includes("://")`) before attempting `new URL()` parsing, with manual `split(":")` fallback for bare host:port
- **Files modified:** worker/src/probes/url.ts
- **Verification:** `parseTcpTarget("example.com:3306")` correctly returns `{ host: "example.com", port: 3306 }`
- **Committed in:** 59edcd5 (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Narrowed tsconfig include to avoid unrelated compilation errors**
- **Found during:** Task 1
- **Issue:** Including `../lib/**/*` pulled in auth, email template, and other web app modules that use JSX and ESM-only imports, causing compilation errors unrelated to worker code
- **Fix:** Changed include to `../lib/db/**/*.ts` to only pull in the shared database schema
- **Files modified:** worker/tsconfig.json
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** f851b7d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three probe modules ready for the check engine orchestrator (Plan 02)
- Worker DB client ready for heartbeat storage and monitor queries
- URL parsing helpers ready for TCP and SSL probe dispatch
- ProbeResult interface establishes the contract for Plan 02's tick loop

## Self-Check: PASSED

All 10 created files verified present. All 3 commit hashes (f851b7d, 3c82659, 59edcd5) verified in git log.

---
*Phase: 04-check-engine*
*Completed: 2026-03-08*
