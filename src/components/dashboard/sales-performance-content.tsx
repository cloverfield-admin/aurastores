"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { useSalesDashboardQuery } from "@/lib/queries/sales";
import { ROUTES } from "@/lib/routes";
import { hasCapability } from "@/lib/rbac/capabilities";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

function formatRelativeTime(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function SalesPerformanceContent() {
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canSales = hasCapability(workspace.capabilities, "sales");
  const [chartMode, setChartMode] = useState<"revenue" | "volume">("revenue");
  const branch = searchParams.get("branch") ?? undefined;
  const addSaleHref = branch ? `${ROUTES.dashboard.salesAdd}?branch=${branch}` : ROUTES.dashboard.salesAdd;
  const salesDashboardQuery = useSalesDashboardQuery(branch, canSales);

  const metrics = salesDashboardQuery.data?.metrics;
  const revenueDeltaPct =
    metrics && metrics.previousRevenueCents > 0
      ? (((metrics.totalRevenueCents - metrics.previousRevenueCents) / metrics.previousRevenueCents) * 100).toFixed(1)
      : "0.0";

  const SALES_KPIS = [
    {
      label: "Total Revenue",
      value: currencyFormatter.format((metrics?.totalRevenueCents ?? 0) / 100),
      sub: `Vs. ${currencyFormatter.format((metrics?.previousRevenueCents ?? 0) / 100)} previous period`,
      badge: `${revenueDeltaPct.startsWith("-") ? "" : "+"}${revenueDeltaPct}%`,
      badgeClass: revenueDeltaPct.startsWith("-") ? "bg-[#fff1f2] text-[#e11d48]" : "bg-[#f0fdfa] text-[var(--app-link-teal)]",
      icon: "payments",
    },
    {
      label: "Gross Profit",
      value: currencyFormatter.format((metrics?.grossProfitCents ?? 0) / 100),
      sub: `COGS ${currencyFormatter.format((metrics?.totalCogsCents ?? 0) / 100)} (30d)`,
      badge: "30d",
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
      icon: "trending_up",
    },
    {
      label: "Total Orders",
      value: (metrics?.totalSalesCount ?? 0).toLocaleString(),
      sub: `Avg. order ${currencyFormatter.format((metrics?.averageOrderValueCents ?? 0) / 100)}`,
      badge: "Live",
      badgeClass: "bg-[#f0fdfa] text-[var(--app-link-teal)]",
      icon: "receipt_long",
    },
    {
      label: "Units Sold",
      value: (metrics?.unitsSoldLast30Days ?? 0).toLocaleString(),
      sub: "Total dispensed in the last 30 days",
      badge: "Rolling 30d",
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
      icon: "inventory_2",
    },
  ] as const;

  const TOP_DRUGS = salesDashboardQuery.data?.topProducts ?? [];
  const RECENT_TXS = salesDashboardQuery.data?.recentSales ?? [];
  const BRANCH_DIST = salesDashboardQuery.data?.branchDistribution ?? [];
  const trend = salesDashboardQuery.data?.trend ?? [];
  const maxRevenue = Math.max(1, ...trend.map((point) => point.revenueCents));
  const maxUnits = Math.max(1, ...trend.map((point) => point.unitsSold));
  const chartPoints =
    trend.length > 0
      ? trend.map((point) => ({
          day: point.label,
          value:
            chartMode === "revenue"
              ? (point.revenueCents / maxRevenue) * 6
              : (point.unitsSold / maxUnits) * 6,
        }))
      : [];

  if (!canSales) {
    return (
      <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px] space-y-8">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Monthly Sales Performance
            </h1>
            <p className="max-w-xl text-base text-[var(--app-text-secondary)]">
              Real-time clinical intelligence and financial tracking for the current branch (rolling 30-day window in
              metrics below).
            </p>
          </div>
          <MissingCapabilityNotice capability="sales" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Monthly Sales Performance
            </h1>
            <p className="max-w-xl text-base text-[var(--app-text-secondary)]">
              Real-time clinical intelligence and financial tracking for the current branch (rolling
              30-day window in metrics below).
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={addSaleHref}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <span className="material-symbols-outlined notranslate text-lg">add_shopping_cart</span>
              Add Sale
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-5 py-2.5 text-base font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
            >
              <span className="material-symbols-outlined notranslate text-lg">calendar_month</span>
              This Month
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-5 py-2.5 text-base font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-surface-muted)]"
            >
              <span className="material-symbols-outlined notranslate text-lg">download</span>
              Export Data
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SALES_KPIS.map((m) => (
            <article
              key={m.label}
              className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--app-surface-subtle)]">
                  <span className="material-symbols-outlined notranslate text-xl text-[var(--app-text-muted)]">
                    {m.icon}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${m.badgeClass}`}>
                  {m.badge}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
                {m.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[var(--app-text)]">
                {m.value}
              </p>
              <p className="mt-2 text-[10px] text-[var(--app-text-faint)]">{m.sub}</p>
            </article>
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column (2/3) */}
          <div className="space-y-8 lg:col-span-2">
            {/* Sales Analytics Trend */}
            <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                  Sales Analytics Trend
                </h2>
                <div className="flex rounded-lg bg-[var(--app-input-bg)] p-1">
                  <button
                    type="button"
                    onClick={() => setChartMode("revenue")}
                    className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                      chartMode === "revenue"
                        ? "bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm"
                        : "font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode("volume")}
                    className={`rounded-md px-4 py-1.5 text-xs transition ${
                      chartMode === "volume"
                        ? "bg-[var(--app-surface)] font-semibold text-[var(--app-text)] shadow-sm"
                        : "font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
                    }`}
                  >
                    Volume
                  </button>
                </div>
              </div>
              <div className="flex h-48 items-end justify-between gap-2">
                {chartPoints.map((d, i) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-36 w-full flex-col justify-end gap-1">
                      <div
                        className="h-8 w-full rounded-t"
                        style={{
                          height: `${d.value * 16}%`,
                          background:
                            chartMode === "revenue"
                              ? "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)"
                              : "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(16, 185, 129) 100%)",
                        }}
                      />
                      <div
                        className="h-8 w-full rounded-t bg-[var(--app-surface-subtle)] opacity-60"
                        style={{ height: `${(d.value - 0.5) * 14}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--app-text-faint)]">{d.day}</span>
                  </div>
                ))}
                {chartPoints.length === 0 && (
                  <div className="flex w-full items-center justify-center text-sm text-[var(--app-text-faint)]">
                    No trend data yet.
                  </div>
                )}
              </div>
            </section>

            {/* Monthly Insights + Recent Transactions row */}
            <div className="grid gap-8 sm:grid-cols-2">
              {/* Monthly Insights */}
              <article className="relative overflow-hidden rounded-xl p-6 text-white shadow-sm">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgb(96, 99, 238) 0%, rgb(15, 185, 177) 100%)",
                  }}
                />
                <div className="relative">
                  <span className="inline-block rounded-full bg-[var(--app-surface)]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                    Monthly Insights
                  </span>
                  <p className="mt-4 text-sm font-medium leading-relaxed opacity-95">
                    Revenue up 12.4% driven by East Side branch. Inventory optimization suggested for
                    high-margin products.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--app-surface)]/20 px-2 py-1 text-[10px] font-semibold">
                      Inventory Optimization Suggested
                    </span>
                    <span className="rounded-full bg-[var(--app-surface)]/20 px-2 py-1 text-[10px] font-semibold">
                      High Margin
                    </span>
                  </div>
                </div>
              </article>

              {/* Recent Transactions */}
              <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                    Recent Transactions
                  </h2>
                  <Link
                    href="#"
                    className="text-xs font-semibold text-[var(--app-link-teal)] underline decoration-[rgba(20,184,166,0.3)] hover:text-[var(--app-link-teal)]"
                  >
                    View All
                  </Link>
                </div>
                <ul className="space-y-3">
                  {RECENT_TXS.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--app-surface-muted)] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-[#e0f2fe]">
                          <span className="material-symbols-outlined notranslate text-base text-[#0369a1]">
                            receipt_long
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--app-text)]">
                            {tx.patientName ?? "Walk-in Customer"}
                          </p>
                          <p className="text-[10px] text-[var(--app-text-faint)]">
                            {formatRelativeTime(tx.createdAt)} · {tx.saleNumber}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[var(--app-text)]">
                        {currencyFormatter.format(tx.totalCents / 100)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-6">
            {/* Top Performing Drugs */}
            <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <h2 className="mb-4 font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                Top Performing Drugs
              </h2>
              <ul className="space-y-4">
                {TOP_DRUGS.map((d) => (
                  <li key={d.name}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-[var(--app-text)]">{d.name}</span>
                      <span className="font-bold text-[var(--app-link-teal)]">
                        {currencyFormatter.format(d.amountCents / 100)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${d.pct}%`,
                          background:
                            "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
              >
                Download Full Inventory Report
              </button>
            </section>

            {/* Branch Distribution */}
            <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
              <h2 className="mb-4 font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                Branch Distribution
              </h2>
              <ul className="space-y-3">
                {BRANCH_DIST.map((b) => (
                  <li
                    key={b.branchId}
                    className="flex items-center justify-between rounded-lg border-l-4 py-2 pl-4"
                    style={{ borderLeftColor: "#14b8a6" }}
                  >
                    <span className="text-sm font-semibold text-[var(--app-text)]">{b.name}</span>
                    <span className="text-sm font-bold text-[var(--app-text-muted)]">
                      {currencyFormatter.format(b.amountCents / 100)} ({b.pct}%)
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Q4 Compliance CTA */}
            <article className="rounded-xl border border-[#e0e7ff] bg-[#eef2ff] p-6">
              <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-[#3730a3]">
                Q4 Compliance Review
              </h3>
              <p className="mt-2 text-sm text-[#4f46e5]">
                Ensure all medication dispensers are calibrated by Oct 31st. Schedule inspection to
                maintain audit compliance.
              </p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca]"
              >
                Schedule Inspection
              </button>
            </article>
          </div>
        </div>

        {/* Footer strip */}
        <footer className="flex flex-col gap-4 border-t border-[var(--app-surface-subtle)] pt-6 text-[11px] uppercase tracking-[0.1em] text-[var(--app-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-[#cbd5e1]">AuraPharma v1.0.0</span>
            <span>© {new Date().getFullYear()} Clinical Intelligence</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[var(--app-text-muted)]">
              Privacy Policy
            </Link>
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[var(--app-text-muted)]">
              System Status
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
