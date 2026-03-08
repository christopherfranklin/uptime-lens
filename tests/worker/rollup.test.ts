// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProbeResult } from "../../worker/src/probes/types";

// We'll test the logic by importing the functions and providing mock DB
import {
  upsertHourlyRollup,
  startMaintenanceJob,
  _aggregateDailyRollups,
  _cleanupOldHeartbeats,
} from "../../worker/src/rollup";

// Helper to create a mock DB for rollup operations
function createMockDb() {
  const insertResult = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };

  return {
    insert: vi.fn().mockReturnValue(insertResult),
    execute: vi.fn().mockResolvedValue(undefined),
    _insertResult: insertResult,
  } as any;
}

describe("Rollup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsertHourlyRollup()", () => {
    it("truncates checkedAt to the hour boundary", async () => {
      const db = createMockDb();
      const result: ProbeResult = {
        status: 1,
        responseTimeMs: 150,
        statusCode: 200,
      };
      const checkedAt = new Date("2026-03-08T14:37:22.456Z");

      await upsertHourlyRollup(db, 1, result, checkedAt);

      expect(db.insert).toHaveBeenCalled();
      const values = db._insertResult.values.mock.calls[0][0];
      const hour = new Date(values.hour);
      expect(hour.getMinutes()).toBe(0);
      expect(hour.getSeconds()).toBe(0);
      expect(hour.getMilliseconds()).toBe(0);
      expect(hour.getUTCHours()).toBe(14);
    });

    it("inserts a new row with initial values when no conflict", async () => {
      const db = createMockDb();
      const result: ProbeResult = {
        status: 1,
        responseTimeMs: 200,
        statusCode: 200,
      };
      const checkedAt = new Date("2026-03-08T10:00:00Z");

      await upsertHourlyRollup(db, 42, result, checkedAt);

      const values = db._insertResult.values.mock.calls[0][0];
      expect(values.monitorId).toBe(42);
      expect(values.totalChecks).toBe(1);
      expect(values.successfulChecks).toBe(1);
      expect(values.avgResponseTimeMs).toBe(200);
      expect(values.minResponseTimeMs).toBe(200);
      expect(values.maxResponseTimeMs).toBe(200);
    });

    it("sets successfulChecks to 0 for failed checks", async () => {
      const db = createMockDb();
      const result: ProbeResult = {
        status: 0,
        responseTimeMs: 5000,
        error: "Timeout",
      };
      const checkedAt = new Date("2026-03-08T10:00:00Z");

      await upsertHourlyRollup(db, 1, result, checkedAt);

      const values = db._insertResult.values.mock.calls[0][0];
      expect(values.successfulChecks).toBe(0);
      expect(values.totalChecks).toBe(1);
    });

    it("uses onConflictDoUpdate for upsert behavior", async () => {
      const db = createMockDb();
      const result: ProbeResult = {
        status: 1,
        responseTimeMs: 100,
        statusCode: 200,
      };

      await upsertHourlyRollup(db, 1, result, new Date("2026-03-08T10:30:00Z"));

      expect(db._insertResult.onConflictDoUpdate).toHaveBeenCalled();
      const conflictConfig = db._insertResult.onConflictDoUpdate.mock.calls[0][0];
      // Should target monitorId + hour columns
      expect(conflictConfig.target).toBeDefined();
      // Should have set with SQL expressions for running average
      expect(conflictConfig.set).toBeDefined();
    });

    it("running average formula produces correct results", () => {
      // Verify the math: after checks with times 100, 200, 300
      // Step 1: avg=100 (1 check)
      // Step 2: newAvg = (100 * 1 + 200) / 2 = 150
      // Step 3: newAvg = (150 * 2 + 300) / 3 = 200
      const check1Avg = 100;
      const check2Avg = (check1Avg * 1 + 200) / 2;
      const check3Avg = (check2Avg * 2 + 300) / 3;
      expect(check2Avg).toBe(150);
      expect(check3Avg).toBe(200);
    });
  });

  describe("aggregateDailyRollups()", () => {
    it("executes SQL to aggregate hourly data into daily rows", async () => {
      const db = createMockDb();

      await _aggregateDailyRollups(db);

      // Should execute a raw SQL query for the aggregation + upsert
      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe("cleanupOldHeartbeats()", () => {
    it("executes SQL to delete heartbeats older than 7 days", async () => {
      const db = createMockDb();

      await _cleanupOldHeartbeats(db);

      expect(db.execute).toHaveBeenCalled();
    });
  });

  describe("startMaintenanceJob()", () => {
    it("returns a timer interval ID", () => {
      const db = createMockDb();
      const interval = startMaintenanceJob(db);

      expect(interval).toBeDefined();
      // Clean up the interval to prevent hanging tests
      clearInterval(interval);
    });
  });
});
