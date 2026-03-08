// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the email send module
const mockSendAlertEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../../worker/src/emails/send", () => ({
  sendAlertEmail: (...args: unknown[]) => mockSendAlertEmail(...args),
}));

// Mock the template module
const mockWeeklyDigestEmailHtml = vi.fn().mockReturnValue("<html>digest</html>");
const mockFormatDuration = vi.fn().mockReturnValue("2h 30m");
vi.mock("../../worker/src/emails/templates", () => ({
  weeklyDigestEmailHtml: (...args: unknown[]) => mockWeeklyDigestEmailHtml(...args),
  formatDuration: (...args: unknown[]) => mockFormatDuration(...args),
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, op: "eq" }),
  and: (...conds: unknown[]) => ({ conds, op: "and" }),
  gte: (col: unknown, val: unknown) => ({ col, val, op: "gte" }),
  inArray: (col: unknown, vals: unknown[]) => ({ col, vals, op: "inArray" }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    op: "sql",
  }),
}));

// Helper: create a mock database with chainable methods
function createMockDb() {
  const mockWhere = vi.fn();
  const mockGroupBy = vi.fn();
  const mockLimit = vi.fn();
  const mockInnerJoin = vi.fn();
  const mockFrom = vi.fn();
  const mockUpdateSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockSelectDistinct = vi.fn();

  // Default: selectDistinct returns empty
  mockSelectDistinct.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockResolvedValue([]),
    }),
  });

  // Default: select().from().where() returns empty
  mockFrom.mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
    innerJoin: vi.fn().mockResolvedValue([]),
  });

  // Default: update().set().where() resolves
  mockUpdateSet.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mockUpdate.mockReturnValue({
    set: mockUpdateSet,
  });

  const db = {
    selectDistinct: mockSelectDistinct,
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    update: mockUpdate,
    _mockFrom: mockFrom,
    _mockWhere: mockWhere,
    _mockGroupBy: mockGroupBy,
    _mockUpdateSet: mockUpdateSet,
    _mockSelectDistinct: mockSelectDistinct,
  } as any;

  return db;
}

