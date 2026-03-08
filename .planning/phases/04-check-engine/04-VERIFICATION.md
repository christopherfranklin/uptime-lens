---
phase: 04-check-engine
verified: 2026-03-07T21:05:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 4: Check Engine Verification Report

**Phase Goal:** Build the check engine -- the worker tick loop that queries due monitors, dispatches protocol-specific probes (HTTP, TCP, SSL), stores heartbeat results, tracks consecutive failures, and maintains rollup aggregates.
**Verified:** 2026-03-07T21:05:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

#### Plan 01 Truths (Probes & DB Client)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HTTP probe returns success when response status matches expectedStatusCode and failure when it does not | VERIFIED | `worker/src/probes/http.ts` lines 15-23: compares `response.status === expectedStatusCode`, returns status 1 or 0. 7 passing tests in `tests/worker/probes/http.test.ts`. |
| 2 | HTTP probe respects timeout via AbortSignal.timeout and does not follow redirects | VERIFIED | `worker/src/probes/http.ts` line 12: `signal: AbortSignal.timeout(timeoutMs)`, line 11: `redirect: "manual"`. Tests confirm timeout error message and redirect behavior. |
| 3 | TCP probe connects to host:port and returns success within timeoutMs, or failure on timeout/error | VERIFIED | `worker/src/probes/tcp.ts` uses `net.createConnection({ host, port, timeout: timeoutMs })` with connect/timeout/error handlers. 5 passing tests. |
| 4 | SSL probe performs TLS handshake, extracts certificate expiry date, and returns it as sslExpiresAt | VERIFIED | `worker/src/probes/ssl.ts` lines 19-37: `tls.connect` with `rejectUnauthorized: false`, `getPeerCertificate()`, `new Date(cert.valid_to)`. 6 passing tests. |
| 5 | All probes return a uniform ProbeResult and never reject (always resolve) | VERIFIED | All three probes import `ProbeResult` from `types.ts`. HTTP wraps in try/catch, TCP/SSL use `new Promise((resolve) => ...)` with no reject path. Each test file has a "never rejects" test. |
| 6 | URL parsing correctly handles tcp://host:port, bare host:port, and https://host/path formats | VERIFIED | `worker/src/probes/url.ts` implements `parseTcpTarget` and `parseHostname` with protocol detection. 6 passing tests cover all URL formats. |

#### Plan 02 Truths (Check Engine & Rollups)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 7 | Active monitors are checked every 3 minutes (via 30-second tick loop querying lastCheckedAt) | VERIFIED | `worker/src/check-engine.ts` line 11: `TICK_INTERVAL_MS = 30_000`, line 49: SQL `NOW() - MAKE_INTERVAL(secs => checkIntervalSeconds)` where default is 180s (3 min). Tests confirm query logic. |
| 8 | Check results are stored as heartbeat records with status, responseTimeMs, statusCode, error, and sslExpiresAt | VERIFIED | `worker/src/check-engine.ts` lines 113-121: `db.insert(heartbeats).values({...})` with all ProbeResult fields. Tests verify insert values. |
| 9 | consecutiveFailures increments on failure and resets to 0 on success | VERIFIED | `worker/src/check-engine.ts` lines 124-125: `result.status === 1 ? 0 : monitor.consecutiveFailures + 1`. Tests at lines 214-264 verify both paths. |
| 10 | A monitor with 3 consecutive failures has consecutiveFailures=3 (Phase 5 reads this) | VERIFIED | Test at line 266: starts with `consecutiveFailures: 2`, failure increments to 3, assertion passes. |
| 11 | Hourly rollup is upserted after each check with correct running average formula | VERIFIED | `worker/src/rollup.ts` lines 26-46: `db.insert(heartbeatsHourly).values({...}).onConflictDoUpdate({...})` with SQL `(avg * count + new) / (count + 1)`, `LEAST`, `GREATEST`. Tests verify truncation, insert values, and formula. |
| 12 | Daily rollups aggregate from hourly data and old heartbeats are cleaned up | VERIFIED | `worker/src/rollup.ts` lines 73-106: raw SQL `INSERT...SELECT...GROUP BY...ON CONFLICT` for daily aggregation, `DELETE FROM heartbeats WHERE checked_at < NOW() - INTERVAL '7 days'` for cleanup. Tests verify execution. |
| 13 | Worker starts the check engine and maintenance job after health server is up | VERIFIED | `worker/src/index.ts` lines 116-117: `startCheckEngine(db)` and `startMaintenanceJob(db)` called inside `server.listen` callback. Lines 76-77: `clearInterval` for both in shutdown handler. |

**Score:** 13/13 truths verified

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `worker/src/probes/types.ts` | ProbeResult interface | VERIFIED | 7 lines, exports `ProbeResult` with status, responseTimeMs, statusCode?, error?, sslExpiresAt? |
| `worker/src/probes/http.ts` | HTTP probe function | VERIFIED | 37 lines, exports `probeHttp`, imported by check-engine.ts |
| `worker/src/probes/tcp.ts` | TCP probe function | VERIFIED | 37 lines, exports `probeTcp`, imported by check-engine.ts |
| `worker/src/probes/ssl.ts` | SSL probe function | VERIFIED | 58 lines, exports `probeSsl`, imported by check-engine.ts |
| `worker/src/db.ts` | Drizzle ORM client for worker | VERIFIED | 11 lines, exports `createWorkerDb` and `WorkerDb` type, uses neon-http driver |

#### Plan 02 Artifacts

