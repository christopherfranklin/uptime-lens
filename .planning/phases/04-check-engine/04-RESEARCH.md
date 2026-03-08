# Phase 4: Check Engine - Research

**Researched:** 2026-03-07
**Domain:** Background monitoring worker -- protocol-specific probes (HTTP, TCP, SSL), heartbeat storage, rollup aggregation, consecutive failure tracking
**Confidence:** HIGH

## Summary

Phase 4 adds the automated check engine to the existing worker process. The worker already has a health check server, graceful shutdown, and database connectivity verification. This phase adds a 30-second tick loop that queries for due monitors and runs protocol-specific probes in parallel, storing results as heartbeat records with hourly rollup upserts.

The implementation uses Node.js built-in modules (`net`, `tls`, `fetch`) for probes -- no external libraries needed. The key architectural decision is whether to use Drizzle ORM or raw SQL in the worker. Research recommends adding `drizzle-orm` to the worker's dependencies and reusing the shared schema from `lib/db/schema.ts` via a path alias or relative import. This provides type safety for complex upsert queries and consistency with the web app's data access patterns.

**Primary recommendation:** Use Drizzle ORM with `neon-http` driver in the worker for type-safe queries, Node.js built-in `net`/`tls`/`fetch` for probes, and a simple setInterval tick loop for scheduling.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Simple setInterval loop in the worker process -- no BullMQ, no Redis, no external dependencies
- Worker ticks every 30 seconds, queries for monitors where `lastCheckedAt` is null OR enough time has elapsed based on `checkIntervalSeconds`
- All due monitors checked in parallel via Promise.allSettled (no concurrency limit)
- Uses existing `lastCheckedAt` column for scheduling -- no schema changes needed
- 3 consecutive failures before a monitor is considered "down"
- Phase 4 only tracks the counter: increment `consecutiveFailures` on failure, reset to 0 on success
- No incident creation in Phase 4 -- Phase 5 reads the counter
- No immediate in-tick retry -- a failure is final for that tick
- HTTP probe: success = response status matches `expectedStatusCode` (default 200), `redirect: 'manual'`, timeout via `AbortSignal.timeout(monitor.timeoutMs)`, store response time, status code, and error
- TCP probe: connect to host:port, success = connection within `timeoutMs`, immediately close, response time = connection time
- SSL probe: TLS connect to host:443, extract peer certificate, store `sslExpiresAt`, success = valid TLS handshake, do NOT make HTTP request
- Heartbeat status: binary 1 (success) / 0 (failure), error details in `error` text field
- Hourly rollups computed inline after each check via upsert (ON CONFLICT DO UPDATE)
- Daily rollups and old heartbeat cleanup run on a separate interval (every ~4 hours)
- Raw heartbeats retained for 7 days, then deleted
- After 7 days, historical data from hourly/daily rollup tables

