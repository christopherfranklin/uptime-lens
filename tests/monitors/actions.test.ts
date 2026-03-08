import { beforeEach, describe, expect, test, vi } from "vitest";

// Delegate pattern for mocks (Phase 2 convention)
let mockVerifySession: ReturnType<typeof vi.fn>;
let mockInsert: ReturnType<typeof vi.fn>;
let mockUpdate: ReturnType<typeof vi.fn>;
let mockDelete: ReturnType<typeof vi.fn>;
let mockSelect: ReturnType<typeof vi.fn>;
let mockRevalidatePath: ReturnType<typeof vi.fn>;

vi.mock("@/lib/dal", () => ({
  verifySession: (...args: unknown[]) => mockVerifySession(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/db", () => {
  const createChain = (result: unknown) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(result) });
    chain.set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(result) });
    chain.where = vi.fn().mockResolvedValue(result);
    chain.from = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
        limit: vi.fn().mockResolvedValue(result),
      }),
    });
    return chain;
  };

  return {
    db: {
      insert: (...args: unknown[]) => mockInsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      select: (...args: unknown[]) => mockSelect(...args),
    },
    monitors: { id: "id", userId: "userId", status: "status" },
  };
});

// Helper to create FormData
function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("Monitor CRUD Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockVerifySession = vi.fn().mockResolvedValue({
      user: { id: "test-user-id" },
    });
    mockRevalidatePath = vi.fn();

    // Default chainable mock setup
    const returningFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockInsert = vi.fn().mockReturnValue({ values: valuesFn });

    const updateWhereFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    const setFn = vi.fn().mockReturnValue({ where: updateWhereFn });
    mockUpdate = vi.fn().mockReturnValue({ set: setFn });

    const deleteWhereFn = vi.fn().mockResolvedValue([{ id: 1 }]);
    mockDelete = vi.fn().mockReturnValue({ where: deleteWhereFn });

    // Select for ownership check: returns owned monitor by default
    const limitFn = vi.fn().mockResolvedValue([
      { id: 1, userId: "test-user-id", status: "active" },
    ]);
    const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn });
    mockSelect = vi.fn().mockReturnValue({ from: fromFn });
  });

  // ---- createMonitor ----

  describe("createMonitor", () => {
    test("valid HTTP input returns success with monitorId", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "My Website",
        url: "https://example.com",
        type: "http",
      });
      const result = await createMonitor(fd);
      expect(result).toEqual({ success: true, monitorId: 1 });
      expect(mockInsert).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    test("valid TCP input returns success", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "My Database",
        url: "db.example.com:5432",
        type: "tcp",
      });
      const result = await createMonitor(fd);
      expect(result).toEqual({ success: true, monitorId: 1 });
    });

    test("valid SSL input returns success", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "SSL Check",
        url: "https://secure.example.com",
        type: "ssl",
      });
      const result = await createMonitor(fd);
      expect(result).toEqual({ success: true, monitorId: 1 });
    });

    test("missing name returns error", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ url: "https://example.com", type: "http" });
      const result = await createMonitor(fd);
      expect(result).toEqual({ error: "Name is required" });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test("missing url returns error", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ name: "Test", type: "http" });
      const result = await createMonitor(fd);
      expect(result).toEqual({ error: "URL is required" });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test("invalid type returns error", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "Test",
        url: "https://example.com",
        type: "invalid",
      });
      const result = await createMonitor(fd);
      expect(result).toHaveProperty("error");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test("invalid HTTP URL returns error", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "Test",
        url: "not-a-valid-url",
        type: "http",
      });
      const result = await createMonitor(fd);
      expect(result).toHaveProperty("error");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test("TCP with invalid port returns error", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "Test",
        url: "db.example.com:99999",
        type: "tcp",
      });
      const result = await createMonitor(fd);
      expect(result).toHaveProperty("error");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    test("calls verifySession for auth", async () => {
      const { createMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        name: "Test",
        url: "https://example.com",
        type: "http",
      });
      await createMonitor(fd);
      expect(mockVerifySession).toHaveBeenCalled();
    });
  });

  // ---- updateMonitor ----

  describe("updateMonitor", () => {
    test("updates allowed fields for owned monitor", async () => {
      const { updateMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        id: "1",
        name: "Updated Name",
        expectedStatusCode: "201",
        checkIntervalSeconds: "300",
        timeoutMs: "5000",
      });
      const result = await updateMonitor(fd);
      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    test("rejects update when monitor not owned by user", async () => {
      // Override select to return empty (no owned monitor found)
      const limitFn = vi.fn().mockResolvedValue([]);
      const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn });
      mockSelect = vi.fn().mockReturnValue({ from: fromFn });

      const { updateMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "999", name: "Hacked" });
      const result = await updateMonitor(fd);
      expect(result).toEqual({ error: "Monitor not found" });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    test("does NOT update type or url fields", async () => {
      const { updateMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({
        id: "1",
        name: "Updated",
        type: "tcp",
        url: "https://hacked.com",
      });
      const result = await updateMonitor(fd);
      expect(result).toEqual({ success: true });
      // The set() call should not include type or url
      const setCall = mockUpdate.mock.results[0]?.value.set;
      if (setCall?.mock?.calls?.[0]) {
        const updateData = setCall.mock.calls[0][0];
        expect(updateData).not.toHaveProperty("type");
        expect(updateData).not.toHaveProperty("url");
      }
    });

    test("calls verifySession for auth", async () => {
      const { updateMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1", name: "Test" });
      await updateMonitor(fd);
      expect(mockVerifySession).toHaveBeenCalled();
    });
  });

  // ---- deleteMonitor ----

  describe("deleteMonitor", () => {
    test("deletes owned monitor and returns success", async () => {
      const { deleteMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1" });
      const result = await deleteMonitor(fd);
      expect(result).toEqual({ success: true });
      expect(mockDelete).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    test("rejects deletion of non-owned monitor", async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn });
      mockSelect = vi.fn().mockReturnValue({ from: fromFn });

      const { deleteMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "999" });
      const result = await deleteMonitor(fd);
      expect(result).toEqual({ error: "Monitor not found" });
      expect(mockDelete).not.toHaveBeenCalled();
    });

    test("calls verifySession for auth", async () => {
      const { deleteMonitor } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1" });
      await deleteMonitor(fd);
      expect(mockVerifySession).toHaveBeenCalled();
    });
  });

  // ---- toggleMonitorStatus ----

  describe("toggleMonitorStatus", () => {
    test("toggles active to paused", async () => {
      const { toggleMonitorStatus } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1" });
      const result = await toggleMonitorStatus(fd);
      expect(result).toEqual({ success: true, newStatus: "paused" });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    test("toggles paused to active", async () => {
      // Override select to return paused monitor
      const limitFn = vi.fn().mockResolvedValue([
        { id: 1, userId: "test-user-id", status: "paused" },
      ]);
      const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn });
      mockSelect = vi.fn().mockReturnValue({ from: fromFn });

      const { toggleMonitorStatus } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1" });
      const result = await toggleMonitorStatus(fd);
      expect(result).toEqual({ success: true, newStatus: "active" });
    });

    test("rejects toggle on non-owned monitor", async () => {
      const limitFn = vi.fn().mockResolvedValue([]);
      const selectWhereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: selectWhereFn });
      mockSelect = vi.fn().mockReturnValue({ from: fromFn });

      const { toggleMonitorStatus } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "999" });
      const result = await toggleMonitorStatus(fd);
      expect(result).toEqual({ error: "Monitor not found" });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    test("calls verifySession for auth", async () => {
      const { toggleMonitorStatus } = await import("@/app/actions/monitors");
      const fd = makeFormData({ id: "1" });
      await toggleMonitorStatus(fd);
      expect(mockVerifySession).toHaveBeenCalled();
    });
  });
});
