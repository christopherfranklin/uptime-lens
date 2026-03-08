import { and, eq, gte, sql } from "drizzle-orm";
import { db, heartbeatsDaily, heartbeatsHourly } from "@/lib/db";

interface UptimeResult {
  range: string;
  percentage: number;
}

export async function getUptimeForAllRanges(
  monitorId: number,
): Promise<UptimeResult[]> {
  const now = new Date();
  const ranges = [
    { key: "24h", hours: 24 },
    { key: "7d", hours: 168 },
    { key: "30d", hours: 720 },
    { key: "90d", hours: 2160 },
  ];

  const results = await Promise.all(
    ranges.map(async ({ key, hours }) => {
      const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

      // Use hourly for 24h/7d, daily for 30d/90d
      const useDaily = hours > 168;

      if (useDaily) {
        const [row] = await db
          .select({
            total: sql<number>`COALESCE(SUM(${heartbeatsDaily.totalChecks}), 0)`,
            successful: sql<number>`COALESCE(SUM(${heartbeatsDaily.successfulChecks}), 0)`,
          })
          .from(heartbeatsDaily)
          .where(
            and(
              eq(heartbeatsDaily.monitorId, monitorId),
              gte(heartbeatsDaily.date, since),
            ),
          );

        const percentage =
          row && row.total > 0
            ? Math.round((row.successful / row.total) * 10000) / 100
            : 100;

        return { range: key, percentage };
      }

      const [row] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${heartbeatsHourly.totalChecks}), 0)`,
          successful: sql<number>`COALESCE(SUM(${heartbeatsHourly.successfulChecks}), 0)`,
        })
        .from(heartbeatsHourly)
        .where(
          and(
            eq(heartbeatsHourly.monitorId, monitorId),
            gte(heartbeatsHourly.hour, since),
          ),
        );

      const percentage =
        row && row.total > 0
          ? Math.round((row.successful / row.total) * 10000) / 100
          : 100;

      return { range: key, percentage };
    }),
  );

  return results;
}