### Claude's Discretion
- Worker code organization (single file vs module split)
- TCP host:port parsing from the monitor's URL field
- Error message formatting and categorization
- Daily rollup aggregation logic from hourly data
- Cleanup job timing details (exact interval, batch size)
- How to handle worker restart (missed checks catch up naturally via lastCheckedAt)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MON-05 | User can monitor HTTP(S) URLs with expected status codes | HTTP probe implementation using `fetch` with `AbortSignal.timeout`, `redirect: 'manual'`, status code comparison against `expectedStatusCode` |
| MON-06 | User can monitor TCP port connectivity | TCP probe implementation using `net.createConnection` with timeout, host:port parsing from URL field |
| CHK-01 | Monitors are checked automatically every 3 minutes | 30-second tick loop via `setInterval`, query monitors where `lastCheckedAt` is null or elapsed >= `checkIntervalSeconds` |
| CHK-02 | Check results include response time, status, and error details | Heartbeat record insertion with `status` (1/0), `responseTimeMs`, `statusCode`, `error`, `sslExpiresAt` fields |
| CHK-03 | A monitor is only declared down after 2-3 consecutive failures | `consecutiveFailures` counter on monitors table -- increment on failure, reset on success; 3 consecutive failures = down |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `net` | built-in (v22) | TCP probe connections | Standard library, zero dependencies, socket-level control |
| Node.js `tls` | built-in (v22) | SSL certificate extraction | Standard library, `getPeerCertificate()` provides certificate details |
| Node.js `fetch` | built-in (v22) | HTTP probe requests | Global fetch in Node 22, supports `AbortSignal.timeout` and `redirect: 'manual'` |
| `drizzle-orm` | ^0.45.1 | Type-safe DB queries in worker | Already used in web app, provides type-safe upserts with `onConflictDoUpdate` |
| `@neondatabase/serverless` | ^1.0.2 | Database connectivity | Already installed in worker, provides both `neon()` and `Pool` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ws` | ^8.19.0 | WebSocket support for neon Pool in Node.js | Required if using Pool-based connection (neon-serverless driver needs ws in non-edge environments) |
| `dotenv` | ^17.3.1 | Environment variable loading | Already in worker, loads DATABASE_URL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM in worker | Raw SQL via `neon()` tagged templates | Raw SQL works but loses type safety for complex upserts; Drizzle provides schema reuse and composable queries |
| `neon()` HTTP driver | `Pool` WebSocket driver | HTTP is simpler for individual queries (no ws setup); Pool better for high-throughput but overkill here where each tick does a handful of queries |
| Built-in `fetch` | `undici` or `axios` | Built-in fetch is sufficient; `AbortSignal.timeout` handles timeouts cleanly |

**Installation (worker directory):**
```bash
cd worker && npm install drizzle-orm
```

Note: `drizzle-orm` needs to be added to the worker's `package.json`. The shared schema from `lib/db/schema.ts` can be imported by adjusting the worker's TypeScript paths or using relative imports.

## Architecture Patterns

### Recommended Worker Code Organization
```
worker/src/
  index.ts           # Entry point -- health server + tick loop startup
  check-engine.ts    # Tick loop orchestrator: query due monitors, dispatch probes, store results
  probes/
    http.ts          # HTTP probe: fetch with timeout, status code check
    tcp.ts           # TCP probe: net.createConnection with timeout
    ssl.ts           # SSL probe: tls.connect, getPeerCertificate
    types.ts         # ProbeResult interface shared across probes
  db.ts              # Drizzle client setup for worker (neon-http driver)
  rollup.ts          # Hourly upsert (inline) and daily aggregation + cleanup (maintenance job)
```

### Pattern 1: Probe Result Interface
**What:** Uniform return type from all probe implementations
**When to use:** Every probe function returns this, check engine stores it uniformly
**Example:**
```typescript
// worker/src/probes/types.ts
export interface ProbeResult {
  status: 1 | 0;            // 1 = success, 0 = failure
  responseTimeMs: number;    // ms elapsed for the probe
  statusCode?: number;       // HTTP status code (HTTP probes only)
  error?: string;            // Error message on failure
  sslExpiresAt?: Date;       // Certificate expiry (SSL probes only)
}
```

### Pattern 2: HTTP Probe with AbortSignal.timeout
**What:** HTTP fetch with configurable timeout and manual redirect handling
**When to use:** All HTTP/HTTPS monitors
**Example:**
```typescript
// Source: Node.js built-in fetch, MDN AbortSignal.timeout docs
export async function probeHttp(url: string, timeoutMs: number, expectedStatusCode: number): Promise<ProbeResult> {
  const start = performance.now();
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseTimeMs = performance.now() - start;
    const success = response.status === expectedStatusCode;
    return {
      status: success ? 1 : 0,
      responseTimeMs,
      statusCode: response.status,
      error: success ? undefined : `Expected ${expectedStatusCode}, got ${response.status}`,
    };
  } catch (err) {
    const responseTimeMs = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 0,
      responseTimeMs,
      error: message.includes('TimeoutError') || message.includes('abort')
        ? `Timeout after ${timeoutMs}ms`
        : message,
    };
  }
}
```

### Pattern 3: TCP Probe with net.createConnection
**What:** TCP port connectivity check with timeout
**When to use:** All TCP monitors
**Example:**
```typescript
// Source: Node.js net module docs
import net from 'node:net';

