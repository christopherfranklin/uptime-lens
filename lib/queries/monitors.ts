import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, heartbeats, heartbeatsHourly, monitors } from "@/lib/db";

export async function getMonitorsWithStats(userId: string) {
  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, userId))
    .orderBy(desc(monitors.createdAt));

  const enhanced = await Promise.all(
    userMonitors.map(async (monitor) => {
      const [latestHeartbeat] = await db
        .select({ responseTimeMs: heartbeats.responseTimeMs })
        .from(heartbeats)
        .where(eq(heartbeats.monitorId, monitor.id))
        .orderBy(desc(heartbeats.checkedAt))
        .limit(1);

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [uptimeRow] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${heartbeatsHourly.totalChecks}), 0)`,
          successful: sql<number>`COALESCE(SUM(${heartbeatsHourly.successfulChecks}), 0)`,
        })
        .from(heartbeatsHourly)
        .where(
          and(
            eq(heartbeatsHourly.monitorId, monitor.id),
            gte(heartbeatsHourly.hour, since24h),
          ),
        );

      const uptime24h =
        uptimeRow && uptimeRow.total > 0
          ? Math.round((uptimeRow.successful / uptimeRow.total) * 10000) / 100
          : 100;

      return {
        ...monitor,
        latestResponseTimeMs: latestHeartbeat?.responseTimeMs ?? null,
        uptime24h,
      };
    }),
  );

  return enhanced;
}

export async function getMonitorById(monitorId: number, userId: string) {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.userId, userId)));

  return monitor ?? null;
}
