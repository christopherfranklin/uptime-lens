// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Delegate mock -- stable reference
const mockSend = vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null });

vi.mock("resend", () => {
  // Must use `function` (not arrow) for constructor mocks in Vitest 4+
  function MockResend() {
    return { emails: { send: (...args: unknown[]) => mockSend(...args) } };
  }
  return { Resend: MockResend };
});

import { sendAlertEmail, _resetClient } from "../../worker/src/emails/send";

describe("sendAlertEmail", () => {
  beforeEach(() => {
    mockSend.mockClear();
    mockSend.mockResolvedValue({ data: { id: "test-id" }, error: null });
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    _resetClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends email with correct from address and parameters", async () => {
    await sendAlertEmail({
      to: "user@example.com",
      subject: "Monitor Down",
      html: "<p>Test</p>",
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: "Uptime Lens <alerts@uptimelens.io>",
      to: "user@example.com",
      subject: "Monitor Down",
      html: "<p>Test</p>",
    });
  });

  it("does not throw on email send error", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "Rate limited" } });

    await expect(
      sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" }),
    ).resolves.not.toThrow();
  });

  it("does not throw on network failure", async () => {
    mockSend.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" }),
    ).resolves.not.toThrow();
  });

  it("warns when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    _resetClient();
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY"),
    );
    consoleSpy.mockRestore();
  });
});