export function probeTcp(host: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = net.createConnection({ host, port, timeout: timeoutMs });

    socket.on('connect', () => {
      const responseTimeMs = performance.now() - start;
      socket.destroy();
      resolve({ status: 1, responseTimeMs });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: `TCP connection timed out after ${timeoutMs}ms`,
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: err.message,
      });
    });
  });
}
```

### Pattern 4: SSL Probe with tls.connect
**What:** TLS handshake to extract peer certificate expiry date
**When to use:** All SSL monitors
**Example:**
```typescript
// Source: Node.js tls module docs
import tls from 'node:tls';

export function probeSsl(host: string, port: number, timeoutMs: number): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = performance.now();
    const socket = tls.connect({
      host,
      port,
      servername: host,  // Required for SNI
      timeout: timeoutMs,
      rejectUnauthorized: false,  // We want the cert even if expired
    });

    socket.on('secureConnect', () => {
      const responseTimeMs = performance.now() - start;
      const cert = socket.getPeerCertificate();
      socket.destroy();

      if (!cert || !cert.valid_to) {
        resolve({
          status: 0,
          responseTimeMs,
          error: 'No certificate returned',
        });
        return;
      }

      resolve({
        status: 1,
        responseTimeMs,
        sslExpiresAt: new Date(cert.valid_to),
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: `TLS handshake timed out after ${timeoutMs}ms`,
      });
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({
        status: 0,
        responseTimeMs: performance.now() - start,
        error: err.message,
      });
    });
  });
}
```

### Pattern 5: Drizzle Upsert for Hourly Rollups
**What:** ON CONFLICT DO UPDATE for hourly aggregation
**When to use:** After every heartbeat insertion
**Example:**
```typescript
// Source: Drizzle ORM upsert docs (orm.drizzle.team/docs/guides/upsert)
import { sql } from 'drizzle-orm';
import { heartbeatsHourly } from '../../lib/db/schema';

// Truncate checkedAt to hour boundary
const hourBucket = new Date(checkedAt);
hourBucket.setMinutes(0, 0, 0);

await db.insert(heartbeatsHourly).values({
  monitorId: monitor.id,
  hour: hourBucket,
  totalChecks: 1,
  successfulChecks: result.status,
  avgResponseTimeMs: result.responseTimeMs,
  minResponseTimeMs: result.responseTimeMs,
  maxResponseTimeMs: result.responseTimeMs,
}).onConflictDoUpdate({
  target: [heartbeatsHourly.monitorId, heartbeatsHourly.hour],
  set: {
    totalChecks: sql`${heartbeatsHourly.totalChecks} + 1`,
    successfulChecks: sql`${heartbeatsHourly.successfulChecks} + ${result.status}`,
    avgResponseTimeMs: sql`(${heartbeatsHourly.avgResponseTimeMs} * ${heartbeatsHourly.totalChecks} + ${result.responseTimeMs}) / (${heartbeatsHourly.totalChecks} + 1)`,
    minResponseTimeMs: sql`LEAST(${heartbeatsHourly.minResponseTimeMs}, ${result.responseTimeMs})`,
    maxResponseTimeMs: sql`GREATEST(${heartbeatsHourly.maxResponseTimeMs}, ${result.responseTimeMs})`,
  },
});
```

### Pattern 6: Worker DB Client Setup
**What:** Drizzle ORM with neon-http driver for the worker
**When to use:** All database operations in the worker
**Example:**
```typescript
// worker/src/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../lib/db/schema';

