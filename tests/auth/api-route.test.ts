import { describe, expect, test, vi } from "vitest";

const mockHandler = vi.fn();
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: { handler: mockHandler },
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: vi.fn().mockReturnValue({ GET: mockGet, POST: mockPost }),
  nextCookies: vi.fn().mockReturnValue({ id: "next-cookies" }),
}));

describe("Auth API Route", () => {
  test("route module exports GET handler", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    expect(route.GET).toBeDefined();
    expect(typeof route.GET).toBe("function");
  });

  test("route module exports POST handler", async () => {
    const route = await import("@/app/api/auth/[...all]/route");
    expect(route.POST).toBeDefined();
    expect(typeof route.POST).toBe("function");
  });
});
