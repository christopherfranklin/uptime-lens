import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings - Uptime Lens",
};

export default async function SettingsPage() {
  const session = await verifySession();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account settings
      </p>

      <div className="mt-8 space-y-8">
        <SettingsClient currentEmail={session.user.email} />
      </div>
    </div>
  );
}