export function createWorkerDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle({ client: sql, schema });
}
```
Note: The neon-http driver is appropriate here because the worker issues individual queries (not interactive transactions). Each tick's queries are independent. The HTTP approach avoids needing WebSocket setup (`ws` package configuration) while working perfectly in a Node.js process.

### Anti-Patterns to Avoid
- **Blocking tick loop:** Never `await` each monitor sequentially -- use `Promise.allSettled` for parallel execution
- **Missing socket cleanup:** Always call `socket.destroy()` in TCP/TLS probes, even on success -- leaked sockets exhaust file descriptors
- **Trusting system clock for scheduling:** Use `lastCheckedAt` from the database, not in-memory timers per monitor; this handles restarts gracefully
- **Following redirects in HTTP probes:** A 301 redirect means the URL config is wrong -- user should know and update their monitor config
- **Swallowing probe errors:** Always resolve (never reject) probe promises -- failures are valid data, not errors. Rejections would break `Promise.allSettled` result handling

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP timeouts | Custom setTimeout wrapper | `AbortSignal.timeout(ms)` | Built-in, handles cleanup automatically, throws typed `TimeoutError` |
| SSL cert extraction | Certificate parsing library | `tls.connect` + `getPeerCertificate()` | Node.js built-in, returns structured cert object with `valid_to` |
| Running average calculation | In-memory aggregation | SQL `LEAST`/`GREATEST` + running average formula in upsert | DB-level aggregation survives worker restarts |
| Scheduled job framework | Custom cron/scheduler | `setInterval` with DB-driven `lastCheckedAt` | Decision locked; dead-simple for this scale |
| Type-safe SQL queries | String concatenation | Drizzle ORM with shared schema | Catches column name typos at compile time, composable upserts |

**Key insight:** All three probe types use Node.js built-in modules. The only external library needed for the check engine logic is Drizzle ORM for database operations.

## Common Pitfalls

### Pitfall 1: Socket Leaks in TCP/TLS Probes
**What goes wrong:** If a probe function throws an exception before calling `socket.destroy()`, the socket stays open. Over time (thousands of checks), this exhausts file descriptors.
**Why it happens:** Error paths in event-based code are easy to miss -- an `error` event fires but the handler forgets to destroy.
**How to avoid:** Wrap all probe logic in a Promise that always resolves. Call `socket.destroy()` in every event handler (`connect`, `secureConnect`, `timeout`, `error`). Never let a probe reject.
**Warning signs:** Worker process crashes with `EMFILE` (too many open files) after running for hours.

### Pitfall 2: Running Average Formula Error
**What goes wrong:** The hourly rollup `avgResponseTimeMs` drifts from the true average because the running average formula is incorrect.
**Why it happens:** Naive formula `(old_avg + new_value) / 2` ignores the count of previous samples.
**How to avoid:** Use the correct incremental mean formula: `new_avg = (old_avg * old_count + new_value) / (old_count + 1)`. The upsert computes this in SQL using `totalChecks` as the count.
**Warning signs:** Average response times are wildly different from manual calculation over raw heartbeats.

### Pitfall 3: Worker Drizzle Schema Import Path
**What goes wrong:** The worker's TypeScript config uses `rootDir: ./src` and `module: Node16`, which cannot resolve imports from `../../lib/db/schema` because that path is outside `rootDir`.
**Why it happens:** Worker is a separate TypeScript project with its own tsconfig.
**How to avoid:** Two options: (1) Add `paths` alias in worker tsconfig pointing to the schema, or (2) Copy/re-export the relevant schema types in the worker. Option 1 is cleaner but requires `outDir` adjustments. A pragmatic approach: adjust worker tsconfig to set `rootDir` to the project root or use TypeScript project references.
**Warning signs:** `TS6059: File is not under 'rootDir'` compilation error.

### Pitfall 4: Neon HTTP Driver Returning Strings for Numbers
**What goes wrong:** The `neon()` tagged template returns all values as strings by default, including integers and floats.
**Why it happens:** The HTTP driver doesn't have PostgreSQL type parsing built in the same way as `pg` driver.
**How to avoid:** Use Drizzle ORM which handles type coercion based on the schema definition. If using raw `neon()` queries, explicitly cast or parse numeric fields.
**Warning signs:** `consecutiveFailures` stored as `"3"` instead of `3`, comparison logic breaks.

### Pitfall 5: SSL Probe on Expired Certificates
**What goes wrong:** `rejectUnauthorized: true` (default) causes `tls.connect` to emit an `error` event for expired certs, preventing certificate extraction.
**Why it happens:** The purpose of SSL monitoring is to detect expiring/expired certs, but default TLS behavior rejects them.
**How to avoid:** Set `rejectUnauthorized: false` in the TLS connect options. The probe is about certificate health inspection, not enforcing trust.
**Warning signs:** All monitors with expired or self-signed certs show as "down" with no `sslExpiresAt` data.

### Pitfall 6: URL Parsing for TCP Monitors
**What goes wrong:** TCP monitor URLs don't follow standard HTTP URL format -- they might be `tcp://host:port` or just `host:port`.
**Why it happens:** Users enter TCP targets differently than HTTP URLs.
**How to avoid:** Parse the URL field to extract host and port. Try `new URL(url)` first (handles `tcp://host:port`), fallback to string splitting on `:` for bare `host:port` format. Default port to 80 if not specified.
**Warning signs:** TCP probes fail with "hostname not found" because port is included in the hostname.

