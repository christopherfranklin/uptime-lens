import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the RESEND_API_KEY environment variable before importing modules
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test_fake_key_for_testing");
});

describe("Resend client", () => {
  it("exports a Resend instance", async () => {
    const { resend } = await import("@/lib/email/resend");
    expect(resend).toBeDefined();
    expect(resend).toHaveProperty("emails");
    expect(resend.emails).toHaveProperty("send");
  });
});

describe("Email test API route", () => {
  it("exports a POST handler function", async () => {
    const route = await import("@/app/api/email/test/route");
    expect(route.POST).toBeDefined();
    expect(typeof route.POST).toBe("function");
  });
});
