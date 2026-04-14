"use client";

import { useMemo } from "react";
import { useOutboxState } from "@/hooks/use-outbox-state";
import { OUTBOX_FEATURE_LABELS } from "@/lib/offline/outbox-features";
import { OUTBOX_KIND_LABELS, type OutboxKind } from "@/lib/offline/outbox-kinds";
import type { OutboxEntry } from "@/lib/offline/outbox";

function kindLabel(kind: string) {
  return OUTBOX_KIND_LABELS[kind as OutboxKind] ?? kind;
}

export function OutboxOfflineSection() {
  const { data } = useOutboxState();
  const entries = useMemo(() => {
    const list = data?.entries ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data?.entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 w-full max-w-md rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-left shadow-sm">
      <h2 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-zinc-900">Queued changes</h2>
      <p className="mt-1 text-xs text-zinc-600">These will sync automatically when you reconnect.</p>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
        {entries.map((e: OutboxEntry) => (
          <li key={e.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
            <span className="font-semibold text-zinc-800">{OUTBOX_FEATURE_LABELS[e.feature]}</span>
            <span className="text-zinc-500"> · </span>
            <span className="text-zinc-700">{kindLabel(e.kind)}</span>
            <span className="ml-2 text-zinc-500">({e.status})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