## Code Examples

### Tick Loop Orchestrator
```typescript
// worker/src/check-engine.ts
import { and, eq, or, isNull, sql, lte } from 'drizzle-orm';
import { monitors, heartbeats } from '../../lib/db/schema';

const TICK_INTERVAL_MS = 30_000; // 30 seconds

export function startCheckEngine(db: WorkerDb): NodeJS.Timeout {
  console.log('[worker] Check engine started, tick interval: 30s');

  const intervalId = setInterval(async () => {
    try {
      await tick(db);
    } catch (err) {
      console.error('[worker] Tick error:', err);
    }
  }, TICK_INTERVAL_MS);

  // Run first tick immediately
  tick(db).catch((err) => console.error('[worker] Initial tick error:', err));

  return intervalId;
}

async function tick(db: WorkerDb): Promise<void> {
  const now = new Date();

  // Query monitors that are due for checking
  const dueMonitors = await db
    .select()
    .from(monitors)
    .where(
      and(
        eq(monitors.status, 'active'),
        or(
          isNull(monitors.lastCheckedAt),
          lte(
            monitors.lastCheckedAt,
            sql`NOW() - MAKE_INTERVAL(secs => ${monitors.checkIntervalSeconds})`
          )
        )
      )
    );

  if (dueMonitors.length === 0) return;

  console.log(`[worker] Checking ${dueMonitors.length} monitor(s)`);

  // Check all due monitors in parallel
  const results = await Promise.allSettled(
    dueMonitors.map((monitor) => checkMonitor(db, monitor))
  );

  // Log any unexpected rejections (probes should never reject)
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[worker] Unexpected check rejection:', result.reason);
    }
  }
}
```

### Monitor Check with Result Storage
```typescript
async function checkMonitor(db: WorkerDb, monitor: Monitor): Promise<void> {
  // Dispatch to appropriate probe based on type
  let result: ProbeResult;
  switch (monitor.type) {
    case 'http':
      result = await probeHttp(monitor.url, monitor.timeoutMs, monitor.expectedStatusCode ?? 200);
      break;
    case 'tcp': {
      const { host, port } = parseTcpTarget(monitor.url);
      result = await probeTcp(host, port, monitor.timeoutMs);
      break;
    }
    case 'ssl': {
      const host = parseHostname(monitor.url);
      result = await probeSsl(host, 443, monitor.timeoutMs);
      break;
    }
  }

  const checkedAt = new Date();

  // Insert heartbeat record
  await db.insert(heartbeats).values({
    monitorId: monitor.id,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    statusCode: result.statusCode ?? null,
    error: result.error ?? null,
    sslExpiresAt: result.sslExpiresAt ?? null,
    checkedAt,
  });

  // Update monitor: lastCheckedAt and consecutiveFailures
  const newConsecutiveFailures = result.status === 1
    ? 0
    : monitor.consecutiveFailures + 1;

  await db.update(monitors).set({
    lastCheckedAt: checkedAt,
    consecutiveFailures: newConsecutiveFailures,
    updatedAt: checkedAt,
  }).where(eq(monitors.id, monitor.id));

  // Upsert hourly rollup
  await upsertHourlyRollup(db, monitor.id, result, checkedAt);
}
```

