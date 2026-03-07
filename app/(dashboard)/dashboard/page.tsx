import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Dashboard - Uptime Lens",
};

export default async function DashboardPage() {
  await verifySession();

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div className="flex flex-col items-center justify-center py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <title>No monitors</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Create your first monitor
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start monitoring your sites and services to get instant alerts when
            something goes down.
          </p>
          <button
            type="button"
            disabled
            className="mt-6 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
          >
            Create Monitor
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Coming soon in the next update
          </p>
        </div>
      </div>
    </div>
  );
}
