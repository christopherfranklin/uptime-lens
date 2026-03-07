"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { authClient } from "@/lib/auth-client";

interface SettingsClientProps {
  currentEmail: string;
}

export function SettingsClient({ currentEmail }: SettingsClientProps) {
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus("sending");
    setEmailMessage(null);

    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: "/settings",
    });

    if (error) {
      setEmailMessage(error.message ?? "Something went wrong. Try again.");
      setEmailStatus("error");
    } else {
      setEmailMessage(
        `Verification email sent to ${newEmail}. Check your inbox.`,
      );
      setEmailStatus("sent");
      setNewEmail("");
    }
  }

  return (
    <>
      {/* Email Change Section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Email Address</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change the email address associated with your account
        </p>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Current email:{" "}
            <span className="font-medium text-foreground">{currentEmail}</span>
          </p>
        </div>

        <form onSubmit={handleEmailChange} className="mt-4">
          <div className="mb-4">
            <label
              htmlFor="new-email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              New email address
            </label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@example.com"
              required
              className="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {emailMessage && (
            <div
              className={`mb-4 rounded-lg px-3 py-2 text-sm ${
                emailStatus === "sent"
                  ? "bg-brand-100 text-brand-800"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {emailMessage}
            </div>
          )}
          <button
            type="submit"
            disabled={emailStatus === "sending"}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailStatus === "sending" ? "Sending..." : "Change email"}
          </button>
        </form>
      </section>

      {/* Logout Section */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Sign Out</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of your account on this device
        </p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Log out
          </button>
        </form>
      </section>
    </>
  );
}
