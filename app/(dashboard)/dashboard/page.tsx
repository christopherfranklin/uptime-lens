import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";
import { getMonitorsWithStats } from "@/lib/queries/monitors";
import { MonitorList } from "@/components/monitors/monitor-list";

export const metadata: Metadata = {
  title: "Dashboard - Uptime Lens",
};

export default async function DashboardPage() {
  const session = await verifySession();

  const monitors = await getMonitorsWithStats(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <MonitorList monitors={monitors} />
    </div>
  );
}
