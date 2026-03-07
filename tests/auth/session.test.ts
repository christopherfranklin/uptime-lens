import { beforeEach, describe, expect, test, vi } from "vitest";

let mockBetterAuth: ReturnType<typeof vi.fn>;
let mockDrizzleAdapter: ReturnType<typeof vi.fn>;

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
  drizzleAdapter: (...args: unknown[]) => mockDrizzleAdapter(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/email/resend", () => ({
  resend: { emails: { send: vi.fn() } },
}));

vi.mock("@/lib/email/templates/magic-link", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/email/templates/email-change", () => ({
  default: vi.fn(),
}));

describe("Session Configuration", () => {
  beforeEach(() => {
    mockBetterAuth = vi.fn().mockReturnValue({ handler: vi.fn() });
    mockDrizzleAdapter = vi.fn().mockReturnValue({});
    vi.resetModules();
  });

  test("session expiresIn is set to 30 days in seconds", async () => {
    await import("@/lib/auth");
    const config = mockBetterAuth.mock.calls[0][0];
    expect(config.session.expiresIn).toBe(2592000); // 60 * 60 * 24 * 30
  });

  test("session updateAge is set to 1 day in seconds for sliding window", async () => {
    await import("@/lib/auth");
    const config = mockBetterAuth.mock.calls[0][0];
    expect(config.session.updateAge).toBe(86400); // 60 * 60 * 24
  });

  test("Drizzle adapter uses pg provider with usePlural true", async () => {
    await import("@/lib/auth");
    expect(mockDrizzleAdapter).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        provider: "pg",
        usePlural: true,
      }),
    );
  });
});
