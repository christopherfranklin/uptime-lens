import { sql } from "drizzle-orm";
import { heartbeatsHourly } from "../../lib/db/schema";
import type { WorkerDb } from "./db";
import { maybeProcessWeeklyDigest } from "./digest";
import type { ProbeResult } from "./probes/types";

const MAINTENANCE_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Upsert an hourly rollup entry after each check.
 * Truncates checkedAt to the hour boundary, then inserts or updates
 * the running average, min, max, total, and successful check counts.
 */
export async function upsertHourlyRollup(
  db: WorkerDb,
  monitorId: number,
  result: ProbeResult,
  checkedAt: Date,
): Promise<void> {
  // Truncate to hour boundary
  const hourBucket = new Date(checkedAt);
  hourBucket.setMinutes(0, 0, 0);

  const responseTime = result.responseTimeMs;
  const isSuccess = result.status === 1 ? 1 : 0;

  await db
    .insert(heartbeatsHourly)
    .values({
      monitorId,
      hour: hourBucket,
      totalChecks: 1,
      successfulChecks: isSuccess,
      avgResponseTimeMs: responseTime,
      minResponseTimeMs: responseTime,
      maxResponseTimeMs: responseTime,
    })
    .onConflictDoUpdate({
      target: [heartbeatsHourly.monitorId, heartbeatsHourly.hour],
      set: {
        totalChecks: sql`${heartbeatsHourly.totalChecks} + 1`,
        successfulChecks: sql`${heartbeatsHourly.successfulChecks} + ${isSuccess}`,
        avgResponseTimeMs: sql`(${heartbeatsHourly.avgResponseTimeMs} * ${heartbeatsHourly.totalChecks} + ${responseTime}) / (${heartbeatsHourly.totalChecks} + 1)`,
        minResponseTimeMs: sql`LEAST(${heartbeatsHourly.minResponseTimeMs}, ${responseTime})`,
        maxResponseTimeMs: sql`GREATEST(${heartbeatsHourly.maxResponseTimeMs}, ${responseTime})`,
      },
    });
}

/**
 * Start the maintenance job: daily rollup aggregation + old heartbeat cleanup.
 * Runs every 4 hours. Returns the interval ID for graceful shutdown.
 */
export function startMaintenanceJob(db: WorkerDb): NodeJS.Timeout {
  console.log("[worker] Maintenance job starting (4h interval)");

  return setInterval(async () => {
    try {
      console.log("[worker] Running maintenance job...");
      await _aggregateDailyRollups(db);
      await _cleanupOldHeartbeats(db);
      await maybeProcessWeeklyDigest(db);
      console.log("[worker] Maintenance job complete");
    } catch (err) {
      console.error("[worker] Maintenance job failed:", err);
    }
  }, MAINTENANCE_INTERVAL_MS);
}

/**
 * Aggregate hourly rollups into daily rollups.
 * Groups by monitorId + date, computes weighted avg, min, max, uptime percentage.
 * Exported as _aggregateDailyRollups for testing.
 */
export async function _aggregateDailyRollups(db: WorkerDb): Promise<void> {
  await db.execute(sql`
    INSERT INTO heartbeats_daily (monitor_id, date, total_checks, successful_checks, avg_response_time_ms, min_response_time_ms, max_response_time_ms, uptime_percentage)
    SELECT
      monitor_id,
      DATE_TRUNC('day', hour) AS date,
      SUM(total_checks)::int AS total_checks,
      SUM(successful_checks)::int AS successful_checks,
      SUM(avg_response_time_ms * total_checks) / NULLIF(SUM(total_checks), 0) AS avg_response_time_ms,
      MIN(min_response_time_ms) AS min_response_time_ms,
      MAX(max_response_time_ms) AS max_response_time_ms,
      SUM(successful_checks)::float / NULLIF(SUM(total_checks), 0) AS uptime_percentage
    FROM heartbeats_hourly
    GROUP BY monitor_id, DATE_TRUNC('day', hour)
    ON CONFLICT (monitor_id, date) DO UPDATE SET
      total_checks = EXCLUDED.total_checks,
      successful_checks = EXCLUDED.successful_checks,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms,
      min_response_time_ms = EXCLUDED.min_response_time_ms,
      max_response_time_ms = EXCLUDED.max_response_time_ms,
      uptime_percentage = EXCLUDED.uptime_percentage
  `);
  console.log("[worker] Daily rollups aggregated");
}

/**
 * Delete heartbeat records older than 7 days.
 * Exported as _cleanupOldHeartbeats for testing.
 */
export async function _cleanupOldHeartbeats(db: WorkerDb): Promise<void> {
  const result = await db.execute(
    sql`DELETE FROM heartbeats WHERE checked_at < NOW() - INTERVAL '7 days'`,
  );
  console.log("[worker] Old heartbeats cleaned up");
}
