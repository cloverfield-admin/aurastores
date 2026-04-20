"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { type SalesDateRangeInput, useSalesDashboardQuery, useSalesRecentSalesQuery } from "@/lib/queries/sales";
import { useAppMeQuery } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";
import { hasCapability } from "@/lib/rbac/capabilities";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function endOfPreviousMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
}

function daysBetweenInclusiveUtc(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

const MAX_DASHBOARD_RANGE_DAYS = 93;

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

function formatSignedPct(value: number) {
  if (!Number.isFinite(value)) {
    return "+0.0%";
  }
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded < 0 ? "" : "+";
  return `${sign}${rounded.toFixed(1)}%`;
}

function TrendSparkline({
  points,
  stroke,
  fill,
  title,
  valueFormatter,
}: {
  points: Array<{ label: string; value: number }>;
  stroke: string;
  fill: string;
  title: string;
  valueFormatter: (value: number) => string;
}) {
  const width = 240;
  const height = 64;
  const paddingX = 4;
  const paddingY = 6;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const values = useMemo(() => points.map((p) => p.value), [points]);

  if (values.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--app-surface-muted)] text-[11px] text-[var(--app-text-faint)]">
        No data
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1e-9, max - min);

  const xFor = (i: number) =>
    paddingX + (i * (width - paddingX * 2)) / Math.max(1, values.length - 1);
  const yFor = (v: number) =>
    height - paddingY - ((v - min) * (height - paddingY * 2)) / range;

  const lineD = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`)
    .join(" ");
  const areaD = `${lineD} L ${(paddingX + (width - paddingX * 2)).toFixed(2)} ${(height - paddingY).toFixed(
    2,
  )} L ${paddingX.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`;

  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const hoveredX = hoverIndex != null ? xFor(hoverIndex) : null;
  const hoveredY = hoverIndex != null ? yFor(values[hoverIndex] ?? 0) : null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={() => setHoverIndex(null)}
      onMouseMove={(event) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const t = (x - paddingX) / Math.max(1, rect.width - paddingX * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
      onTouchStart={(event) => {
        const touch = event.touches.item(0);
        const el = containerRef.current;
        if (!touch || !el) return;
        const rect = el.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const t = (x - paddingX) / Math.max(1, rect.width - paddingX * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
      onTouchMove={(event) => {
        const touch = event.touches.item(0);
        const el = containerRef.current;
        if (!touch || !el) return;
        const rect = el.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const t = (x - paddingX) / Math.max(1, rect.width - paddingX * 2);
        const idx = Math.round(t * (points.length - 1));
        setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
      }}
    >
      <svg
        role="img"
        aria-label={title}
        viewBox={`0 0 ${width} ${height}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
      >
        <title>{title}</title>
        <path d={areaD} fill={fill} opacity={0.35} />
        <path
          d={lineD}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoveredX != null && hoveredY != null && (
          <>
            <line x1={hoveredX} x2={hoveredX} y1={paddingY} y2={height - paddingY} stroke={stroke} opacity="0.25" />
            <circle cx={hoveredX} cy={hoveredY} r="3" fill={stroke} />
            <circle cx={hoveredX} cy={hoveredY} r="6" fill={stroke} opacity="0.12" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute left-2 top-2 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[11px] text-[var(--app-text)] shadow-sm"
          aria-hidden
        >
          <div className="font-semibold">{hovered.label}</div>
          <div className="text-[10px] text-[var(--app-text-muted)]">{valueFormatter(hovered.value)}</div>
        </div>
      )}
    </div>
  );
}

