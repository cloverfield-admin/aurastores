"use client";

import { useEffect, useMemo, useState } from "react";

type PriceRow = {
  planCode: string;
  planName: string;
  interval: "monthly" | "quarterly" | "yearly";
  currency: string;
  amountCents: number;
  effectiveFrom: string;
};

function formatMoney(currency: string, amountCents: number) {
  const value = (amountCents / 100).toFixed(2).replace(/\.00$/, "");
  return `${currency} ${value}`;
}

export function AdminPricingContent() {
  const [rows, setRows] = useState<PriceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const res = await fetch("/api/v1/admin/plans/prices", { cache: "no-store" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not load pricing.");
      }
      const payload = (await res.json()) as { prices: PriceRow[] };
      if (!cancelled) {
        setRows(payload.prices);
      }
    })().catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : "Could not load pricing.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const byPlan = new Map<string, { name: string; items: PriceRow[] }>();
    for (const r of rows ?? []) {
      const key = r.planCode;
      const existing = byPlan.get(key) ?? { name: r.planName, items: [] };
      existing.items.push(r);
      byPlan.set(key, existing);
    }
    return [...byPlan.entries()].map(([code, data]) => ({
      code,
      name: data.name,
      items: data.items.sort((a, b) => a.interval.localeCompare(b.interval)),
    }));
  }, [rows]);

  async function savePrice(planCode: string, interval: PriceRow["interval"], currency: string) {
    const key = `${planCode}:${interval}:${currency}`;
    const raw = drafts[key]?.trim();
    if (!raw) {
      setError("Enter an amount.");
      return;
    }
    const amount = Number.parseFloat(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Amount must be a non-negative number.");
      return;
    }
    const amountCents = Math.round(amount * 100);

    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/plans/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode, interval, currency, amountCents }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save price.");
      }
      const refreshed = await fetch("/api/v1/admin/plans/prices", { cache: "no-store" });
      const payload = (await refreshed.json()) as { prices: PriceRow[] };
      setRows(payload.prices);
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save price.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[960px] space-y-8">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)]">
            Pricing Admin
          </h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            Update active plan pricing. Changes affect the landing page and new invoices.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-[#f2b8b5] bg-[#fdf3f3] p-4 text-sm text-[#7d2a2a]">
            {error}
          </div>
        ) : null}

        {rows === null ? (
          <p className="text-sm text-[var(--app-text-muted)]">Loading…</p>
        ) : (
          <div className="space-y-6">
            {grouped.map((plan) => (
              <section
                key={plan.code}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
              >
                <h2 className="text-base font-bold text-[var(--app-text)]">
                  {plan.name} <span className="text-xs font-semibold text-[var(--app-text-muted)]">({plan.code})</span>
                </h2>
                <div className="mt-4 space-y-3">
                  {plan.items.map((item) => {
                    const key = `${plan.code}:${item.interval}:${item.currency}`;
                    const disabled = saving === key;
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4 sm:grid-cols-[140px_1fr_160px]"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                          {item.interval}
                        </div>
                        <div className="text-sm font-semibold text-[var(--app-text)]">
                          Current: {formatMoney(item.currency, item.amountCents)}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={drafts[key] ?? ""}
                            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                            placeholder="e.g. 300"
                            disabled={disabled}
                            className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none disabled:opacity-60"
                            inputMode="decimal"
                          />
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void savePrice(plan.code, item.interval, item.currency)}
                            className="shrink-0 rounded-lg bg-[var(--app-brand)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                          >
                            {disabled ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

