import {
  pgTable,
  pgEnum,
  integer,
  text,
  varchar,
  timestamp,
  real,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---- Enums ----

export const monitorTypeEnum = pgEnum("monitor_type", ["http", "tcp", "ssl"]);

export const monitorStatusEnum = pgEnum("monitor_status", [
  "active",
  "paused",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "ongoing",
  "resolved",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

// ---- Tables ----

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const monitors = pgTable(
  "monitors",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    url: text().notNull(),
    type: monitorTypeEnum().notNull().default("http"),
    status: monitorStatusEnum().notNull().default("active"),
    expectedStatusCode: integer("expected_status_code").default(200),
    checkIntervalSeconds: integer("check_interval_seconds")
      .notNull()
      .default(180),
    timeoutMs: integer("timeout_ms").notNull().default(10000),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("monitors_user_id_idx").on(table.userId),
    index("monitors_status_idx").on(table.status),
  ],
);

export const heartbeats = pgTable(
  "heartbeats",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    status: integer().notNull(),
    responseTimeMs: real("response_time_ms"),
    statusCode: integer("status_code"),
    error: text(),
    sslExpiresAt: timestamp("ssl_expires_at", { withTimezone: true }),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("heartbeats_monitor_checked_idx").on(
      table.monitorId,
      table.checkedAt,
    ),
    index("heartbeats_checked_at_idx").on(table.checkedAt),
  ],
);

export const heartbeatsHourly = pgTable(
  "heartbeats_hourly",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    hour: timestamp({ withTimezone: true }).notNull(),
    totalChecks: integer("total_checks").notNull().default(0),
    successfulChecks: integer("successful_checks").notNull().default(0),
    avgResponseTimeMs: real("avg_response_time_ms"),
    minResponseTimeMs: real("min_response_time_ms"),
    maxResponseTimeMs: real("max_response_time_ms"),
  },
  (table) => [
    uniqueIndex("heartbeats_hourly_monitor_hour_idx").on(
      table.monitorId,
      table.hour,
    ),
  ],
);

export const heartbeatsDaily = pgTable(
  "heartbeats_daily",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    date: timestamp({ withTimezone: true }).notNull(),
    totalChecks: integer("total_checks").notNull().default(0),
    successfulChecks: integer("successful_checks").notNull().default(0),
    avgResponseTimeMs: real("avg_response_time_ms"),
    minResponseTimeMs: real("min_response_time_ms"),
    maxResponseTimeMs: real("max_response_time_ms"),
    uptimePercentage: real("uptime_percentage"),
  },
  (table) => [
    uniqueIndex("heartbeats_daily_monitor_date_idx").on(
      table.monitorId,
      table.date,
    ),
  ],
);

export const incidents = pgTable(
  "incidents",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    status: incidentStatusEnum().notNull().default("ongoing"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    cause: text(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (table) => [
    index("incidents_monitor_id_idx").on(table.monitorId),
    index("incidents_status_idx").on(table.status),
    index("incidents_started_at_idx").on(table.startedAt),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    status: subscriptionStatusEnum().notNull().default("trialing"),
    planMonitorLimit: integer("plan_monitor_limit").notNull().default(10),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    uniqueIndex("subscriptions_stripe_customer_id_idx").on(
      table.stripeCustomerId,
    ),
    uniqueIndex("subscriptions_stripe_subscription_id_idx").on(
      table.stripeSubscriptionId,
    ),
  ],
);
