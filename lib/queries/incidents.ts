import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { db, incidents } from "@/lib/db";
import { getRangeSince } from "@/lib/utils";

export async function getIncidentsForMonitor(
  monitorId: number,
  range: string,
  limit: number,
  offset: number,
) {
  const since = getRangeSince(range);

  const rows = await db
    .select()
    .from(incidents)
    .where(
      and(
        eq(incidents.monitorId, monitorId),
        or(
          gte(incidents.startedAt, since),
          eq(incidents.status, "ongoing"),
        ),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${incidents.status} = 'ongoing' THEN 0 ELSE 1 END`,
      desc(incidents.startedAt),
    )
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return { items, hasMore };
}
