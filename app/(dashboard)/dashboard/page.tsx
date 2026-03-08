import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { verifySession } from "@/lib/dal";
import { db, monitors } from "@/lib/db";
import { MonitorList } from "@/components/monitors/monitor-list";

export const metadata: Metadata = {
  title: "Dashboard - Uptime Lens",
};

export default async function DashboardPage() {
  const session = await verifySession();

  const userMonitors = await db
    .select()
    .from(monitors)
    .where(eq(monitors.userId, session.user.id))
    .orderBy(desc(monitors.createdAt));

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <MonitorList monitors={userMonitors} />
    </div>
  );
}
