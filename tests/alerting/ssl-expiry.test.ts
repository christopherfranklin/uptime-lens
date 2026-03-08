// @vitest-environment node
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Mock email send
vi.mock("../../worker/src/emails/send", () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock email templates
vi.mock("../../worker/src/emails/templates", () => ({
  sslExpiryEmailHtml: vi.fn().mockReturnValue("<html>ssl-expiry</html>"),
}));

// Mock incidents module (for getUserEmailForMonitor)
vi.mock("../../worker/src/incidents", () => ({
  getUserEmailForMonitor: vi.fn().mockResolvedValue("user@example.com"),
}));

import { sendAlertEmail } from "../../worker/src/emails/send";
import { sslExpiryEmailHtml } from "../../worker/src/emails/templates";
import { getUserEmailForMonitor } from "../../worker/src/incidents";
import { checkSslExpiry } from "../../worker/src/ssl-expiry";

function createMockDb() {
  const updateResult = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    update: vi.fn().mockReturnValue(updateResult),
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

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("SSL Expiry Alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserEmailForMonitor as Mock).mockResolvedValue("user@example.com");
    (sendAlertEmail as Mock).mockResolvedValue(undefined);
  });

  it("sends alert when crossing 30-day threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: null });
    const db = createMockDb();
    const sslExpiresAt = daysFromNow(25);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
      }),
    );
    expect(sslExpiryEmailHtml).toHaveBeenCalled();
    // Should update lastSslAlertDays to 30
    expect(db._updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSslAlertDays: 30 }),
    );
  });

  it("sends alert when crossing 14-day threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 30 });
    const db = createMockDb();
    const sslExpiresAt = daysFromNow(10);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).toHaveBeenCalled();
    expect(db._updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSslAlertDays: 14 }),
    );
  });

  it("sends alert when crossing 7-day threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 14 });
    const db = createMockDb();
    const sslExpiresAt = daysFromNow(5);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).toHaveBeenCalled();
    expect(db._updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSslAlertDays: 7 }),
    );
  });

  it("sends alert when crossing 1-day threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 7 });
    const db = createMockDb();
    const sslExpiresAt = daysFromNow(0.5);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).toHaveBeenCalled();
    expect(db._updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSslAlertDays: 1 }),
    );
  });

  it("does not re-send for same threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 14 });
    const db = createMockDb();
    // 12 days remaining -- still within the 14-day threshold, already alerted
    const sslExpiresAt = daysFromNow(12);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).not.toHaveBeenCalled();
  });

  it("does not send when not within any threshold", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: null });
    const db = createMockDb();
    const sslExpiresAt = daysFromNow(45);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).not.toHaveBeenCalled();
  });

  it("resets tracking on cert renewal", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 7 });
    const db = createMockDb();
    // Certificate renewed -- 60 days from now, beyond all thresholds
    const sslExpiresAt = daysFromNow(60);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    // Should not send alert (not within any threshold)
    expect(sendAlertEmail).not.toHaveBeenCalled();
    // Should reset lastSslAlertDays to null
    expect(db._updateResult.set).toHaveBeenCalledWith(
      expect.objectContaining({ lastSslAlertDays: null }),
    );
  });

  it("handles expired cert", async () => {
    const monitor = createMockMonitor({ lastSslAlertDays: 1 });
    const db = createMockDb();
    // SSL already expired (in the past)
    const sslExpiresAt = daysFromNow(-2);

    await checkSslExpiry(db, monitor, sslExpiresAt);

    expect(sendAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("SSL Expired"),
      }),
    );
  });
});