### URL Parsing Helpers
```typescript
// Parse TCP target from URL field: handles "tcp://host:port", "host:port", or URL with port
function parseTcpTarget(url: string): { host: string; port: number } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 80,
    };
  } catch {
    // Fallback for bare host:port format
    const parts = url.split(':');
    if (parts.length === 2) {
      return { host: parts[0], port: parseInt(parts[1], 10) };
    }
    return { host: url, port: 80 };
  }
}

// Extract hostname from URL for SSL probes
function parseHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    // Strip protocol and path, extract host
    return url.replace(/^[a-z]+:\/\//, '').split(/[:/]/)[0];
  }
}
```

### Daily Rollup and Cleanup Maintenance Job
```typescript
// Runs every ~4 hours
const MAINTENANCE_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function startMaintenanceJob(db: WorkerDb): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await aggregateDailyRollups(db);
      await cleanupOldHeartbeats(db);
    } catch (err) {
      console.error('[worker] Maintenance job error:', err);
    }
  }, MAINTENANCE_INTERVAL_MS);
}

async function cleanupOldHeartbeats(db: WorkerDb): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const deleted = await db.delete(heartbeats)
    .where(lte(heartbeats.checkedAt, cutoff));
  console.log(`[worker] Cleaned up old heartbeats older than ${cutoff.toISOString()}`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setTimeout` chains for scheduling | `setInterval` + DB-driven `lastCheckedAt` | Standard pattern | Survives restarts, no drift accumulation |
| `node-fetch` or `axios` for HTTP | Built-in `fetch` with `AbortSignal.timeout` | Node.js 18+ (stable in 22) | Zero dependencies for HTTP probes |
| `request` library for SSL checks | `tls.connect` + `getPeerCertificate()` | `request` deprecated 2020 | Built-in, no dependency needed |
| `pg` driver for worker DB | `@neondatabase/serverless` neon-http + Drizzle | Neon serverless driver 1.0 (2024) | HTTP-based queries, no connection pool needed for low-frequency worker |

**Deprecated/outdated:**
- `request` npm package: deprecated, do not use for HTTP probes
- `node-fetch`: unnecessary in Node.js 22, built-in fetch is stable and complete
- BullMQ for this use case: overkill for a single-worker setInterval pattern (decided in CONTEXT.md)

## Open Questions

1. **Worker tsconfig rootDir for shared schema imports**
   - What we know: Worker tsconfig has `rootDir: ./src` which prevents importing `../../lib/db/schema.ts`
   - What's unclear: Whether TypeScript project references or a simpler rootDir change is better
   - Recommendation: Change worker tsconfig `rootDir` to `../..` (project root) and adjust `outDir` to `./dist`, or use a barrel re-export file in the worker. The planner should pick one approach and stick with it. Alternatively, the worker could use raw SQL via `neon()` tagged templates to avoid the import entirely -- the tradeoff is losing type safety.

2. **Drizzle ORM version compatibility in worker**
   - What we know: Root package.json has `drizzle-orm: ^0.45.1`, worker does not have it installed
   - What's unclear: Whether installing drizzle-orm in worker creates version conflicts with root
   - Recommendation: Install same version in worker. Since the worker has its own `node_modules`, the versions are independent. Alternatively, the worker could import from root's `node_modules` if using a monorepo-style setup (but this project uses separate `package.json` files).

3. **neon-http vs neon-serverless for worker Drizzle**
   - What we know: neon-http (HTTP queries) works in Node.js but is designed for edge; neon-serverless (WebSocket Pool) is recommended for long-running processes
   - What's unclear: Performance difference for low-frequency queries (20 queries per tick, every 30s)
   - Recommendation: Use neon-http (`drizzle-orm/neon-http`) since the worker's query volume is low (not a high-throughput scenario). HTTP avoids WebSocket setup complexity. If performance becomes an issue, switching to Pool is straightforward.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/worker --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MON-05 | HTTP probe returns correct status/response time for matching and non-matching status codes | unit | `npx vitest run tests/worker/probes/http.test.ts -x` | No -- Wave 0 |
