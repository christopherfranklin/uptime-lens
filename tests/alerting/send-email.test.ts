// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the resend module
const mockSend = vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe("sendAlertEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    // Reset the module cache to get fresh lazy-init state
    vi.resetModules();
  });

  it("sends email with correct from address and parameters", async () => {
    const { sendAlertEmail } = await import("../../worker/src/emails/send");

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
    const { sendAlertEmail } = await import("../../worker/src/emails/send");

    // Should not throw
    await expect(
      sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" }),
    ).resolves.not.toThrow();
  });

  it("does not throw on network failure", async () => {
    mockSend.mockRejectedValueOnce(new Error("Network error"));
    const { sendAlertEmail } = await import("../../worker/src/emails/send");

    await expect(
      sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" }),
    ).resolves.not.toThrow();
  });

  it("warns when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendAlertEmail } = await import("../../worker/src/emails/send");
    await sendAlertEmail({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("RESEND_API_KEY"),
    );
    consoleSpy.mockRestore();
  });
});
