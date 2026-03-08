// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, op: "eq" }),
  and: (...conds: unknown[]) => ({ conds, op: "and" }),
}));

describe("incidents module", () => {
  // Mock database
  const mockInsert = vi.fn().mockReturnValue({ values: vi.fn() });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: vi.fn() });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });
  const mockSelectFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  });
  const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  });
  const mockSelectFields = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: mockInnerJoin,
    }),
  });

  const db = {
    insert: mockInsert,
    update: mockUpdate,
    select: (...args: unknown[]) => {
      if (args.length > 0) return mockSelectFields(...args);
      return mockSelect();
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
    mockInsert.mockReturnValue({ values: vi.fn() });
    mockUpdateSet.mockReturnValue({ where: vi.fn() });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockInnerJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });
    mockSelectFields.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: mockInnerJoin,
      }),
    });
  });

  it("openIncident inserts incident and sets monitor isUp to false", async () => {
    const { openIncident } = await import("../../worker/src/incidents");
    const now = new Date("2026-03-08T10:00:00Z");

    await openIncident(db, 1, "HTTP 502", now);

    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("resolveIncident updates incident to resolved and sets monitor isUp to true", async () => {
    const { resolveIncident } = await import("../../worker/src/incidents");
    const now = new Date("2026-03-08T10:30:00Z");

    await resolveIncident(db, 42, 1, now);

    // Should call update twice: once for incident, once for monitor
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("getOngoingIncident returns null when no ongoing incident exists", async () => {
    const { getOngoingIncident } = await import("../../worker/src/incidents");

    const result = await getOngoingIncident(db, 1);

    expect(result).toBeNull();
  });

  it("getOngoingIncident returns the ongoing incident when one exists", async () => {
    const incident = { id: 42, monitorId: 1, status: "ongoing", startedAt: new Date() };
    mockSelectFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([incident]),
      }),
    });

    const { getOngoingIncident } = await import("../../worker/src/incidents");
    const result = await getOngoingIncident(db, 1);

    expect(result).toEqual(incident);
  });

  it("getUserEmailForMonitor returns email when user found", async () => {
    mockInnerJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ email: "user@example.com" }]),
      }),
    });

    const { getUserEmailForMonitor } = await import("../../worker/src/incidents");
    const result = await getUserEmailForMonitor(db, 1);

    expect(result).toBe("user@example.com");
  });

  it("getUserEmailForMonitor returns null when no user found", async () => {
    mockInnerJoin.mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    });

    const { getUserEmailForMonitor } = await import("../../worker/src/incidents");
    const result = await getUserEmailForMonitor(db, 1);

    expect(result).toBeNull();
  });
});
