import type { Metadata } from "next";
import { OutboxOfflineSection } from "@/components/outbox/outbox-offline-section";
import { OfflineActions } from "./offline-actions";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-10 shadow-sm">
        <span className="material-symbols-outlined notranslate text-5xl text-zinc-400" aria-hidden>
          wifi_off
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-2xl font-bold text-zinc-900">
          You are offline
        </h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-600">
          Check your connection, then try again. Cached pages may still open from your last visit.
        </p>
        <OutboxOfflineSection />
        <OfflineActions />
      </div>
    </div>
  );
}
