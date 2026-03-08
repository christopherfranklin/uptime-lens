"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import type { monitors } from "@/lib/db/schema";
import {
  createMonitor,
  updateMonitor,
  toggleMonitorStatus,
} from "@/app/actions/monitors";
import { DeleteDialog } from "./delete-dialog";

type MonitorRow = typeof monitors.$inferSelect;
type MonitorType = "http" | "tcp" | "ssl";

interface MonitorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitor?: MonitorRow | null;
}

const TYPE_OPTIONS: { value: MonitorType; label: string }[] = [
  { value: "http", label: "HTTP" },
  { value: "tcp", label: "TCP" },
  { value: "ssl", label: "SSL" },
];

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

function parseTcpUrl(url: string): { host: string; port: string } {
  const parts = url.split(":");
  if (parts.length < 2) return { host: url, port: "" };
  const port = parts[parts.length - 1];
  const host = parts.slice(0, -1).join(":");
  return { host, port };
}

export function MonitorPanel({
  open,
  onOpenChange,
  monitor,
}: MonitorPanelProps) {
  const isEdit = !!monitor;

  const [name, setName] = useState("");
  const [type, setType] = useState<MonitorType>("http");
  const [url, setUrl] = useState("");
  const [tcpHost, setTcpHost] = useState("");
  const [tcpPort, setTcpPort] = useState("");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [timeoutMs, setTimeoutMs] = useState("10000");
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState("180");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isToggling, startToggle] = useTransition();

  // Reset form when dialog opens/closes or monitor changes
  function resetForm() {
    if (monitor) {
      setName(monitor.name);
      setType(monitor.type);
      if (monitor.type === "tcp") {
        const { host, port } = parseTcpUrl(monitor.url);
        setTcpHost(host);
        setTcpPort(port);
      } else {
        setUrl(monitor.url);
      }
      setExpectedStatusCode(String(monitor.expectedStatusCode ?? 200));
      setTimeoutMs(String(monitor.timeoutMs));
      setCheckIntervalSeconds(String(monitor.checkIntervalSeconds));
    } else {
      setName("");
      setType("http");
      setUrl("");
      setTcpHost("");
      setTcpPort("");
      setExpectedStatusCode("200");
      setTimeoutMs("10000");
      setCheckIntervalSeconds("180");
    }
    setShowAdvanced(false);
    setError(null);
    setDeleteOpen(false);
  }

  function handleOpenChange(
    nextOpen: boolean,
    _eventDetails: Dialog.Root.ChangeEventDetails,
  ) {
    if (nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();

      if (isEdit) {
        formData.append("id", String(monitor.id));
        formData.append("name", name);
        formData.append("expectedStatusCode", expectedStatusCode);
        formData.append("timeoutMs", timeoutMs);
        formData.append("checkIntervalSeconds", checkIntervalSeconds);
        const result = await updateMonitor(formData);
        if ("error" in result) {
          setError(result.error);
        } else {
          onOpenChange(false);
        }
      } else {
        formData.append("name", name);
        formData.append("type", type);
        if (type === "tcp") {
          formData.append("url", `${tcpHost}:${tcpPort}`);
        } else {
          formData.append("url", url);
        }
        formData.append("expectedStatusCode", expectedStatusCode);
        formData.append("timeoutMs", timeoutMs);
        formData.append("checkIntervalSeconds", checkIntervalSeconds);
        const result = await createMonitor(formData);
        if ("error" in result) {
          setError(result.error);
        } else {
          onOpenChange(false);
        }
      }
    });
  }

  function handleToggleStatus() {
    if (!monitor) return;
    startToggle(async () => {
      const formData = new FormData();
      formData.append("id", String(monitor.id));
      const result = await toggleMonitorStatus(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  function handleDeleted() {
    setDeleteOpen(false);
    onOpenChange(false);
  }

  const typeBadgeColor: Record<MonitorType, string> = {
    http: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    tcp: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ssl: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange} modal>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] translate-x-0 border-l border-border bg-background shadow-xl transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                {isEdit ? "Edit Monitor" : "Create Monitor"}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <title>Close</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </Dialog.Close>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              {/* Name */}
              <div className="mb-5">
                <label
                  htmlFor="monitor-name"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Name
                </label>
                <input
                  id="monitor-name"
                  type="text"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Website"
                  className={inputClass}
                />
              </div>

              {/* Type selector */}
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Type
                </label>
                {isEdit ? (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeBadgeColor[monitor.type]}`}
                  >
                    {monitor.type.toUpperCase()}
                  </span>
                ) : (
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setType(opt.value)}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          type === opt.value
                            ? "border-brand-500 bg-brand-500/10 text-brand-600"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* URL / Host fields */}
              <div className="mb-5">
                {isEdit ? (
                  <>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {monitor.type === "tcp" ? "Host" : "URL"}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {monitor.url}
                    </p>
                  </>
                ) : (
                  <>
                    {type === "tcp" ? (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label
                            htmlFor="tcp-host"
                            className="mb-1.5 block text-sm font-medium text-foreground"
                          >
                            Host
                          </label>
                          <input
                            id="tcp-host"
                            type="text"
                            required
                            value={tcpHost}
                            onChange={(e) => setTcpHost(e.target.value)}
                            placeholder="example.com"
                            className={inputClass}
                          />
                        </div>
                        <div className="w-28">
                          <label
                            htmlFor="tcp-port"
                            className="mb-1.5 block text-sm font-medium text-foreground"
                          >
                            Port
                          </label>
                          <input
                            id="tcp-port"
                            type="number"
                            required
                            min={1}
                            max={65535}
                            value={tcpPort}
                            onChange={(e) => setTcpPort(e.target.value)}
                            placeholder="443"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <label
                          htmlFor="monitor-url"
                          className="mb-1.5 block text-sm font-medium text-foreground"
                        >
                          URL
                        </label>
                        <input
                          id="monitor-url"
                          type="url"
                          required
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com"
                          className={inputClass}
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Expected status code (HTTP only) */}
              {(isEdit ? monitor.type : type) === "http" && (
                <div className="mb-5">
                  <label
                    htmlFor="expected-status"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Expected Status Code
                  </label>
                  <input
                    id="expected-status"
                    type="number"
                    min={100}
                    max={599}
                    value={expectedStatusCode}
                    onChange={(e) => setExpectedStatusCode(e.target.value)}
                    className={`${inputClass} max-w-32`}
                  />
                </div>
              )}

              {/* Advanced settings */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <title>Toggle</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                  Advanced
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-4 rounded-lg border border-border p-4">
                    <div>
                      <label
                        htmlFor="timeout"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Timeout (ms)
                      </label>
                      <input
                        id="timeout"
                        type="number"
                        min={1000}
                        max={60000}
                        value={timeoutMs}
                        onChange={(e) => setTimeoutMs(e.target.value)}
                        className={`${inputClass} max-w-40`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="interval"
                        className="mb-1.5 block text-sm font-medium text-foreground"
                      >
                        Check Interval (seconds)
                      </label>
                      <input
                        id="interval"
                        type="number"
                        min={30}
                        max={3600}
                        value={checkIntervalSeconds}
                        onChange={(e) =>
                          setCheckIntervalSeconds(e.target.value)
                        }
                        className={`${inputClass} max-w-40`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending
                  ? isEdit
                    ? "Saving..."
                    : "Creating..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Monitor"}
              </button>

              {/* Edit-only sections */}
              {isEdit && (
                <>
                  {/* Pause/Resume toggle */}
                  <div className="mt-6 rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">
                      This monitor is{" "}
                      <span className="font-medium text-foreground">
                        {monitor.status}
                      </span>
                    </p>
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={handleToggleStatus}
                      className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isToggling
                        ? "Updating..."
                        : monitor.status === "active"
                          ? "Pause Monitor"
                          : "Resume Monitor"}
                    </button>
                  </div>

                  {/* Delete button */}
                  <div className="mt-6 border-t border-border pt-6">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="rounded-lg border border-destructive px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      Delete Monitor
                    </button>
                  </div>
                </>
              )}
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete confirmation dialog */}
      {isEdit && (
        <DeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          monitorName={monitor.name}
          monitorId={monitor.id}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
