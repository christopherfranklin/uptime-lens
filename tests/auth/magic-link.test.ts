import { beforeEach, describe, expect, test, vi } from "vitest";

let mockBetterAuth: ReturnType<typeof vi.fn>;
let mockMagicLink: ReturnType<typeof vi.fn>;
let mockResendSend: ReturnType<typeof vi.fn>;

vi.mock("better-auth", () => ({
  betterAuth: (...args: unknown[]) => mockBetterAuth(...args),
}));

vi.mock("better-auth/plugins", () => ({
  magicLink: (...args: unknown[]) => mockMagicLink(...args),
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
  default: vi.fn().mockReturnValue("email-change-email"),
}));

describe("Magic Link Auth Config", () => {
  beforeEach(() => {
    mockBetterAuth = vi.fn().mockReturnValue({ handler: vi.fn() });
    mockMagicLink = vi.fn().mockReturnValue({ id: "magic-link" });
    mockResendSend = vi.fn().mockResolvedValue({ id: "mock-id" });
    vi.resetModules();
  });

  test("auth exports a configured Better Auth instance", async () => {
    const { auth } = await import("@/lib/auth");
    expect(auth).toBeDefined();
    expect(mockBetterAuth).toHaveBeenCalledOnce();
  });

  test("magic link plugin is included in auth config", async () => {
    await import("@/lib/auth");
    expect(mockMagicLink).toHaveBeenCalledOnce();
    const betterAuthConfig = mockBetterAuth.mock.calls[0][0];
    expect(betterAuthConfig.plugins).toBeDefined();
    expect(betterAuthConfig.plugins.length).toBeGreaterThanOrEqual(2);
  });

  test("magic link expiry is set to 600 seconds (10 minutes)", async () => {
    await import("@/lib/auth");
    const magicLinkConfig = mockMagicLink.mock.calls[0][0];
    expect(magicLinkConfig.expiresIn).toBe(600);
  });

  test("sendMagicLink callback calls resend.emails.send without await", async () => {
    await import("@/lib/auth");
    const magicLinkConfig = mockMagicLink.mock.calls[0][0];
    expect(magicLinkConfig.sendMagicLink).toBeDefined();

    // Call the sendMagicLink callback
    await magicLinkConfig.sendMagicLink({
      email: "test@example.com",
      url: "https://example.com/verify",
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("Uptime Lens"),
        to: "test@example.com",
        subject: "Sign in to Uptime Lens",
      }),
    );
  });
});
