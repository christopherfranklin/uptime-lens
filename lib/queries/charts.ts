import { and, asc, eq, gte } from "drizzle-orm";
import { db, heartbeats, heartbeatsDaily, heartbeatsHourly } from "@/lib/db";
import { getRangeSince } from "@/lib/utils";

export async function getChartData(
  monitorId: number,
  range: string,
): Promise<{ time: number; responseTime: number | null }[]> {
  const since = getRangeSince(range);

  switch (range) {
    case "24h": {
      const rows = await db
        .select({
          time: heartbeats.checkedAt,
          responseTime: heartbeats.responseTimeMs,
        })
        .from(heartbeats)
        .where(
          and(
            eq(heartbeats.monitorId, monitorId),
            gte(heartbeats.checkedAt, since),
          ),
        )
        .orderBy(asc(heartbeats.checkedAt));

      return rows.map((r) => ({
        time: r.time.getTime(),
        responseTime: r.responseTime,
      }));
    }

    case "7d": {
      const rows = await db
        .select({
          time: heartbeatsHourly.hour,
          responseTime: heartbeatsHourly.avgResponseTimeMs,
        })
        .from(heartbeatsHourly)
        .where(
          and(
            eq(heartbeatsHourly.monitorId, monitorId),
            gte(heartbeatsHourly.hour, since),
          ),
        )
        .orderBy(asc(heartbeatsHourly.hour));

      return rows.map((r) => ({
        time: r.time.getTime(),
        responseTime: r.responseTime,
      }));
    }

    case "30d":
    case "90d":
    default: {
      const rows = await db
        .select({
          time: heartbeatsDaily.date,
          responseTime: heartbeatsDaily.avgResponseTimeMs,
        })
        .from(heartbeatsDaily)
        .where(
          and(
            eq(heartbeatsDaily.monitorId, monitorId),
            gte(heartbeatsDaily.date, since),
          ),
        )
        .orderBy(asc(heartbeatsDaily.date));

      return rows.map((r) => ({
        time: r.time.getTime(),
        responseTime: r.responseTime,
      }));
    }
  }
}
