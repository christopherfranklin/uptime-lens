import { beforeEach, describe, expect, test, vi } from "vitest";

const mockSignOut = vi.fn();
const mockRedirect = vi.fn();
const mockHeaders = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      get signOut() {
        return mockSignOut;
      },
    },
  },
}));

vi.mock("next/headers", () => ({
  get headers() {
    return mockHeaders;
  },
}));

vi.mock("next/navigation", () => ({
  get redirect() {
    return mockRedirect;
  },
}));

describe("Logout Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const fakeHeaders = new Headers({ cookie: "session=abc" });
    mockHeaders.mockResolvedValue(fakeHeaders);
    mockSignOut.mockResolvedValue(undefined);
  });

  test("logout function is exported from auth actions", async () => {
    const mod = await import("@/app/actions/auth");
    expect(typeof mod.logout).toBe("function");
  });

  test("logout calls auth.api.signOut with request headers", async () => {
    const fakeHeaders = new Headers({ cookie: "session=abc" });
    mockHeaders.mockResolvedValue(fakeHeaders);

    const { logout } = await import("@/app/actions/auth");
    await logout().catch(() => {});

    expect(mockSignOut).toHaveBeenCalledWith({
      headers: fakeHeaders,
    });
  });

  test("logout redirects to / after sign out", async () => {
    const { logout } = await import("@/app/actions/auth");
    await logout().catch(() => {});

    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
