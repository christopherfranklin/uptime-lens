import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { monitors, heartbeats } from "../../lib/db/schema";
import type { WorkerDb } from "./db";
import type { ProbeResult } from "./probes/types";
import { probeHttp } from "./probes/http";
import { probeTcp } from "./probes/tcp";
import { probeSsl } from "./probes/ssl";
import { parseTcpTarget, parseHostname } from "./probes/url";
import { upsertHourlyRollup } from "./rollup";
import {
  openIncident,
  resolveIncident,
  getOngoingIncident,
  getUserEmailForMonitor,
} from "./incidents";
import { sendAlertEmail } from "./emails/send";
import {
  downtimeEmailHtml,
  recoveryEmailHtml,
  formatDuration,
} from "./emails/templates";
import { checkSslExpiry } from "./ssl-expiry";

const APP_URL = process.env.APP_URL || "https://uptimelens.io";

const TICK_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Start the check engine tick loop.
 * Runs an immediate first tick, then every 30 seconds.
 * Returns the interval ID for graceful shutdown.
 */
export function startCheckEngine(db: WorkerDb): NodeJS.Timeout {
  console.log("[worker] Check engine starting (30s tick loop)");

  // Immediate first tick
  _tick(db).catch((err) => {
    console.error("[worker] Initial tick failed:", err);
  });

  return setInterval(() => {
    _tick(db).catch((err) => {
      console.error("[worker] Tick failed:", err);
    });
  }, TICK_INTERVAL_MS);
}

/**
 * Single tick: query due monitors, dispatch probes in parallel, store results.
 * Exported as _tick for testing.
 */
export async function _tick(db: WorkerDb): Promise<void> {
  // Query active monitors where lastCheckedAt is null or elapsed >= checkIntervalSeconds
  const dueMonitors = await db
    .select()
    .from(monitors)
    .where(
      and(
        eq(monitors.status, "active"),
        or(
          isNull(monitors.lastCheckedAt),
          lte(
            monitors.lastCheckedAt,
            sql`NOW() - MAKE_INTERVAL(secs => ${monitors.checkIntervalSeconds})`,
          ),
        ),
      ),
    );

  if (dueMonitors.length === 0) {
    return;
  }

  console.log(`[worker] Checking ${dueMonitors.length} monitor(s)`);

  const results = await Promise.allSettled(
    dueMonitors.map((m) => _checkMonitor(db, m)),
  );

  // Log any rejected results (should not happen since probes always resolve)
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[worker] Monitor check rejected:", result.reason);
    }
  }
}

/**
 * Check a single monitor: dispatch probe, store heartbeat, update monitor state.
 * Exported as _checkMonitor for testing.
 */
export async function _checkMonitor(
  db: WorkerDb,
  monitor: typeof monitors.$inferSelect,
): Promise<void> {
  let result: ProbeResult;

  switch (monitor.type) {
    case "http": {
      result = await probeHttp(
        monitor.url,
        monitor.timeoutMs,
        monitor.expectedStatusCode ?? 200,
      );
      break;
    }
    case "tcp": {
      const { host, port } = parseTcpTarget(monitor.url);
      result = await probeTcp(host, port, monitor.timeoutMs);
      break;
    }
    case "ssl": {
      const host = parseHostname(monitor.url);
      result = await probeSsl(host, 443, monitor.timeoutMs);
      break;
    }
    default: {
      console.error(
        `[worker] Unknown monitor type: ${(monitor as any).type}`,
      );
      return;
    }
  }

  const checkedAt = new Date();

  // Insert heartbeat record
  await db.insert(heartbeats).values({
    monitorId: monitor.id,
    status: result.status,
    responseTimeMs: result.responseTimeMs,
    statusCode: result.statusCode,
    error: result.error,
    sslExpiresAt: result.sslExpiresAt,
    checkedAt,
  });

  // Update monitor state
  const newConsecutiveFailures =
    result.status === 1 ? 0 : monitor.consecutiveFailures + 1;

  await db
    .update(monitors)
    .set({
      lastCheckedAt: checkedAt,
      consecutiveFailures: newConsecutiveFailures,
      updatedAt: checkedAt,
    })
    .where(eq(monitors.id, monitor.id));

  // Upsert hourly rollup
  await upsertHourlyRollup(db, monitor.id, result, checkedAt);

  // --- Incident State Machine ---

  // 1. Check for incident OPEN condition
  if (newConsecutiveFailures >= 3) {
    const existing = await getOngoingIncident(db, monitor.id);
    if (!existing) {
      const cause =
        result.error ||
        (result.statusCode ? `HTTP ${result.statusCode}` : "Unknown");
      await openIncident(db, monitor.id, cause, checkedAt);
      // Fire-and-forget email
      try {
        const email = await getUserEmailForMonitor(db, monitor.id);
        if (email) {
          const html = downtimeEmailHtml({
            monitorName: monitor.name,
            url: monitor.url,
            cause,
            detectedAt: checkedAt.toISOString(),
            dashboardUrl: `${APP_URL}/dashboard`,
          });
          await sendAlertEmail({
            to: email,
            subject: `Down: ${monitor.name}`,
            html,
          });
        }
      } catch (err) {
        console.error("[worker] Failed to send downtime alert:", err);
      }
    }
  }

  // 2. Check for incident CLOSE condition
  if (result.status === 1) {
    const ongoing = await getOngoingIncident(db, monitor.id);
    if (ongoing) {
      await resolveIncident(db, ongoing.id, monitor.id, checkedAt);
      try {
        const email = await getUserEmailForMonitor(db, monitor.id);
        if (email) {
          const duration = formatDuration(
            checkedAt.getTime() - ongoing.startedAt.getTime(),
          );
          const html = recoveryEmailHtml({
            monitorName: monitor.name,
            url: monitor.url,
            downtimeDuration: duration,
            recoveredAt: checkedAt.toISOString(),
            dashboardUrl: `${APP_URL}/dashboard`,
          });
          await sendAlertEmail({
            to: email,
            subject: `Recovered: ${monitor.name}`,
            html,
          });
        }
      } catch (err) {
        console.error("[worker] Failed to send recovery alert:", err);
      }
    }
  }

  // 3. Check SSL expiry (for monitors with sslExpiresAt in result)
  if (result.sslExpiresAt) {
    await checkSslExpiry(db, monitor, result.sslExpiresAt);
  }
}
