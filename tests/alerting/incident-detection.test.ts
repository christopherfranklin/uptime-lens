// @vitest-environment node
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock probe modules (same pattern as check-engine.test.ts)
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

// Mock incident module
vi.mock("../../worker/src/incidents", () => ({
  openIncident: vi.fn().mockResolvedValue(undefined),
  resolveIncident: vi.fn().mockResolvedValue(undefined),
  getOngoingIncident: vi.fn().mockResolvedValue(null),
  getUserEmailForMonitor: vi.fn().mockResolvedValue("user@example.com"),
}));

// Mock email send
vi.mock("../../worker/src/emails/send", () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock email templates
vi.mock("../../worker/src/emails/templates", () => ({
  downtimeEmailHtml: vi.fn().mockReturnValue("<html>downtime</html>"),
  recoveryEmailHtml: vi.fn().mockReturnValue("<html>recovery</html>"),
  formatDuration: vi.fn().mockReturnValue("5m"),
}));

// Mock SSL expiry module (will be created in Task 2)
vi.mock("../../worker/src/ssl-expiry", () => ({
  checkSslExpiry: vi.fn().mockResolvedValue(undefined),
}));

import type { ProbeResult } from "../../worker/src/probes/types";
import { probeHttp } from "../../worker/src/probes/http";
import { openIncident, resolveIncident, getOngoingIncident, getUserEmailForMonitor } from "../../worker/src/incidents";
import { sendAlertEmail } from "../../worker/src/emails/send";
import { downtimeEmailHtml, recoveryEmailHtml, formatDuration } from "../../worker/src/emails/templates";
import { _checkMonitor } from "../../worker/src/check-engine";

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
    isUp: true,
    lastSslAlertDays: null,
    lastCheckedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Incident Detection in Check Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mocks
    (getOngoingIncident as Mock).mockResolvedValue(null);
    (getUserEmailForMonitor as Mock).mockResolvedValue("user@example.com");
    (sendAlertEmail as Mock).mockResolvedValue(undefined);
  });

  describe("opening incidents", () => {
    it("opens incident and sends downtime alert when consecutiveFailures reaches 3", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Connection refused",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      // Should open an incident (consecutiveFailures goes from 2 -> 3)
      expect(openIncident).toHaveBeenCalledWith(
        db,
        monitor.id,
        "Connection refused",
        expect.any(Date),
      );

      // Should send downtime email
      expect(sendAlertEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Down: Test Monitor",
        }),
      );
    });

    it("does not open incident when consecutiveFailures < 3", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 0 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 5000,
        error: "Timeout",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      // consecutiveFailures goes 0 -> 1, below threshold
      expect(openIncident).not.toHaveBeenCalled();
      expect(sendAlertEmail).not.toHaveBeenCalled();
    });

    it("does not open duplicate incident when already ongoing", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 5 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Connection refused",
      } as ProbeResult);

      // Ongoing incident already exists
      (getOngoingIncident as Mock).mockResolvedValue({
        id: 42,
        monitorId: 1,
        status: "ongoing",
        cause: "Connection refused",
        startedAt: new Date("2026-03-08T01:00:00Z"),
      });

      await _checkMonitor(db, monitor);

      // Should NOT open another incident
      expect(openIncident).not.toHaveBeenCalled();
      expect(sendAlertEmail).not.toHaveBeenCalled();
    });
  });

  describe("resolving incidents", () => {
    it("resolves incident and sends recovery alert when check succeeds", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 3, isUp: false });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 150,
        statusCode: 200,
      } as ProbeResult);

      // Ongoing incident exists
      const ongoingIncident = {
        id: 42,
        monitorId: 1,
        status: "ongoing",
        cause: "Connection refused",
        startedAt: new Date("2026-03-08T01:00:00Z"),
      };
      (getOngoingIncident as Mock).mockResolvedValue(ongoingIncident);

      await _checkMonitor(db, monitor);

      // Should resolve the incident
      expect(resolveIncident).toHaveBeenCalledWith(
        db,
        42,
        monitor.id,
        expect.any(Date),
      );

      // Should send recovery email
      expect(formatDuration).toHaveBeenCalled();
      expect(sendAlertEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Recovered: Test Monitor",
        }),
      );
    });

    it("does not send recovery when no ongoing incident", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 0 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 1,
        responseTimeMs: 100,
        statusCode: 200,
      } as ProbeResult);

      (getOngoingIncident as Mock).mockResolvedValue(null);

      await _checkMonitor(db, monitor);

      expect(resolveIncident).not.toHaveBeenCalled();
      expect(sendAlertEmail).not.toHaveBeenCalled();
    });
  });

  describe("cause derivation", () => {
    it("derives cause from error field", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Connection refused",
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(openIncident).toHaveBeenCalledWith(
        db,
        monitor.id,
        "Connection refused",
        expect.any(Date),
      );
    });

    it("derives cause from statusCode when no error", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 2000,
        statusCode: 502,
      } as ProbeResult);

      await _checkMonitor(db, monitor);

      expect(openIncident).toHaveBeenCalledWith(
        db,
        monitor.id,
        "HTTP 502",
        expect.any(Date),
      );
    });
  });

  describe("error resilience", () => {
    it("email failure does not throw", async () => {
      const monitor = createMockMonitor({ consecutiveFailures: 2 });
      const db = createMockDb();

      (probeHttp as Mock).mockResolvedValue({
        status: 0,
        responseTimeMs: 10000,
        error: "Connection refused",
      } as ProbeResult);

      // Email send throws
      (sendAlertEmail as Mock).mockRejectedValue(new Error("SMTP error"));

      // _checkMonitor should not throw
      await expect(_checkMonitor(db, monitor)).resolves.not.toThrow();
    });
  });
});
