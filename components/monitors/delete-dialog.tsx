"use client";

import { useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { deleteMonitor } from "@/app/actions/monitors";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitorName: string;
  monitorId: number;
  onDeleted: () => void;
}

export function DeleteDialog({
  open,
  onOpenChange,
  monitorName,
  monitorId,
  onDeleted,
}: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", String(monitorId));
      const result = await deleteMonitor(formData);
      if ("success" in result) {
        onDeleted();
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-xl transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
            Delete {monitorName}?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            This will permanently delete this monitor and all its associated
            data, including check history and incidents. This action cannot be
            undone.
          </Dialog.Description>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Dialog.Close className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