| Artifact | Expected | Min Lines | Status | Details |
|----------|----------|-----------|--------|---------|
| `worker/src/check-engine.ts` | Tick loop orchestrator | 60 | VERIFIED | 138 lines, exports `startCheckEngine`, `_tick`, `_checkMonitor` |
| `worker/src/rollup.ts` | Hourly upsert and daily aggregation | 40 | VERIFIED | 107 lines, exports `upsertHourlyRollup`, `startMaintenanceJob`, `_aggregateDailyRollups`, `_cleanupOldHeartbeats` |
| `worker/src/index.ts` | Updated entry point with check engine | - | VERIFIED | 129 lines, imports and calls `startCheckEngine` and `startMaintenanceJob`, graceful shutdown clears intervals |
| `tests/worker/check-engine.test.ts` | Tests for tick loop and heartbeat logic | 50 | VERIFIED | 303 lines, 13 tests all passing |
| `tests/worker/rollup.test.ts` | Tests for hourly upsert logic | 30 | VERIFIED | 151 lines, 8 tests all passing |

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `worker/src/probes/http.ts` | `worker/src/probes/types.ts` | import ProbeResult | WIRED | Line 1: `import type { ProbeResult } from "./types"` |
| `worker/src/probes/tcp.ts` | `worker/src/probes/types.ts` | import ProbeResult | WIRED | Line 2: `import type { ProbeResult } from "./types"` |
| `worker/src/probes/ssl.ts` | `worker/src/probes/types.ts` | import ProbeResult | WIRED | Line 2: `import type { ProbeResult } from "./types"` |
| `worker/src/db.ts` | `lib/db/schema.ts` | import shared schema | WIRED | Line 4: `import * as schema from "../../lib/db/schema"` |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `check-engine.ts` | `probes/http.ts` | import probeHttp | WIRED | Line 5: import + line 85: dispatched for HTTP monitors |
| `check-engine.ts` | `probes/tcp.ts` | import probeTcp | WIRED | Line 6: import + line 94: dispatched for TCP monitors |
| `check-engine.ts` | `probes/ssl.ts` | import probeSsl | WIRED | Line 7: import + line 99: dispatched for SSL monitors |
| `check-engine.ts` | `lib/db/schema.ts` | import monitors, heartbeats | WIRED | Line 2: `import { monitors, heartbeats } from "../../lib/db/schema"` |
| `check-engine.ts` | `rollup.ts` | call upsertHourlyRollup | WIRED | Line 9: import + line 137: called after heartbeat insert |
| `index.ts` | `check-engine.ts` | call startCheckEngine | WIRED | Line 9: import + line 116: called in main() |
| `index.ts` | `rollup.ts` | call startMaintenanceJob | WIRED | Line 10: import + line 117: called in main() |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MON-05 | 04-01 | User can monitor HTTP(S) URLs with expected status codes | SATISFIED | `probeHttp` compares response.status against expectedStatusCode with configurable value (default 200). check-engine dispatches probeHttp for type="http" monitors. |
| MON-06 | 04-01 | User can monitor TCP port connectivity | SATISFIED | `probeTcp` connects to host:port via `net.createConnection`. check-engine dispatches probeTcp for type="tcp" monitors with URL parsed by `parseTcpTarget`. |
| CHK-01 | 04-02 | Monitors are checked automatically every 3 minutes | SATISFIED | 30-second tick loop queries monitors where `lastCheckedAt <= NOW() - MAKE_INTERVAL(secs => checkIntervalSeconds)`, default checkIntervalSeconds=180 (3 min). |
| CHK-02 | 04-02 | Check results include response time, status, and error details | SATISFIED | Heartbeat insert includes status (1/0), responseTimeMs, statusCode (HTTP), error message, sslExpiresAt (SSL). All fields from ProbeResult stored. |
| CHK-03 | 04-02 | A monitor is only declared down after 2-3 consecutive failures | SATISFIED | consecutiveFailures increments on each failure, resets to 0 on success. Phase 5 alerting reads this counter. Test verifies consecutiveFailures=3 after 3 failures. |

**Orphaned requirements check:** REQUIREMENTS.md maps MON-05, MON-06, CHK-01, CHK-02, CHK-03 to Phase 4. All 5 are claimed in plan frontmatter and verified above. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected across any of the 9 source files |

All 9 source files scanned for TODO, FIXME, PLACEHOLDER, empty returns, console.log-only implementations. Zero findings.

### Human Verification Required

### 1. Worker Startup Integration Test

**Test:** Set `DATABASE_URL` to a real Neon connection string, run `npm start` in the worker directory.
**Expected:** Console logs: "Database connectivity verified", "Health check server listening on port 3001", "Check engine starting (30s tick loop)", "Maintenance job starting (4h interval)". If monitors exist in DB, should log "Checking N monitor(s)" within 30 seconds.
**Why human:** Requires real database connection and running process observation.

### 2. End-to-End Probe Accuracy

**Test:** Create HTTP, TCP, and SSL monitors in the database pointing at known-good services, wait for the tick loop to run.
**Expected:** Heartbeat records appear with status=1, reasonable responseTimeMs values, correct statusCode for HTTP, valid sslExpiresAt for SSL.
**Why human:** Requires real network calls to external services and database inspection.

### 3. Graceful Shutdown Behavior

**Test:** Start the worker, send SIGTERM or SIGINT.
**Expected:** Console logs "Check engine stopped", "HTTP server closed", process exits cleanly with code 0.
**Why human:** Requires running process and signal handling observation.

---

_Verified: 2026-03-07T21:05:00Z_
_Verifier: Claude (gsd-verifier)_
