"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes";

/**
 * Predictive insights and cross-branch analytics will be served from a dedicated API.
 * Until then, use Aura Sales for real revenue and product trends.
 */
export function AuraInsightsContent() {
  return (
    <div className="relative px-4 pb-28 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-[var(--app-text)]">
            Aura Insights
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--app-text-secondary)]">
            Organization-wide insight charts (clinical trends, AI summaries, and heatmaps) are not
            wired to live aggregates yet. Your sales and stock dashboards already expose real
            metrics per branch.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={ROUTES.dashboard.sales}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <span className="material-symbols-outlined notranslate text-lg">trending_up</span>
              Open Aura Sales
            </Link>
            <Link
              href={ROUTES.dashboard.stock}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface-muted)] px-6 py-3 text-base font-semibold text-[#334155] transition hover:bg-[var(--app-surface-subtle)]"
            >
              <span className="material-symbols-outlined notranslate text-lg">inventory_2</span>
              Open Aura Stock
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
