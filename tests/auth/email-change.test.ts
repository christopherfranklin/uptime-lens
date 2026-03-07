import { beforeEach, describe, expect, test, vi } from "vitest";

let mockBetterAuth: ReturnType<typeof vi.fn>;
let mockResendSend: ReturnType<typeof vi.fn>;
let mockEmailChangeEmail: ReturnType<typeof vi.fn>;

vi.mock("better-auth", () => ({
  betterAuth: (...args: unknown[]) => mockBetterAuth(...args),
}));

vi.mock("better-auth/plugins", () => ({
  magicLink: vi.fn().mockReturnValue({ id: "magic-link" }),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn().mockReturnValue({ id: "next-cookies" }),
  toNextJsHandler: vi.fn(),
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/email/resend", () => ({
  resend: {
    emails: {
      get send() {
        return mockResendSend;
      },
    },
  },
}));

vi.mock("@/lib/email/templates/magic-link", () => ({
  default: vi.fn().mockReturnValue("magic-link-email"),
}));

vi.mock("@/lib/email/templates/email-change", () => ({
  default: (...args: unknown[]) => mockEmailChangeEmail(...args),
}));

describe("Email Change", () => {
  beforeEach(() => {
    mockBetterAuth = vi.fn().mockReturnValue({ handler: vi.fn() });
    mockResendSend = vi.fn().mockResolvedValue({ id: "mock-id" });
    mockEmailChangeEmail = vi.fn().mockReturnValue("email-change-email");
    vi.resetModules();
  });

  test("auth config has user.changeEmail.enabled set to true", async () => {
    await import("@/lib/auth");
    const config = mockBetterAuth.mock.calls[0][0];
    expect(config.user.changeEmail.enabled).toBe(true);
  });

  test("email change verification uses EmailChangeEmail template", async () => {
    await import("@/lib/auth");
    const config = mockBetterAuth.mock.calls[0][0];

    // Call the sendVerificationEmail callback
    await config.emailVerification.sendVerificationEmail({
      user: { email: "new@example.com" },
      url: "https://example.com/verify",
      token: "test-token",
    });

    expect(mockEmailChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com/verify" }),
    );
  });

  test("verification email uses fire-and-forget send pattern", async () => {
    await import("@/lib/auth");
    const config = mockBetterAuth.mock.calls[0][0];

    // The callback should use void (fire-and-forget) pattern
    await config.emailVerification.sendVerificationEmail({
      user: { email: "new@example.com" },
      url: "https://example.com/verify",
      token: "test-token",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("Uptime Lens"),
        to: "new@example.com",
        subject: "Verify your new email for Uptime Lens",
      }),
    );
  });
});
