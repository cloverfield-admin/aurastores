"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useOutboxState } from "@/hooks/use-outbox-state";
import { flushOutbox, removeOutboxEntry, retryOutboxEntry, type OutboxEntry } from "@/lib/offline/outbox";
import type { OutboxFeature } from "@/lib/offline/outbox-features";
import { OUTBOX_FEATURE_LABELS } from "@/lib/offline/outbox-features";
import { OUTBOX_KIND_LABELS, type OutboxKind } from "@/lib/offline/outbox-kinds";
import { outboxQueryKeys } from "@/lib/offline/outbox-query-keys";

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function kindLabel(kind: string) {
  return OUTBOX_KIND_LABELS[kind as OutboxKind] ?? kind;
}

export function OutboxDetailDialog({
  feature,
  open,
  onOpenChange,
}: {
  feature: OutboxFeature;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data } = useOutboxState();
  const entries = useMemo(
    () =>
      (data?.entries ?? [])
        .filter((e) => e.feature === feature)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data?.entries, feature],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: outboxQueryKeys.all });
  }, [queryClient]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="outbox-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="outbox-dialog-title"
            className="font-[family-name:var(--font-manrope)] text-lg font-bold text-zinc-900"
          >
            {OUTBOX_FEATURE_LABELS[feature]} — queued changes
          </h2>
          <button
            type="button"
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <span className="material-symbols-outlined notranslate text-xl">close</span>
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">Nothing in the queue for this area.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((e: OutboxEntry) => (
              <li key={e.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-800">{kindLabel(e.kind)}</span>
                  <span className="text-xs text-zinc-500">{formatRelative(e.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{e.status}</p>
                {e.lastError ? <p className="mt-2 text-xs text-red-700">{e.lastError}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                    onClick={async () => {
                      await retryOutboxEntry(e.id);
                      invalidate();
                      void flushOutbox();
                    }}
                  >
                    Retry sync
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100"
                    onClick={async () => {
                      if (!window.confirm("Discard this queued change? It will not be sent.")) {
                        return;
                      }
                      await removeOutboxEntry(e.id);
                      invalidate();
                    }}
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function OutboxFeatureStatus({ feature }: { feature: OutboxFeature }) {
  const [open, setOpen] = useState(false);
  const { data } = useOutboxState();
  const slice = data?.summary.byFeature[feature];
  const n = (slice?.pending ?? 0) + (slice?.failed ?? 0) + (slice?.syncing ?? 0);
  if (n === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900 hover:bg-indigo-100"
      >
        <span className="material-symbols-outlined notranslate text-sm">cloud_upload</span>
        Sync: {slice?.pending ?? 0} pending
        {slice && slice.failed > 0 ? ` · ${slice.failed} failed` : ""}
      </button>
      <OutboxDetailDialog feature={feature} open={open} onOpenChange={setOpen} />
    </>
  );
}
