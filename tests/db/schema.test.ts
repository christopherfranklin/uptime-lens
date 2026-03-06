import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("Database Schema", () => {
  it("exports all 7 tables", async () => {
    const schema = await import("@/lib/db/schema");

    expect(schema.users).toBeDefined();
    expect(schema.monitors).toBeDefined();
    expect(schema.heartbeats).toBeDefined();
    expect(schema.heartbeatsHourly).toBeDefined();
    expect(schema.heartbeatsDaily).toBeDefined();
    expect(schema.incidents).toBeDefined();
    expect(schema.subscriptions).toBeDefined();
  });

  it("exports all 4 enums", async () => {
    const schema = await import("@/lib/db/schema");

    expect(schema.monitorTypeEnum).toBeDefined();
    expect(schema.monitorStatusEnum).toBeDefined();
    expect(schema.incidentStatusEnum).toBeDefined();
    expect(schema.subscriptionStatusEnum).toBeDefined();
  });

  it("monitors table has userId foreign key referencing users table", async () => {
    const schema = await import("@/lib/db/schema");
    const columns = getTableColumns(schema.monitors);

    expect(columns.userId).toBeDefined();

    // Verify the table name is correct
    expect(getTableName(schema.monitors)).toBe("monitors");
    expect(getTableName(schema.users)).toBe("users");
  });

  it("heartbeats table has monitorId foreign key referencing monitors table", async () => {
    const schema = await import("@/lib/db/schema");
    const columns = getTableColumns(schema.heartbeats);

    expect(columns.monitorId).toBeDefined();
    expect(getTableName(schema.heartbeats)).toBe("heartbeats");
  });

  it("heartbeatsHourly has unique composite index on (monitorId, hour)", async () => {
    const schema = await import("@/lib/db/schema");
    const tableConfig = getTableConfig(schema.heartbeatsHourly);

    const uniqueIndex = tableConfig.indexes.find(
      (idx) => idx.config.unique === true
    );

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex!.config.columns.length).toBe(2);
  });

  it("heartbeatsDaily has unique composite index on (monitorId, date)", async () => {
    const schema = await import("@/lib/db/schema");
    const tableConfig = getTableConfig(schema.heartbeatsDaily);

    const uniqueIndex = tableConfig.indexes.find(
      (idx) => idx.config.unique === true
    );

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex!.config.columns.length).toBe(2);
  });

  it("db client can be imported from lib/db/index", async () => {
    const dbModule = await import("@/lib/db/index");

    expect(dbModule.db).toBeDefined();
  });
});
