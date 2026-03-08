# Phase 4: Check Engine - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated background monitoring -- the worker process checks all active monitors every 3 minutes using protocol-specific probes (HTTP, TCP, SSL), stores results in heartbeat records, maintains rollup aggregates, and tracks consecutive failures. No incident creation, no alerting, no dashboard display -- this phase delivers the check engine only.

Requirements: MON-05, MON-06, CHK-01, CHK-02, CHK-03

</domain>

<decisions>
## Implementation Decisions

### Scheduling approach
- Simple setInterval loop in the worker process -- no BullMQ, no Redis, no external dependencies
- Worker ticks every 30 seconds, queries for monitors where `lastCheckedAt` is null OR enough time has elapsed based on `checkIntervalSeconds`
- All due monitors checked in parallel via Promise.allSettled (no concurrency limit)
- Uses existing `lastCheckedAt` column for scheduling -- no schema changes needed

### Failure threshold logic
- 3 consecutive failures before a monitor is considered "down"
- Phase 4 only tracks the counter: increment `consecutiveFailures` on failure, reset to 0 on success
- No incident creation in Phase 4 -- Phase 5 (alerting) reads the counter to decide when to create incidents and send alerts
- No immediate in-tick retry -- a failure is final for that tick, consecutive failure logic handles retries across ticks

### HTTP probe behavior
- Success = response status matches the monitor's `expectedStatusCode` field (default 200)
- `redirect: 'manual'` -- do not follow redirects; a 301 is the status code, user controls expectation
- Timeout via `AbortSignal.timeout(monitor.timeoutMs)`
- Store response time, status code, and error (if any) in heartbeat record

### TCP probe behavior
- Connect to host:port, if connection succeeds within `timeoutMs`, it's a success
- Immediately close the socket after successful connection -- no data exchange
- Response time = time to establish TCP connection
- Store error message on failure

### SSL probe behavior
- TLS connect to host:443, extract peer certificate
- Store `sslExpiresAt` (cert expiry date) in heartbeat record
- Success = valid TLS handshake and certificate obtained
- Do NOT make an HTTP request -- SSL monitors are about certificate health, not site uptime

### Heartbeat status encoding
- Binary 1/0: `heartbeats.status` = 1 (success) or 0 (failure)
- Error details in the `error` text field
- Uptime percentage = `SUM(status) / COUNT(*)`

### Rollup strategy
- Hourly rollups computed inline after each check via upsert (ON CONFLICT DO UPDATE)
- Daily rollups and old heartbeat cleanup run on a separate interval (every ~4 hours)
- Raw heartbeats retained for 7 days, then deleted
- After 7 days, historical data comes from hourly/daily rollup tables

### Claude's Discretion
- Worker code organization (single file vs module split)
- TCP host:port parsing from the monitor's URL field
- Error message formatting and categorization
- Daily rollup aggregation logic from hourly data
- Cleanup job timing details (exact interval, batch size)
- How to handle worker restart (missed checks catch up naturally via lastCheckedAt)

</decisions>

<specifics>
## Specific Ideas

- Worker comment in Phase 1 says "Phase 4 will add BullMQ" -- we chose simpler setInterval instead, which is the right call for the monitor count this product targets
- The 30-second tick rate means worst case a check fires 30 seconds late, which is acceptable for 3-minute intervals

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `worker/src/index.ts`: Worker scaffold with health check server, graceful shutdown, DB connectivity verification -- add check loop here
- `lib/db/schema.ts`: All tables ready -- `monitors`, `heartbeats`, `heartbeatsHourly`, `heartbeatsDaily` with proper indexes
- `@neondatabase/serverless`: Already installed in worker for DB access

### Established Patterns
- Worker uses `neon()` client from `@neondatabase/serverless` (not Drizzle) -- may need to add Drizzle to worker or use raw SQL
- Proxy pattern for lazy client initialization (used in web app)
- `consecutiveFailures` and `lastCheckedAt` fields on monitors table ready for check engine use

### Integration Points
- `worker/src/index.ts` main() function -- add check loop after health server starts
- `monitors` table -- query for due monitors, update `lastCheckedAt` and `consecutiveFailures`
- `heartbeats` table -- insert check results
- `heartbeats_hourly` table -- upsert rollup data after each check
- `heartbeats_daily` table -- aggregate from hourly in maintenance job

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-check-engine*
*Context gathered: 2026-03-08*
