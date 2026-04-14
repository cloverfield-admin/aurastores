"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { flushOutbox } from "@/lib/offline/outbox";
import { outboxQueryKeys } from "@/lib/offline/outbox-query-keys";
import { useOutboxState } from "@/hooks/use-outbox-state";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

export function OutboxQueuedBanner() {
  const queryClient = useQueryClient();
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const { data } = useOutboxState();
  const pending = data?.summary.totalPending ?? 0;
  const failed = data?.summary.totalFailed ?? 0;
  const total = pending + failed;

  if (!online || total === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[95] border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-sm font-medium text-indigo-950"
    >
      <span>
        {total} change{total === 1 ? "" : "s"} waiting to sync
        {failed > 0 ? ` · ${failed} failed` : ""}.
      </span>{" "}
      <button
        type="button"
        className="font-semibold underline decoration-indigo-400 underline-offset-2 hover:text-indigo-800"
        onClick={() =>
          void flushOutbox().then(() => {
            void queryClient.invalidateQueries({ queryKey: outboxQueryKeys.all });
          })
        }
      >
        Sync now
      </button>
    </div>
  );
}
