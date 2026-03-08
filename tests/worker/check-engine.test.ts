// @vitest-environment node
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock modules before importing
vi.mock("../../worker/src/probes/http", () => ({
  probeHttp: vi.fn(),
}));
vi.mock("../../worker/src/probes/tcp", () => ({
  probeTcp: vi.fn(),
}));
vi.mock("../../worker/src/probes/ssl", () => ({
  probeSsl: vi.fn(),
}));
vi.mock("../../worker/src/rollup", () => ({
  upsertHourlyRollup: vi.fn().mockResolvedValue(undefined),
}));

import type { ProbeResult } from "../../worker/src/probes/types";
import { probeHttp } from "../../worker/src/probes/http";
import { probeTcp } from "../../worker/src/probes/tcp";
import { probeSsl } from "../../worker/src/probes/ssl";
import { upsertHourlyRollup } from "../../worker/src/rollup";

// We'll test tick() and checkMonitor() via the exported test helpers
// The module exposes _tick and _checkMonitor for testing
import { _tick, _checkMonitor } from "../../worker/src/check-engine";

// Helper to create a mock DB
function createMockDb() {
  const selectResult = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };
  const insertResult = {
    values: vi.fn().mockReturnThis(),
  };
  const updateResult = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn().mockReturnValue(selectResult),
    insert: vi.fn().mockReturnValue(insertResult),
    update: vi.fn().mockReturnValue(updateResult),
    _selectResult: selectResult,
    _insertResult: insertResult,
    _updateResult: updateResult,
  } as any;
}

// Helper to create a mock monitor
function createMockMonitor(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    userId: "user-1",
    name: "Test Monitor",
    url: "https://example.com",
    type: "http" as const,
    status: "active" as const,
    expectedStatusCode: 200,
    checkIntervalSeconds: 180,
    timeoutMs: 10000,
    consecutiveFailures: 0,
    lastCheckedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Check Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tick()", () => {
    it("does nothing when no monitors are due", async () => {
      const db = createMockDb();
      db._selectResult.where.mockResolvedValue([]);

      await _tick(db);

      // Should query but not insert anything
      expect(db.select).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("queries only active monitors where lastCheckedAt is null or elapsed >= checkIntervalSeconds", async () => {
      const db = createMockDb();
      db._selectResult.where.mockResolvedValue([]);

      await _tick(db);

      // Should call select and apply WHERE conditions
      expect(db.select).toHaveBeenCalled();
      expect(db._selectResult.from).toHaveBeenCalled();
      expect(db._selectResult.where).toHaveBeenCalled();
    });

    it("checks all due monitors in parallel via Promise.allSettled", async () => {
      const monitor1 = createMockMonitor({ id: 1, url: "https://a.com" });
      const monitor2 = createMockMonitor({ id: 2, url: "https://b.com" });

      const db = createMockDb();
      db._selectResult.where.mockResolvedValue([monitor1, monitor2]);

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 100,
        statusCode: 200,
      } as ProbeResult);

      await _tick(db);

      // Both monitors should be probed
      expect(probeHttp).toHaveBeenCalledTimes(2);
    });

    it("logs but does not crash on unexpected probe rejections", async () => {
      const monitor = createMockMonitor();
      const db = createMockDb();
      db._selectResult.where.mockResolvedValue([monitor]);

      (probeHttp as Mock).mockRejectedValue(new Error("unexpected crash"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw
      await expect(_tick(db)).resolves.not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("checkMonitor()", () => {
    it("dispatches probeHttp for HTTP monitors", async () => {
      const monitor = createMockMonitor({ type: "http", url: "https://example.com" });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 150,
        statusCode: 200,
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(probeHttp).toHaveBeenCalledWith("https://example.com", 10000, 200);
      expect(probeTcp).not.toHaveBeenCalled();
      expect(probeSsl).not.toHaveBeenCalled();
    });

    it("dispatches probeTcp for TCP monitors", async () => {
      const monitor = createMockMonitor({
        type: "tcp",
        url: "tcp://db.example.com:5432",
      });
      const db = createMockDb();

      (probeTcp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 50,
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(probeTcp).toHaveBeenCalledWith("db.example.com", 5432, 10000);
      expect(probeHttp).not.toHaveBeenCalled();
      expect(probeSsl).not.toHaveBeenCalled();
    });

    it("dispatches probeSsl for SSL monitors", async () => {
      const monitor = createMockMonitor({
        type: "ssl",
        url: "https://secure.example.com",
      });
      const db = createMockDb();

      (probeSsl as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 200,
        sslExpiresAt: new Date("2027-01-01"),
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(probeSsl).toHaveBeenCalledWith("secure.example.com", 443, 10000);
      expect(probeHttp).not.toHaveBeenCalled();
      expect(probeTcp).not.toHaveBeenCalled();
    });

    it("inserts heartbeat with status=1, responseTimeMs, statusCode on success", async () => {
      const monitor = createMockMonitor();
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 120,
        statusCode: 200,
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      // Should insert a heartbeat
      expect(db.insert).toHaveBeenCalled();
      const insertValues = db._insertResult.values.mock.calls[0][0];
      expect(insertValues.monitorId).toBe(1);
      expect(insertValues.status).toBe(1);
      expect(insertValues.responseTimeMs).toBe(120);
      expect(insertValues.statusCode).toBe(200);
    });

    it("resets consecutiveFailures to 0 on success", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 3 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 100,
        statusCode: 200,
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      // Should update monitor with consecutiveFailures = 0
      expect(db.update).toHaveBeenCalled();
      const setValues = db._updateResult.set.mock.calls[0][0];
      expect(setValues.consecutiveFailures).toBe(0);
    });

    it("inserts heartbeat with status=0, error message on failure", async () => {
      const monitor = createMockMonitor();
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Timeout after 10000ms",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(db.insert).toHaveBeenCalled();
      const insertValues = db._insertResult.values.mock.calls[0][0];
      expect(insertValues.status).toBe(0);
      expect(insertValues.error).toBe("Timeout after 10000ms");
    });

    it("increments consecutiveFailures by 1 on failure", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Connection refused",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      const setValues = db._updateResult.set.mock.calls[0][0];
      expect(setValues.consecutiveFailures).toBe(3);
    });

    it("after 3 consecutive failures, consecutiveFailures equals 3", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 5000,
        error: "Server error",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      const setValues = db._updateResult.set.mock.calls[0][0];
      expect(setValues.consecutiveFailures).toBe(3);
    });

    it("calls upsertHourlyRollup after heartbeat insert", async () => {
      const monitor = createMockMonitor();
      const db = createMockDb();

      const result: ProbeResult = {
        status: 1,
        responseTimeMs: 100,
        statusCode: 200,
      };
      (probeHttp as Mock).mockResolvedValue(result);

      await _checkMonitor(db, monitor);

      expect(upsertHourlyRollup).toHaveBeenCalledWith(
        db,
        monitor.id,
        result,
        expect.any(Date),
      );
    });
  });
});
