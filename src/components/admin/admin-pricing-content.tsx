"use client";

import { useMemo, useState } from "react";
import { AdminError, AdminSection } from "@/components/admin/admin-primitives";
import { humanize } from "@/components/admin/format";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { EngineApiError } from "@/lib/api/engine";
import {
  useAdminPlanPricesQuery,
  useAdminUpsertPlanPriceMutation,
  type AdminPlanPrice,
} from "@/lib/queries/admin";

function formatMoney(currency: string, amountCents: number) {
  const value = (amountCents / 100).toFixed(2).replace(/\.00$/, "");
  return `${currency} ${value}`;
}

/**
 * Plan pricing.
 *
 * Moved here from /dashboard/(workspace)/admin/pricing and repointed at the Go
 * engine. The old Next.js route (`/api/v1/admin/plans/prices`) is gone: keeping
 * both would have left two write paths for the same table, only one of which
 * writes an audit row — which defeats the point of having one.
 */
export function AdminPricingContent() {
  const prices = useAdminPlanPricesQuery();
  const upsert = useAdminUpsertPlanPriceMutation();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const byPlan = new Map<string, { name: string; items: AdminPlanPrice[] }>();
    for (const row of prices.data ?? []) {
      const existing = byPlan.get(row.plan_code) ?? { name: row.plan_name, items: [] };
      existing.items.push(row);
      byPlan.set(row.plan_code, existing);
    }
    return [...byPlan.entries()].map(([code, data]) => ({
      code,
      name: data.name,
      items: data.items.sort((a, b) => a.interval.localeCompare(b.interval)),
    }));
  }, [prices.data]);

  async function save(planCode: string, interval: string, currency: string) {
    const key = `${planCode}:${interval}:${currency}`;
    const raw = drafts[key]?.trim();
    if (!raw) {
      notify({ variant: "error", title: "Enter an amount", description: "The new price is empty." });
      return;
    }
    const amount = Number.parseFloat(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      notify({
        variant: "error",
        title: "Invalid amount",
        description: "The price must be a non-negative number.",
      });
      return;
    }

    try {
      await withLoading("admin:plan-price", "Saving price…", () =>
        upsert.mutateAsync({
          plan_code: planCode,
          interval,
          currency,
          amount_cents: Math.round(amount * 100),
        }),
      );
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      notify({
        variant: "success",
        title: "Price updated",
        description: `${humanize(planCode)} ${interval} is now ${currency} ${amount}.`,
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Could not save the price",
        description:
          error instanceof EngineApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown error.",
      });
    }
  }

  const busy = isLoading("admin:plan-price");

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
          Pricing
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          Active plan pricing. Changes affect the landing page and any new invoice — existing
          subscriptions keep the price they were sold at.
        </p>
      </header>

      {prices.isError ? (
        <AdminError error={prices.error} onRetry={() => void prices.refetch()} />
      ) : prices.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-[var(--app-surface-muted)]" />
          ))}
        </div>
      ) : (
        grouped.map((plan) => (
          <AdminSection key={plan.code} title={plan.name} subtitle={plan.code}>
            <div className="space-y-3">
              {plan.items.map((item) => {
                const key = `${plan.code}:${item.interval}:${item.currency}`;
                return (
                  <div
                    key={key}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4 sm:grid-cols-[140px_1fr_200px]"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                      {item.interval}
                    </div>
                    <div className="text-sm font-semibold text-[var(--app-text)]">
                      Current: {formatMoney(item.currency, item.amount_cents)}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={drafts[key] ?? ""}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                        placeholder="e.g. 300"
                        disabled={busy}
                        inputMode="decimal"
                        className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void save(plan.code, item.interval, item.currency)}
                        className="shrink-0 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminSection>
        ))
      )}
    </div>
  );
}
