import type { WorkerDb } from "./db";
import type { ProbeResult } from "./probes/types";

/**
 * Upsert an hourly rollup entry after each check.
 * Stub -- full implementation in Task 2.
 */
export async function upsertHourlyRollup(
  _db: WorkerDb,
  _monitorId: number,
  _result: ProbeResult,
  _checkedAt: Date,
): Promise<void> {
  // Will be implemented in Task 2
}

/**
 * Start the maintenance job (daily rollup aggregation + old heartbeat cleanup).
 * Stub -- full implementation in Task 2.
 */
export function startMaintenanceJob(_db: WorkerDb): NodeJS.Timeout {
  // Will be implemented in Task 2
  return setInterval(() => {}, 4 * 60 * 60 * 1000);
}