| MON-06 | TCP probe connects to host:port and returns success/failure | unit | `npx vitest run tests/worker/probes/tcp.test.ts -x` | No -- Wave 0 |
| CHK-01 | Tick loop queries due monitors and dispatches probes | unit | `npx vitest run tests/worker/check-engine.test.ts -x` | No -- Wave 0 |
| CHK-02 | Check results stored as heartbeat with all fields populated | unit | `npx vitest run tests/worker/check-engine.test.ts -x` | No -- Wave 0 |
| CHK-03 | consecutiveFailures increments on failure, resets on success | unit | `npx vitest run tests/worker/check-engine.test.ts -x` | No -- Wave 0 |
| SSL | SSL probe extracts certificate expiry date | unit | `npx vitest run tests/worker/probes/ssl.test.ts -x` | No -- Wave 0 |
| ROLLUP | Hourly rollup upsert produces correct aggregates | unit | `npx vitest run tests/worker/rollup.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/worker --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/worker/probes/http.test.ts` -- covers MON-05 (mock fetch, verify status code comparison, timeout handling, redirect behavior)
- [ ] `tests/worker/probes/tcp.test.ts` -- covers MON-06 (mock net.createConnection, verify connect/timeout/error handling)
- [ ] `tests/worker/probes/ssl.test.ts` -- covers SSL cert extraction (mock tls.connect, verify getPeerCertificate parsing)
- [ ] `tests/worker/check-engine.test.ts` -- covers CHK-01, CHK-02, CHK-03 (mock DB and probes, verify tick loop logic, heartbeat storage, consecutive failures)
- [ ] `tests/worker/rollup.test.ts` -- covers hourly upsert logic (mock DB, verify running average formula)
- [ ] `tests/worker/url-parsing.test.ts` -- covers TCP host:port and SSL hostname parsing edge cases
- [ ] Vitest config may need adjustment: current environment is `jsdom` which is unnecessary for worker tests. Worker tests should use `node` environment (can be set per-file with `// @vitest-environment node` comment or via vitest config `environmentMatchGlobs`).

## Sources

### Primary (HIGH confidence)
- [Node.js TLS docs (v25)](https://nodejs.org/api/tls.html) - `tls.connect()`, `getPeerCertificate()`, certificate object properties
- [Node.js Net docs (v25)](https://nodejs.org/api/net.html) - `net.createConnection()`, socket events, timeout behavior
- [MDN AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) - `AbortSignal.timeout()` usage with fetch
- [Drizzle ORM Upsert Guide](https://orm.drizzle.team/docs/guides/upsert) - `onConflictDoUpdate` syntax, composite keys, `excluded` keyword
- [Drizzle ORM Neon Connection](https://orm.drizzle.team/docs/connect-neon) - neon-http vs neon-serverless driver setup
- [Neon Serverless Driver Docs](https://neon.com/docs/serverless/serverless-driver) - `neon()` tagged templates, Pool vs HTTP

### Secondary (MEDIUM confidence)
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) - PgBouncer transaction mode, 10K connection limit
- [Better Stack Node.js Timeouts Guide](https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/) - AbortSignal patterns

### Tertiary (LOW confidence)
- None -- all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are Node.js built-ins or already in the project. Drizzle upsert syntax verified via official docs.
- Architecture: HIGH - Probe pattern is well-established. Worker tick loop is trivial. URL parsing is straightforward.
- Pitfalls: HIGH - Socket leak, running average, and tsconfig issues are well-documented problems with known solutions.
- Validation: MEDIUM - Test structure proposed but vitest environment configuration for worker tests needs verification during implementation.

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable -- Node.js built-ins and Drizzle ORM are mature)
