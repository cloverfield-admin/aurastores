"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { hasCapability } from "@/lib/rbac/capabilities";
import { useInsightsOverviewQuery } from "@/lib/queries/insights";
import { useMeQuery, usePatchMeMutation } from "@/lib/queries/me";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { getGoogleMapsApiKey, getGoogleMapsMapId } from "@/lib/google-maps-env";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useSendInsightsSampleDigestMutation } from "@/lib/queries/insights";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const number = new Intl.NumberFormat("en-US");

type InsightsTab = "sales" | "inventory" | "dispensing" | "operations";

export function AuraInsightsContent() {
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canInsights = hasCapability(workspace.capabilities, "insights");
  const locked = !canInsights;
  const branchId = searchParams.get("branch") ?? undefined;

  const [tab, setTab] = useState<InsightsTab>("sales");

  const overviewQuery = useInsightsOverviewQuery({ branchId, enabled: canInsights });
  const data = overviewQuery.data;
  const meQuery = useMeQuery();
  const patchMe = usePatchMeMutation();
  const sendDigest = useSendInsightsSampleDigestMutation();
  const { notify, withLoading } = useAuraFeedback();

  const subtitle = branchId ? "Scoped to the selected branch." : "Organization-wide view across all branches.";

  const selectedSalesTrend = useMemo(() => {
    const points = data?.trends.sales ?? [];
    return points.slice(Math.max(0, points.length - 30));
  }, [data?.trends.sales]);

  const selectedOpsTrend = useMemo(() => {
    const points = data?.trends.operations ?? [];
    return points.slice(Math.max(0, points.length - 30));
  }, [data?.trends.operations]);

  const selectedInventoryTrend = useMemo(() => {
    const points = data?.trends.inventoryHealth ?? [];
    return points.slice(Math.max(0, points.length - 30));
  }, [data?.trends.inventoryHealth]);

  const content = (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Aura Insights
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--app-text-secondary)]">
              Store-wide trends, inventory risk signals, and upcoming AI summaries.
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--app-surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--app-text-muted)]">
              {branchId ? "Branch" : "All branches"}
            </span>
            <span className="rounded-full bg-[rgba(96,99,238,0.1)] px-3 py-1 text-xs font-semibold text-[#6063ee]">
              Last 30 days
            </span>
          </div>
        </div>

        {overviewQuery.isError ? (
          overviewQuery.error instanceof Error && overviewQuery.error.message === "Forbidden" ? (
            <MissingCapabilityNotice capability="insights" />
          ) : (
            <p className="text-sm text-red-600">Could not load insights. Try again in a moment.</p>
          )
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          <KpiCard
            icon="payments"
            label="Revenue (30d)"
            value={data ? money.format(data.kpis.revenueCents30d / 100) : "—"}
            sub={`${data ? number.format(data.kpis.salesCount30d) : "—"} sales · ${data ? number.format(data.kpis.unitsSold30d) : "—"} units`}
          />
          <KpiCard
            icon="warning"
            label="Inventory risk"
            value={data ? `${number.format(data.kpis.nearExpiryBatchCount)} near-expiry` : "—"}
            sub={data ? `${number.format(data.kpis.lowStockSkuCount)} low-stock SKUs` : "—"}
          />
          <KpiCard
            icon="groups"
            label="Operations"
            value={data ? `${number.format(data.kpis.activeStaffCount)} active staff` : "—"}
            sub="Live staffing footprint"
          />
        </div>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Store trends
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Quick signals across sales, inventory, sell-through, and operations.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2">
              <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
                Sales
              </TabButton>
              <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>
                Inventory health
              </TabButton>
              <TabButton active={tab === "dispensing"} onClick={() => setTab("dispensing")}>
                Sell-through
              </TabButton>
              <TabButton active={tab === "operations"} onClick={() => setTab("operations")}>
                Operations
              </TabButton>
            </div>
          </div>

          <div className="mt-6">
            {overviewQuery.isPending || !data ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : tab === "sales" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TrendCard
                  title="Revenue (daily)"
                  subtitle="Last 30 days"
                  value={money.format(data.kpis.revenueCents30d / 100)}
                  points={selectedSalesTrend.map((p) => ({ label: p.date, value: p.revenueCents }))}
                  formatPoint={(v) => money.format(v / 100)}
                />
                <TrendCard
                  title="Units sold (daily)"
                  subtitle="Last 30 days"
                  value={`${number.format(data.kpis.unitsSold30d)} units`}
                  points={selectedSalesTrend.map((p) => ({ label: p.date, value: p.unitsSold }))}
                  formatPoint={(v) => `${number.format(Math.round(v))} units`}
                />
              </div>
            ) : tab === "inventory" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TrendCard
                  title="Near-expiry batches"
                  subtitle="Rolling 30-day window"
                  value={number.format(data.kpis.nearExpiryBatchCount)}
                  points={selectedInventoryTrend.map((p) => ({ label: p.date, value: p.nearExpiryBatchCount }))}
                  formatPoint={(v) => number.format(Math.round(v))}
                />
                <TrendCard
                  title="Batch health ratio"
                  subtitle="Current snapshot (stable series)"
                  value={`${number.format(selectedInventoryTrend[selectedInventoryTrend.length - 1]?.healthyBatchRatio ?? 0)}%`}
                  points={selectedInventoryTrend.map((p) => ({ label: p.date, value: p.healthyBatchRatio }))}
                  formatPoint={(v) => `${number.format(Math.round(v))}%`}
                />
              </div>
            ) : tab === "dispensing" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <ListCard
                  title="Top products (30d)"
                  rows={data.dispensing.topMedications.map((m) => ({
                    label: m.name,
                    value: `${number.format(m.unitsSold)} units`,
                  }))}
                  emptyLabel="No product movement data yet."
                />
                <ListCard
                  title="Top categories (30d)"
                  rows={data.dispensing.topCategories.map((c) => ({
                    label: c.name,
                    value: `${number.format(c.unitsSold)} units`,
                  }))}
                  emptyLabel="No category data yet."
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <TrendCard
                  title="Sales velocity"
                  subtitle="Transactions per day"
                  value={`${number.format(data.kpis.salesCount30d)} sales (30d)`}
                  points={selectedOpsTrend.map((p) => ({ label: p.date, value: p.salesCount }))}
                  formatPoint={(v) => `${number.format(Math.round(v))} sales`}
                />
                <TrendCard
                  title="Active staff"
                  subtitle="Org roster (stable series)"
                  value={number.format(data.kpis.activeStaffCount)}
                  points={selectedOpsTrend.map((p) => ({ label: p.date, value: p.activeStaffCount }))}
                  formatPoint={(v) => number.format(Math.round(v))}
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Inventory risk heatmap
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Branch-level risk signals normalized per column (0–100).
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[var(--app-text-faint)]">
              Low-stock · Near-expiry · Batch health risk
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {overviewQuery.isPending || !data ? (
              <div className="h-28 rounded-lg bg-[var(--app-surface-muted)]" />
            ) : data.heatmap.rows.length === 0 ? (
              <p className="text-sm text-[var(--app-text-muted)]">No branches available for this view.</p>
            ) : (
              <HeatmapTable data={data.heatmap} />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Forecast & reorder suggestions
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Based on the last {data?.forecast.assumptions.windowDays ?? 30} days of sales velocity and current on-hand units.
              </p>
            </div>
            {data ? (
              <span className="text-[11px] font-semibold text-[var(--app-text-faint)]">
                Reorder when cover &lt; {data.forecast.assumptions.reorderWhenBelowDaysCover}d · Target {data.forecast.assumptions.targetCoverDays}d
              </span>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
            {overviewQuery.isPending || !data ? (
              <div className="h-28 rounded-lg bg-[var(--app-surface-muted)]" />
            ) : data.forecast.items.length === 0 ? (
              <p className="text-sm text-[var(--app-text-muted)]">No forecast data yet.</p>
            ) : (
              <ForecastTable items={data.forecast.items} />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Risk to revenue mapping
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Translate inventory risk signals into estimated monetary impact.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <KpiCard
              icon="alarm"
              label="Near-expiry stock value"
              value={
                data
                  ? money.format(data.riskToRevenue.nearExpiry.estimatedRetailValueCents / 100)
                  : "—"
              }
              sub={
                data
                  ? `${number.format(data.riskToRevenue.nearExpiry.unitsAtRisk)} units · cost ${money.format(data.riskToRevenue.nearExpiry.costValueCents / 100)}`
                  : "—"
              }
            />
            <KpiCard
              icon="trending_down"
              label="Lost sales risk (30d est.)"
              value={
                data
                  ? money.format(data.riskToRevenue.lowStock.estimatedLostRevenueCentsNext30d / 100)
                  : "—"
              }
              sub={
                data
                  ? `${number.format(data.riskToRevenue.lowStock.estimatedLostUnitsNext30d)} units · ${number.format(data.riskToRevenue.lowStock.skusAtRisk)} SKUs`
                  : "—"
              }
            />
            <KpiCard
              icon="query_stats"
              label="At-risk summary"
              value={
                data
                  ? `${number.format(data.riskToRevenue.nearExpiry.batchesAtRisk)} batches`
                  : "—"
              }
              sub={
                data
                  ? "Near-expiry + low-stock signals combined"
                  : "—"
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Geo / network layer
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Visualize branch risk across your network.
              </p>
            </div>
          </div>

          <div className="mt-5">
            {overviewQuery.isPending || !data ? (
              <div className="h-48 rounded-lg bg-[var(--app-surface-muted)]" />
            ) : (
              <BranchGeoPanel branches={data.geo.branches} />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Insight subscriptions
              </h2>
              <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                Email-only for now (weekly digest will ship next).
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--app-text)]">Weekly insights email</p>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                Send a summary of trends, risks, and reorder suggestions to your account email.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={sendDigest.isPending || overviewQuery.isPending}
                onClick={async () => {
                  try {
                    await withLoading(
                      "insights-sample-digest",
                      "Sending sample digest email...",
                      async () => {
                        await sendDigest.mutateAsync({ branchId });
                      },
                    );
                    notify({
                      variant: "success",
                      title: "Sample digest sent",
                      description: "Check your inbox in a moment (and spam folder if needed).",
                    });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Could not send sample digest.";
                    notify({ variant: "error", title: "Send failed", description: message });
                  }
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-surface-muted)] ${
                  sendDigest.isPending ? "opacity-60" : ""
                }`}
              >
                <span className="material-symbols-outlined notranslate text-lg">outgoing_mail</span>
                Send sample digest
              </button>
              <button
                type="button"
                disabled={patchMe.isPending || meQuery.isPending || !meQuery.data}
                onClick={() => {
                  const enabled = Boolean(meQuery.data?.preferences.emailAlerts);
                  patchMe.mutate({ emailAlerts: !enabled });
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  meQuery.data?.preferences.emailAlerts
                    ? "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]"
                    : "bg-[var(--app-input-bg)] text-[var(--app-text)] hover:bg-[var(--app-input-focus-bg)]"
                } ${patchMe.isPending ? "opacity-60" : ""}`}
              >
                <span className="material-symbols-outlined notranslate text-lg">
                  {meQuery.data?.preferences.emailAlerts ? "mark_email_read" : "mark_email_unread"}
                </span>
                {meQuery.data?.preferences.emailAlerts ? "Subscribed" : "Subscribe"}
              </button>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
              AI summaries
            </h2>
            <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
              Draft narratives based on your store trends (dummy data for now).
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {DUMMY_AI_SUMMARIES.map((s) => (
              <div key={s.title} className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-[var(--app-text)]">{s.title}</p>
                    <p className="mt-1 text-xs text-[var(--app-text-muted)]">{s.detail}</p>
                  </div>
                  <span className="rounded-full bg-[rgba(15,185,177,0.12)] px-2 py-1 text-[10px] font-semibold text-[var(--app-link-teal)]">
                    Preview
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(2,6,23,0.45)] p-6 backdrop-blur-[2px]">
            <div className="w-full max-w-xl rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[rgba(15,23,42,0.75)] p-6 text-center shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgba(255,255,255,0.7)]">
                Coming soon
              </p>
              <p className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-white">
                AI summaries will be generated from live aggregates
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[rgba(255,255,255,0.78)]">
                We’ll automatically summarize sales trends, outliers, and inventory risks once the model pipeline is connected.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="insights">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        <MissingCapabilityNotice capability="insights" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}

function ForecastTable({
  items,
}: {
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    categoryName: string;
    unitsSoldWindow: number;
    avgDailyUnits: number;
    availableUnits: number;
    daysOfCover: number | null;
    suggestedOrderUnits: number;
    estimatedUnitPriceCents: number;
    estimatedOrderValueCents: number;
  }>;
}) {
  const [selected, setSelected] = useState<null | (typeof items)[number]>(null);
  const fmtMoney = (cents: number) => money.format(cents / 100);

  const rows = items.slice(0, 10);

  return (
    <>
      <table className="min-w-[860px] w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-faint)]">
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">On hand</th>
            <th className="px-3 py-2">Avg/day</th>
            <th className="px-3 py-2">Cover</th>
            <th className="px-3 py-2">Suggested order</th>
            <th className="px-3 py-2">Est. value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const coverLabel =
              item.daysOfCover == null ? "—" : `${Math.round(item.daysOfCover)}d`;
            const risk =
              item.daysOfCover != null && item.daysOfCover < 7
                ? "high"
                : item.daysOfCover != null && item.daysOfCover < 14
                  ? "medium"
                  : "low";
            const badgeClass =
              risk === "high"
                ? "bg-[#fff1f2] text-[#e11d48]"
                : risk === "medium"
                  ? "bg-[rgba(249,115,22,0.16)] text-[#c2410c]"
                  : "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]";

            return (
              <tr key={item.productId}>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left transition hover:bg-[var(--app-surface-muted)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[var(--app-text)]">{item.productName}</p>
                        <p className="truncate text-[11px] text-[var(--app-text-faint)]">
                          {item.categoryName} · {item.sku}
                        </p>
                      </div>
                      {item.suggestedOrderUnits > 0 ? (
                        <span className="rounded-full bg-[rgba(99,102,241,0.12)] px-2 py-1 text-[10px] font-semibold text-[#6063ee]">
                          Reorder
                        </span>
                      ) : (
                        <span className="rounded-full bg-[var(--app-surface-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--app-text-muted)]">
                          OK
                        </span>
                      )}
                    </div>
                  </button>
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-[var(--app-text)]">{item.availableUnits}</td>
                <td className="px-3 py-2 text-sm font-semibold text-[var(--app-text)]">
                  {item.avgDailyUnits > 0 ? item.avgDailyUnits.toFixed(2) : "0.00"}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass}`}>{coverLabel}</span>
                </td>
                <td className="px-3 py-2 text-sm font-extrabold text-[var(--app-text)]">
                  {item.suggestedOrderUnits > 0 ? item.suggestedOrderUnits : "—"}
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-[var(--app-text-muted)]">
                  {item.suggestedOrderUnits > 0 ? fmtMoney(item.estimatedOrderValueCents) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selected ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Forecast item details"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Forecast datapoint
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                  {selected.productName}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--app-text-muted)]">
                  {selected.categoryName} · {selected.sku}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined notranslate text-xl">close</span>
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Days of cover
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">
                  {selected.daysOfCover == null ? "—" : `${Math.round(selected.daysOfCover)}d`}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Suggested order
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">
                  {selected.suggestedOrderUnits > 0 ? selected.suggestedOrderUnits : "—"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[var(--app-text-secondary)]">
              This suggestion uses average daily units over the last 30 days and compares it against current on-hand units to estimate days of cover.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BranchGeoPanel({
  branches,
}: {
  branches: Array<{
    branchId: string;
    branchName: string;
    latitude: number | null;
    longitude: number | null;
    riskScore: number;
    riskLabel: "low" | "medium" | "high";
  }>;
}) {
  const apiKey = getGoogleMapsApiKey();
  const mapId = getGoogleMapsMapId();
  const withCoords = branches.filter((b) => b.latitude != null && b.longitude != null);

  if (!apiKey || withCoords.length === 0) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {branches.map((b) => (
          <div
            key={b.branchId}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[var(--app-text)]">{b.branchName}</p>
              <p className="text-[11px] text-[var(--app-text-faint)]">
                Risk score: {b.riskScore}/100 {apiKey ? "" : "· Map not configured"}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                b.riskLabel === "high"
                  ? "bg-[#fff1f2] text-[#e11d48]"
                  : b.riskLabel === "medium"
                    ? "bg-[rgba(249,115,22,0.16)] text-[#c2410c]"
                    : "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]"
              }`}
            >
              {b.riskLabel}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const center = {
    lat: withCoords.reduce((sum, b) => sum + (b.latitude ?? 0), 0) / withCoords.length,
    lng: withCoords.reduce((sum, b) => sum + (b.longitude ?? 0), 0) / withCoords.length,
  };

  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-[var(--app-border-ui)]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={11}
          mapId={mapId}
          gestureHandling="greedy"
          disableDefaultUI
        >
          {withCoords.map((b) => {
            const color =
              b.riskLabel === "high" ? "#ef4444" : b.riskLabel === "medium" ? "#f97316" : "#0fb9b1";
            return (
              <AdvancedMarker key={b.branchId} position={{ lat: b.latitude!, lng: b.longitude! }} title={b.branchName}>
                <Pin
                  background={color}
                  borderColor="rgba(15,23,42,0.25)"
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}

const DUMMY_AI_SUMMARIES = [
  {
    title: "Stock risk outlook",
    detail: "Two branches show elevated near-expiry counts. Prioritize fast-moving categories and trigger supplier reorder checks.",
  },
  {
    title: "Demand mix shift",
    detail: "OTC volume is trending up week-over-week. Consider adjusting shelf allocation and reorder quantities.",
  },
  {
    title: "Operational signal",
    detail: "Transaction velocity spikes on weekends. Review staffing coverage and cashier throughput during peak hours.",
  },
] as const;

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--app-surface-subtle)]">
          <span className="material-symbols-outlined notranslate text-2xl text-[var(--app-text-muted)]">{icon}</span>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[var(--app-text)]">
        {value}
      </p>
      <p className="mt-2 text-[11px] text-[var(--app-text-faint)]">{sub}</p>
    </article>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]"
          : "bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:bg-[var(--app-input-focus-bg)]"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonCard() {
  return <div className="h-[124px] rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface-muted)]" />;
}

function TrendCard({
  title,
  subtitle,
  value,
  points,
  formatPoint,
}: {
  title: string;
  subtitle: string;
  value: string;
  points: Array<{ label: string; value: number }>;
  formatPoint: (value: number) => string;
}) {
  return (
    <article className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-[var(--app-text)]">{title}</p>
          <p className="mt-1 text-[11px] font-medium text-[var(--app-text-faint)]">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[var(--app-surface-subtle)] px-2 py-1 text-[11px] font-semibold text-[var(--app-text)]">
          {value}
        </span>
      </div>
      <div className="mt-3">
        <Sparkline points={points} formatPoint={formatPoint} />
      </div>
    </article>
  );
}

function ListCard({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  emptyLabel: string;
}) {
  return (
    <article className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
      <p className="text-sm font-extrabold text-[var(--app-text)]">{title}</p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-[11px] text-[var(--app-text-faint)]">{emptyLabel}</p>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg bg-[var(--app-surface-muted)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--app-text)]">{row.label}</span>
              <span className="text-xs font-bold text-[var(--app-text-muted)]">{row.value}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function Sparkline({
  points,
  formatPoint,
}: {
  points: Array<{ label: string; value: number }>;
  formatPoint: (value: number) => string;
}) {
  const width = 280;
  const height = 64;
  const padding = 6;
  const values = points.length ? points.map((p) => p.value) : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-9, max - min);
  const xFor = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, values.length - 1);
  const yFor = (v: number) => height - padding - ((v - min) * (height - padding * 2)) / range;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`)
    .join(" ");
  const latest = values[values.length - 1] ?? 0;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hovered = hoverIndex != null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredX = hoverIndex != null ? xFor(hoverIndex) : null;
  const hoveredY = hoverIndex != null ? yFor(values[hoverIndex] ?? 0) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={() => setHoverIndex(null)}
      onMouseMove={(event) => {
        const el = containerRef.current;
        if (!el || points.length < 2) return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const t = (x - padding) / Math.max(1, rect.width - padding * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
      onTouchStart={(event) => {
        const touch = event.touches.item(0);
        const el = containerRef.current;
        if (!touch || !el || points.length < 2) return;
        const rect = el.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const t = (x - padding) / Math.max(1, rect.width - padding * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
      onTouchMove={(event) => {
        const touch = event.touches.item(0);
        const el = containerRef.current;
        if (!touch || !el || points.length < 2) return;
        const rect = el.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const t = (x - padding) / Math.max(1, rect.width - padding * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" role="img">
        <title>{formatPoint(latest)}</title>
        <path d={d} fill="none" stroke="rgb(15, 185, 177)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hoveredX != null && hoveredY != null ? (
          <>
            <line x1={hoveredX} x2={hoveredX} y1={padding} y2={height - padding} stroke="rgb(15, 185, 177)" opacity="0.25" />
            <circle cx={hoveredX} cy={hoveredY} r="3" fill="rgb(15, 185, 177)" />
            <circle cx={hoveredX} cy={hoveredY} r="7" fill="rgb(15, 185, 177)" opacity="0.12" />
          </>
        ) : null}
      </svg>

      {hovered ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[11px] text-[var(--app-text)] shadow-sm">
          <div className="font-semibold">{hovered.label}</div>
          <div className="text-[10px] text-[var(--app-text-muted)]">{formatPoint(hovered.value)}</div>
        </div>
      ) : (
        <div className="absolute right-2 top-2 rounded-md bg-[var(--app-surface)]/90 px-2 py-1 text-[10px] font-semibold text-[var(--app-text-muted)]">
          {formatPoint(latest)}
        </div>
      )}
    </div>
  );
}

function HeatmapTable({
  data,
}: {
  data: {
    dimensions: Array<string>;
    rows: Array<{
      branchId: string;
      branchName: string;
      cells: Array<{ dimension: string; value: number; intensity: number }>;
    }>;
  };
}) {
  const [selected, setSelected] = useState<null | {
    branchName: string;
    dimension: string;
    value: number;
    intensity: number;
  }>(null);

  const dimensionLabel = (dim: string) =>
    dim === "lowStock" ? "Low stock" : dim === "nearExpiry" ? "Near expiry" : "Batch health risk";

  const dimensionDescription = (dim: string) =>
    dim === "lowStock"
      ? "Count of distinct SKUs currently flagged as low-stock for this branch."
      : dim === "nearExpiry"
        ? "Count of active batches expiring within the next 30 days for this branch."
        : "Risk score derived from batch health ratio (higher means more at-risk).";

  return (
    <>
      <table className="min-w-[640px] w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--app-text-faint)]">
            <th className="px-3 py-2">Branch</th>
            {data.dimensions.map((d) => (
              <th key={d} className="px-3 py-2">
                {dimensionLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.branchId} className="rounded-xl">
              <td className="px-3 py-2 text-sm font-semibold text-[var(--app-text)]">{row.branchName}</td>
              {data.dimensions.map((dim) => {
                const cell = row.cells.find((c) => c.dimension === dim);
                const intensity = cell?.intensity ?? 0;
                const value = cell?.value ?? 0;
                const palette =
                  dim === "lowStock"
                    ? {
                        track: "rgba(245, 158, 11, 0.18)",
                        fill: "linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(234, 179, 8) 100%)",
                        bgA: [245, 158, 11] as const,
                        bgB: [234, 88, 12] as const,
                      }
                    : dim === "nearExpiry"
                      ? {
                          track: "rgba(249, 115, 22, 0.18)",
                          fill: "linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(239, 68, 68) 100%)",
                          bgA: [249, 115, 22] as const,
                          bgB: [239, 68, 68] as const,
                        }
                      : {
                          track: "rgba(168, 85, 247, 0.16)",
                          fill: "linear-gradient(135deg, rgb(168, 85, 247) 0%, rgb(236, 72, 153) 100%)",
                          bgA: [168, 85, 247] as const,
                          bgB: [236, 72, 153] as const,
                        };

                const bg = `linear-gradient(135deg, rgba(${palette.bgA[0]},${palette.bgA[1]},${palette.bgA[2]},${0.08 + intensity / 260}) 0%, rgba(${palette.bgB[0]},${palette.bgB[1]},${palette.bgB[2]},${0.06 + intensity / 300}) 100%)`;
                return (
                  <td key={dim} className="px-3 py-2">
                    <button
                      type="button"
                      title="Click for details"
                      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-link-teal)]"
                      style={{ backgroundImage: bg }}
                      onClick={() => setSelected({ branchName: row.branchName, dimension: dim, value, intensity })}
                    >
                      <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: palette.track }}>
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{
                            width: `${intensity}%`,
                            background: palette.fill,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[var(--app-text-muted)] group-hover:text-[var(--app-text)]">
                        {value}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Heatmap datapoint details"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Inventory risk datapoint
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                  {selected.branchName}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--app-text-muted)]">
                  {dimensionLabel(selected.dimension)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined notranslate text-xl">close</span>
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Value
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">{selected.value}</p>
              </div>
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Intensity (normalized)
                </p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">{selected.intensity}%</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[var(--app-text-secondary)]">
              {dimensionDescription(selected.dimension)}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
