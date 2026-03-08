import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getMonitorById } from "@/lib/queries/monitors";
import { getChartData } from "@/lib/queries/charts";
import { getUptimeForAllRanges } from "@/lib/queries/uptime";
import { getIncidentsForMonitor } from "@/lib/queries/incidents";
import { MonitorDetail } from "@/components/monitors/monitor-detail";

export const metadata: Metadata = {
  title: "Monitor Detail - Uptime Lens",
};

export default async function MonitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rangeParam } = await searchParams;
  const range = rangeParam ?? "24h";

  const monitorId = Number(id);
  if (Number.isNaN(monitorId)) {
    notFound();
  }

  const session = await verifySession();

  const [monitor, chartData, uptimeData, incidents] = await Promise.all([
    getMonitorById(monitorId, session.user.id),
    getChartData(monitorId, range),
    getUptimeForAllRanges(monitorId),
    getIncidentsForMonitor(monitorId, range, 10, 0),
  ]);

  if (!monitor) {
    notFound();
  }

  return (
    <MonitorDetail
      monitor={monitor}
      chartData={chartData}
      uptimeData={uptimeData}
      incidents={incidents}
      currentRange={range}
    />
  );
}