export function SalesPerformanceContent() {
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canSales = hasCapability(workspace.capabilities, "sales");
  const locked = !canSales;
  const meQuery = useAppMeQuery();
  const branch = searchParams.get("branch") ?? undefined;
  const addSaleHref = branch ? `${ROUTES.dashboard.salesAdd}?branch=${branch}` : ROUTES.dashboard.salesAdd;

  const todayUtc = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const thisMonthRange = useMemo<SalesDateRangeInput>(() => {
    const start = startOfMonthUtc(todayUtc);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const lastMonthRange = useMemo<SalesDateRangeInput>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -1);
    const end = endOfPreviousMonthUtc(firstOfThisMonth);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(end) };
  }, [todayUtc]);

  const last3MonthsRange = useMemo<SalesDateRangeInput>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -2);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const [range, setRange] = useState<SalesDateRangeInput>(thisMonthRange);
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<null | "csv" | "xlsx" | "pdf">(null);

  const rangeDays = useMemo(() => daysBetweenInclusiveUtc(range.start, range.end), [range.end, range.start]);
  const draftDays = useMemo(() => {
    if (!draftStart || !draftEnd || draftStart > draftEnd) return null;
    return daysBetweenInclusiveUtc(draftStart, draftEnd);
  }, [draftEnd, draftStart]);

  const selectedLabel = useMemo(() => {
    if (range.start === thisMonthRange.start && range.end === thisMonthRange.end) return "This Month";
    if (range.start === lastMonthRange.start && range.end === lastMonthRange.end) return "Last Month";
    if (range.start === last3MonthsRange.start && range.end === last3MonthsRange.end) return "Last 3 Months";
    return "Custom";
  }, [last3MonthsRange.end, last3MonthsRange.start, lastMonthRange.end, lastMonthRange.start, range.end, range.start, thisMonthRange.end, thisMonthRange.start]);

  const salesDashboardQuery = useSalesDashboardQuery(branch, canSales, range);
  const salesRecentQuery = useSalesRecentSalesQuery(branch, canSales);

  const salesLimit = meQuery.data?.entitlements?.limits?.salesTransactions ?? null;
  const salesUsage = meQuery.data?.usage?.salesTransactions ?? null;
  const isSalesLimitReached = salesLimit != null && salesUsage != null && salesUsage >= salesLimit;

  const downloadExport = async (format: "csv" | "xlsx" | "pdf") => {
    setExportingFormat(format);
    try {
      const params = new URLSearchParams();
      params.set("branch", branch ?? "");
      params.set("start", range.start);
      params.set("end", range.end);
      params.set("format", format);

      const res = await fetch(`/api/v1/sales/export?${params.toString()}`, { method: "GET" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Export failed.");
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/i);
      const filename = match?.[1] ?? `sales-export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExportingFormat(null);
      setExportMenuOpen(false);
    }
  };

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
      sub: `COGS ${currencyFormatter.format((metrics?.totalCogsCents ?? 0) / 100)} (${rangeDays}d)`,
      badge: `${rangeDays}d`,
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
      sub: `Total dispensed in the last ${rangeDays} days`,
      badge: `${rangeDays}d`,
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
      icon: "inventory_2",
    },
  ] as const;

  const TOP_DRUGS = salesDashboardQuery.data?.topProducts ?? [];
  const RECENT_TXS = salesRecentQuery.data?.recentSales ?? [];
  const BRANCH_DIST = salesDashboardQuery.data?.branchDistribution ?? [];
  const trend = salesDashboardQuery.data?.trend ?? [];
  const revenueSeries = trend.map((point) => point.revenueCents);
  const unitsSeries = trend.map((point) => point.unitsSold);
  const hasAnyRevenueInTrend = revenueSeries.some((value) => value > 0);
  const hasAnyUnitsInTrend = unitsSeries.some((value) => value > 0);
  const lastTrendLabel = trend.length > 0 ? trend[trend.length - 1]?.label : null;
  const lastRevenueCents = trend.length > 0 ? trend[trend.length - 1]?.revenueCents ?? 0 : 0;
  const prevRevenueCents = trend.length > 1 ? trend[trend.length - 2]?.revenueCents ?? 0 : 0;
  const revenueDayDeltaCents = lastRevenueCents - prevRevenueCents;
  const lastUnits = trend.length > 0 ? trend[trend.length - 1]?.unitsSold ?? 0 : 0;
  const prevUnits = trend.length > 1 ? trend[trend.length - 2]?.unitsSold ?? 0 : 0;
  const unitsDayDelta = lastUnits - prevUnits;
  const previousUnitsSoldLast30Days = metrics?.previousUnitsSoldLast30Days ?? 0;
  const volumeDeltaPct =
    metrics && previousUnitsSoldLast30Days > 0
      ? ((metrics.unitsSoldLast30Days - previousUnitsSoldLast30Days) / previousUnitsSoldLast30Days) * 100
      : 0;

  const content = (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Monthly Sales Performance
            </h1>
            <p className="max-w-xl text-base text-[var(--app-text-secondary)]">
              Real-time clinical intelligence and financial tracking for the current branch (selected window, compared to
              the previous period).
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isSalesLimitReached ? (
              <button
                type="button"
                disabled
                title={
                  salesLimit != null
                    ? `Monthly plan limit reached: ${salesUsage ?? 0}/${salesLimit} completed sales this UTC month. Resets at the start of the next UTC month, or upgrade to raise the cap.`
                    : "Plan limit reached. Upgrade to add more."
                }
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-base font-semibold text-white opacity-50"
              >
                <span className="material-symbols-outlined notranslate text-lg">lock</span>
                Add Sale
              </button>
            ) : (
              <Link
                href={addSaleHref}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                <span className="material-symbols-outlined notranslate text-lg">add_shopping_cart</span>
                Add Sale
              </Link>
            )}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-5 py-2.5 text-base font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
                onClick={() => setDateMenuOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={dateMenuOpen}
              >
                <span className="material-symbols-outlined notranslate text-lg">calendar_month</span>
                {selectedLabel}
              </button>

              {dateMenuOpen && (
                <div
                  role="dialog"
                  aria-label="Sales date filter"
                  className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-3 shadow-lg"
                >
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                      onClick={() => {
                        setRange(thisMonthRange);
                        setDraftStart(thisMonthRange.start);
                        setDraftEnd(thisMonthRange.end);
                        setDateMenuOpen(false);
                      }}
                    >
                      This Month (MTD)
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                      onClick={() => {
                        setRange(lastMonthRange);
                        setDraftStart(lastMonthRange.start);
                        setDraftEnd(lastMonthRange.end);
                        setDateMenuOpen(false);
                      }}
                    >
                      Last Month
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                      onClick={() => {
                        setRange(last3MonthsRange);
                        setDraftStart(last3MonthsRange.start);
                        setDraftEnd(last3MonthsRange.end);
                        setDateMenuOpen(false);
                      }}
                    >
                      Last 3 Months
                    </button>
                  </div>

                  <div className="my-3 h-px bg-[var(--app-border-ui)]" />

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          Start Date
                        </span>
                        <input
                          type="date"
                          value={draftStart}
                          onChange={(e) => setDraftStart(e.target.value)}
                          className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          End Date
                        </span>
                        <input
                          type="date"
                          value={draftEnd}
                          onChange={(e) => setDraftEnd(e.target.value)}
                          className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)]"
                        />
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-[var(--app-text-faint)]">
                        {range.start} → {range.end}
                      </div>
                      <button
                        type="button"
                        className="rounded-lg bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-3 py-2 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:opacity-50"
                        disabled={
                          !draftStart ||
                          !draftEnd ||
                          draftStart > draftEnd ||
                          (draftDays != null && draftDays > MAX_DASHBOARD_RANGE_DAYS)
                        }
                        onClick={() => {
                          const next = { start: draftStart, end: draftEnd };
                          setRange(next);
                          setDateMenuOpen(false);
                        }}
                      >
                        Apply
                      </button>
                    </div>

                    {draftDays != null && draftDays > MAX_DASHBOARD_RANGE_DAYS && (
                      <p className="text-[11px] font-medium text-[#e11d48]">
                        Please choose a range of {MAX_DASHBOARD_RANGE_DAYS} days or less.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-5 py-2.5 text-base font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-surface-muted)]"
                onClick={() => setExportMenuOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={exportMenuOpen}
              >
                <span className="material-symbols-outlined notranslate text-lg">download</span>
                Export Data
              </button>
              {exportMenuOpen && (
                <div
                  role="dialog"
                  aria-label="Export sales data"
                  className="absolute right-0 top-[calc(100%+8px)] z-20 w-[220px] rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-2 shadow-lg"
                >
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] disabled:opacity-60"
                    disabled={exportingFormat != null}
                    onClick={() => downloadExport("csv")}
                  >
                    {exportingFormat === "csv" ? "Exporting CSV..." : "Export as CSV"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] disabled:opacity-60"
                    disabled={exportingFormat != null}
                    onClick={() => downloadExport("xlsx")}
                  >
                    {exportingFormat === "xlsx" ? "Exporting Excel..." : "Export as Excel"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] disabled:opacity-60"
                    disabled={exportingFormat != null}
                    onClick={() => downloadExport("pdf")}
                  >
                    {exportingFormat === "pdf" ? "Exporting PDF..." : "Export as PDF"}
                  </button>
                  <div className="px-3 py-2 text-[11px] font-medium text-[var(--app-text-faint)]">
                    Includes line items + category summary.
                  </div>
                </div>
              )}
            </div>
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
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                    Sales Analytics Trend
                  </h2>
                  <p className="text-[11px] font-medium text-[var(--app-text-faint)]">
                    {range.start} → {range.end} · Daily
                  </p>
                </div>
                {lastTrendLabel && (
                  <span className="text-[11px] font-semibold text-[var(--app-text-faint)]">Latest: {lastTrendLabel}</span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-secondary)]">
                        Revenue ({rangeDays}d)
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                        {currencyFormatter.format((metrics?.totalRevenueCents ?? 0) / 100)}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">
                        Day change:{" "}
                        <span className="font-semibold text-[var(--app-text)]">
                          {currencyFormatter.format(revenueDayDeltaCents / 100)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        revenueDeltaPct.startsWith("-")
                          ? "bg-[#fff1f2] text-[#e11d48]"
                          : "bg-[#f0fdfa] text-[var(--app-link-teal)]"
                      }`}
                      aria-label={`Revenue change vs previous 30 days: ${revenueDeltaPct}%`}
                    >
                      {revenueDeltaPct.startsWith("-") ? "" : "+"}
                      {revenueDeltaPct}%
                    </span>
                  </div>

                  <div className="mt-3">
                    {revenueSeries.length > 0 && hasAnyRevenueInTrend ? (
                      <TrendSparkline
                        points={trend.map((p) => ({ label: p.label, value: p.revenueCents }))}
                        stroke="rgb(15, 185, 177)"
                        fill="rgb(99, 102, 241)"
                        title="Daily revenue trend, last 30 days"
                        valueFormatter={(value) => currencyFormatter.format(value / 100)}
                      />
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--app-surface-muted)] text-[11px] text-[var(--app-text-faint)]">
                        No sales yet in the last 30 days.
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--app-text-faint)]">
                    <span>Start</span>
                    <span className="font-medium text-[var(--app-text-muted)]">Daily revenue</span>
                    <span>Now</span>
                  </div>
                </article>

                <article className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-secondary)]">
                        Volume ({rangeDays}d)
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                        {(metrics?.unitsSoldLast30Days ?? 0).toLocaleString()} units
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">
                        Day change:{" "}
                        <span className="font-semibold text-[var(--app-text)]">
                          {unitsDayDelta.toLocaleString()} units
                        </span>
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        volumeDeltaPct < 0 ? "bg-[#fff1f2] text-[#e11d48]" : "bg-[#ecfeff] text-[#0891b2]"
                      }`}
                      aria-label={`Volume change vs previous 30 days: ${formatSignedPct(volumeDeltaPct)}`}
                    >
                      {formatSignedPct(volumeDeltaPct)}
                    </span>
                  </div>

                  <div className="mt-3">
                    {unitsSeries.length > 0 && hasAnyUnitsInTrend ? (
                      <TrendSparkline
                        points={trend.map((p) => ({ label: p.label, value: p.unitsSold }))}
                        stroke="rgb(59, 130, 246)"
                        fill="rgb(16, 185, 129)"
                        title="Daily volume trend, last 30 days"
                        valueFormatter={(value) => `${Math.round(value).toLocaleString()} units`}
                      />
                    ) : (
                      <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--app-surface-muted)] text-[11px] text-[var(--app-text-faint)]">
                        No sales yet in the last 30 days.
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--app-text-faint)]">
                    <span>Start</span>
                    <span className="font-medium text-[var(--app-text-muted)]">Daily units sold</span>
                    <span>Now</span>
                  </div>
                </article>
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

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="sales">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        <MissingCapabilityNotice capability="sales" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}