describe("Weekly Digest - maybeProcessWeeklyDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // -- Scheduling tests --

  it("skips when not Monday", async () => {
    // Tuesday, March 10, 2026 at 10am UTC
    vi.setSystemTime(new Date("2026-03-10T10:00:00Z"));

    const db = createMockDb();
    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("skips when Monday but before 9am UTC", async () => {
    // Monday, March 9, 2026 at 7am UTC
    vi.setSystemTime(new Date("2026-03-09T07:00:00Z"));

    const db = createMockDb();
    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("processes when Monday after 9am UTC", async () => {
    // Monday, March 9, 2026 at 10am UTC
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    // Setup: user with monitors
    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "test@example.com", lastDigestSentAt: null },
        ]),
      }),
    });

    // select().from().where() for user's monitors
    const mockMonitorWhere = vi.fn().mockResolvedValue([
      { id: 1, name: "API Monitor" },
    ]);
    const mockUptimeWhere = vi.fn().mockReturnValue({
      groupBy: vi.fn().mockResolvedValue([
        { monitorId: 1, totalChecks: 100, successfulChecks: 99 },
      ]),
    });
    const mockIncidentWhere = vi.fn().mockResolvedValue([]);

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // monitors query
          return { where: mockMonitorWhere };
        }
        if (selectCallCount === 2) {
          // uptimeData query
          return { where: mockUptimeWhere };
        }
        // incidents query
        return { where: mockIncidentWhere };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1);
    expect(mockSendAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Uptime Lens: Weekly Digest",
      }),
    );
  });

  it("skips when already sent this week", async () => {
    // Monday, March 9, 2026 at 10am UTC
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    // User already received digest this Monday at 9:05am
    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          {
            id: "user-1",
            email: "test@example.com",
            lastDigestSentAt: new Date("2026-03-09T09:05:00Z"),
          },
        ]),
      }),
    });

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("sends on next Monday after previous week's send", async () => {
    // Monday, March 16, 2026 at 10am UTC (next Monday)
    vi.setSystemTime(new Date("2026-03-16T10:00:00Z"));

    const db = createMockDb();

    // User last received digest last Monday
    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          {
            id: "user-1",
            email: "test@example.com",
            lastDigestSentAt: new Date("2026-03-09T10:00:00Z"),
          },
        ]),
      }),
    });

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1)
          return { where: vi.fn().mockResolvedValue([{ id: 1, name: "My Site" }]) };
        if (selectCallCount === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          };
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1);
  });

  // -- Content tests --

  it("includes uptime percentages from heartbeats_daily", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "test@example.com", lastDigestSentAt: null },
        ]),
      }),
    });

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1)
          return {
            where: vi.fn().mockResolvedValue([
              { id: 1, name: "API" },
              { id: 2, name: "Web" },
            ]),
          };
        if (selectCallCount === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { monitorId: 1, totalChecks: 1000, successfulChecks: 995 },
                { monitorId: 2, totalChecks: 500, successfulChecks: 500 },
              ]),
            }),
          };
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockWeeklyDigestEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        monitors: expect.arrayContaining([
          { name: "API", uptimePercentage: 99.5 },
          { name: "Web", uptimePercentage: 100 },
        ]),
      }),
    );
  });

  it("includes past week incidents", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "test@example.com", lastDigestSentAt: null },
        ]),
      }),
    });

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1)
          return {
            where: vi.fn().mockResolvedValue([{ id: 1, name: "API" }]),
          };
        if (selectCallCount === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          };
        // incidents
        return {
          where: vi.fn().mockResolvedValue([
            {
              monitorId: 1,
              startedAt: new Date("2026-03-05T10:00:00Z"),
              resolvedAt: new Date("2026-03-05T12:30:00Z"),
              cause: "HTTP 502",
            },
          ]),
        };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockWeeklyDigestEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        incidents: expect.arrayContaining([
          expect.objectContaining({
            monitorName: "API",
            cause: "HTTP 502",
          }),
        ]),
      }),
    );
    // formatDuration should have been called for resolved incident
    expect(mockFormatDuration).toHaveBeenCalled();
  });

  it("skips user with zero monitors", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    // selectDistinct returns empty -- no users with monitors
    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([]),
      }),
    });

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).not.toHaveBeenCalled();
  });

  it("sends to user with 100% uptime (no incidents)", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "test@example.com", lastDigestSentAt: null },
        ]),
      }),
    });

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1)
          return {
            where: vi.fn().mockResolvedValue([{ id: 1, name: "My Site" }]),
          };
        if (selectCallCount === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([
                { monitorId: 1, totalChecks: 500, successfulChecks: 500 },
              ]),
            }),
          };
        // No incidents
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(mockSendAlertEmail).toHaveBeenCalledTimes(1);
    expect(mockWeeklyDigestEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        monitors: [{ name: "My Site", uptimePercentage: 100 }],
        incidents: [],
      }),
    );
  });

  // -- Resilience tests --

  it("updates lastDigestSentAt after sending", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "test@example.com", lastDigestSentAt: null },
        ]),
      }),
    });

    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1)
          return {
            where: vi.fn().mockResolvedValue([{ id: 1, name: "My Site" }]),
          };
        if (selectCallCount === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          };
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    expect(db.update).toHaveBeenCalled();
  });

  it("continues to next user if one email fails", async () => {
    vi.setSystemTime(new Date("2026-03-09T10:00:00Z"));

    const db = createMockDb();

    db.selectDistinct.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockResolvedValue([
          { id: "user-1", email: "fail@example.com", lastDigestSentAt: null },
          {
            id: "user-2",
            email: "success@example.com",
            lastDigestSentAt: null,
          },
        ]),
      }),
    });

    // Both users have monitors -- need to handle 2 full cycles (3 selects each = 6 total)
    let selectCallCount = 0;
    db.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        selectCallCount++;
        const userCycle = Math.ceil(selectCallCount / 3);
        const queryInCycle = ((selectCallCount - 1) % 3) + 1;

        if (queryInCycle === 1)
          return {
            where: vi.fn().mockResolvedValue([{ id: 1, name: "My Site" }]),
          };
        if (queryInCycle === 2)
          return {
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockResolvedValue([]),
            }),
          };
        return { where: vi.fn().mockResolvedValue([]) };
      }),
    }));

    // First call throws, second succeeds
    mockSendAlertEmail
      .mockRejectedValueOnce(new Error("SMTP failure"))
      .mockResolvedValueOnce(undefined);

    const { maybeProcessWeeklyDigest } = await import(
      "../../worker/src/digest"
    );

    await maybeProcessWeeklyDigest(db);

    // Should have attempted to send to both users
    expect(mockSendAlertEmail).toHaveBeenCalledTimes(2);
    // Second user should have received their email (update called for second user)
    expect(db.update).toHaveBeenCalled();
  });
});
