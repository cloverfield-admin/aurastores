"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardDateRangeMenu } from "@/components/dashboard/dashboard-date-range-menu";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { inclusiveUtcDayCount } from "@/lib/dates/dashboard-range-window";
import type { DashboardDateRangeValue } from "@/lib/dashboard/dashboard-date-range-value";
import { useNetworkDashboardQuery } from "@/lib/queries/network";
import { ROUTES } from "@/lib/routes";
import { hasCapability } from "@/lib/rbac/capabilities";
import { DASHBOARD_ASSETS } from "./dashboard-assets";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const MAP_CYCLE = [
  DASHBOARD_ASSETS.mapMain,
  DASHBOARD_ASSETS.mapEast,
  DASHBOARD_ASSETS.mapWarehouse,
] as const;

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function NetworkOverviewContent() {
  const { withLoading, notify } = useAuraFeedback();
  const workspace = useDashboardWorkspaceAccess();
  const canInsights = hasCapability(workspace.capabilities, "insights");
  const locked = !canInsights;
  const [range, setRange] = useState<DashboardDateRangeValue>(() => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { start: toIsoDateUtc(monthStart), end: toIsoDateUtc(today) };
  });
  const rangeDays = useMemo(
    () =>
      inclusiveUtcDayCount(
        new Date(`${range.start}T00:00:00.000Z`),
        new Date(`${range.end}T00:00:00.000Z`),
      ),
    [range.end, range.start],
  );
  const networkQuery = useNetworkDashboardQuery({ enabled: canInsights, range });
  const data = networkQuery.data;
  const totals = data?.totals;
  const revenueDeltaRaw =
    totals && totals.previousRevenueCents30d > 0
      ? ((totals.totalRevenueCents30d - totals.previousRevenueCents30d) / totals.previousRevenueCents30d) * 100
      : null;
  const revenueDeltaPct =
    revenueDeltaRaw !== null && Number.isFinite(revenueDeltaRaw) ? revenueDeltaRaw.toFixed(1) : null;
  const revenueProgressPct =
    totals && totals.previousRevenueCents30d > 0
      ? Math.min(100, Math.round((totals.totalRevenueCents30d / totals.previousRevenueCents30d) * 40))
      : totals && totals.totalRevenueCents30d > 0
        ? 60
        : 0;

  const staffExtra =
    totals && data
      ? Math.max(0, totals.activeStaffCount - data.staffPreviewNames.length)
      : 0;

  const content = (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl sm:tracking-[-0.025em]">
              Network Overview
            </h1>
            {/* <p className="max-w-xl text-base leading-relaxed text-[var(--app-text-secondary)]">
              Revenue, margin, and sell-through for the selected period (UTC), compared to the prior period of the same
              length. Stock health reflects current on-hand batches.
            </p> */}
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-end lg:w-auto lg:shrink-0">
            <DashboardDateRangeMenu
              range={range}
              onRangeChange={setRange}
              dialogLabel="Network overview date range"
            />
            <Link
              href={ROUTES.dashboard.organizationBranches.new}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(99,102,241,0.2),0_4px_6px_-4px_rgba(99,102,241,0.2)] transition hover:opacity-95"
            >
              <span className="material-symbols-outlined notranslate text-[22px]">add</span>
              Add New Branch
            </Link>
          </div>
        </div>

        {networkQuery.isError ? (
          networkQuery.error instanceof Error && networkQuery.error.message === "Forbidden" ? (
            <MissingCapabilityNotice capability="insights" />
          ) : (
            <p className="text-sm text-red-600">Could not load network metrics. Try again in a moment.</p>
          )
        ) : null}

        {/* KPI row */}
        <div className="grid gap-6 md:grid-cols-4">
          <article className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex size-[42px] items-center justify-center rounded-xl bg-[rgba(96,99,238,0.08)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#6063ee]">
                  payments
                </span>
              </div>
              {revenueDeltaPct !== null ? (
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    revenueDeltaPct.startsWith("-")
                      ? "bg-[#fff1f2] text-[#e11d48]"
                      : "bg-[rgba(96,99,238,0.1)] text-[#6063ee]"
                  }`}
                >
                  {revenueDeltaPct.startsWith("-") ? "" : "+"}
                  {revenueDeltaPct}% vs prior {rangeDays}d
                </span>
              ) : (
                <span className="rounded-full bg-[rgba(96,99,238,0.1)] px-2 py-1 text-xs text-[#6063ee]">
                  All branches
                </span>
              )}
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
              Network Revenue
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[var(--app-text)]">
              {networkQuery.isPending || !totals ? "—" : money.format(totals.totalRevenueCents30d / 100)}
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e6e8ea]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${networkQuery.isPending ? 0 : revenueProgressPct}%`,
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              />
            </div>
          </article>

          <article className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex size-[42px] items-center justify-center rounded-xl bg-[rgba(13,148,136,0.08)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[var(--app-link-teal)]">
                  trending_up
                </span>
              </div>
              <span className="rounded-full bg-[rgba(15,185,177,0.12)] px-2 py-1 text-xs text-[var(--app-link-teal)]">
                {rangeDays}d
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
              Network Gross Profit
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[var(--app-text)]">
              {networkQuery.isPending || !totals ? "—" : money.format(totals.totalGrossProfitCents30d / 100)}
            </p>
            <p className="mt-2 text-xs text-[var(--app-text-muted)]">
              COGS {networkQuery.isPending || !totals ? "—" : money.format(totals.totalCogsCents30d / 100)} • Expenses{" "}
              {networkQuery.isPending || !totals ? "—" : money.format(totals.totalExpensesCents30d / 100)}
            </p>
          </article>

          <article className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex size-[42px] items-center justify-center rounded-xl bg-[rgba(186,26,26,0.06)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#ba1a1a]">
                  inventory_2
                </span>
              </div>
              <span className="rounded-full bg-[rgba(255,218,214,0.2)] px-2 py-1 text-xs text-[#ba1a1a]">
                {networkQuery.isPending || !totals ? "—" : `${totals.totalLowStockSkuCount} low-stock SKUs`}
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
              Stock integrity (avg)
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[var(--app-text)]">
              {networkQuery.isPending || !totals ? "—" : `${totals.healthyBatchRatioAvg}%`}
            </p>
            <div className="mt-4 flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    totals && i < Math.round(totals.healthyBatchRatioAvg / 25)
                      ? "bg-[#0fb9b1]"
                      : "bg-[rgba(15,185,177,0.2)]"
                  }`}
                />
              ))}
            </div>
          </article>

          <article className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-12 items-center justify-center rounded-xl bg-[rgba(0,106,101,0.08)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[var(--app-brand)]">
                  groups
                </span>
              </div>
              <span className="rounded-full bg-[rgba(0,106,101,0.1)] px-2 py-1 text-xs text-[var(--app-brand)]">
                {networkQuery.isPending || !totals ? "—" : `${totals.activeStaffCount} active`}
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
              Staff deployment
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[var(--app-text)]">
              {networkQuery.isPending || !totals
                ? "—"
                : `${totals.activeStaffCount} / ${totals.totalStaffCount}`}
            </p>
            <div className="mt-4 flex -space-x-2">
              {(data?.staffPreviewNames ?? []).map((name) => (
                <AuraAvatar
                  key={name}
                  name={name}
                  decorative
                  className="size-8 shrink-0 rounded-full border-2 border-white text-[10px]"
                />
              ))}
              {staffExtra > 0 ? (
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#e6e8ea] text-[10px] font-semibold text-[var(--app-text)]">
                  +{staffExtra}
                </div>
              ) : null}
            </div>
          </article>
        </div>

        {/* Branch cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {networkQuery.isPending ? (
            <p className="text-sm text-[var(--app-text-muted)] lg:col-span-3">Loading branches…</p>
          ) : networkQuery.isError ? (
            <p className="text-sm text-[var(--app-text-muted)] lg:col-span-3">
              Branch cards could not be loaded. Check the message above and try again.
            </p>
          ) : !data || data.branches.length === 0 ? (
            <p className="text-sm text-[var(--app-text-muted)] lg:col-span-3">
              No branches yet. Use{" "}
              <Link href={ROUTES.dashboard.organizationBranches.new} className="font-semibold text-[var(--app-link-teal)] underline">
                branch setup
              </Link>{" "}
              to add your first location.
            </p>
          ) : (
            data.branches.map((b, index) => (
              <BranchLocationCard
                key={b.id}
                href={ROUTES.dashboard.organizationBranches.detail(b.id)}
                name={b.name}
                mapPriority={index === 0}
                mapSrc={MAP_CYCLE[index % MAP_CYCLE.length]!}
                status={b.branchStatus === "inactive" ? "offline" : "online"}
                onManageLogistics={withLoading}
                notify={notify}
                rows={[
                  {
                    label: `Sales (${rangeDays}d)`,
                    value: money.format(b.revenueCents30d / 100),
                  },
                  {
                    label: "Lead staff",
                    value: b.leadStaffName ?? "—",
                  },
                  {
                    label: `Units sold (${rangeDays}d)`,
                    value: b.unitsSold30d.toLocaleString(),
                    valueTone: "teal" as const,
                  },
                ]}
              />
            ))
          )}
        </div>

        {/* Activity stream */}
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-input-bg)] p-6 sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-[var(--app-text)]">
              Network Activity Stream
            </h2>
            <button
              type="button"
              className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
              aria-label="Filter activity"
            >
              <span className="material-symbols-outlined notranslate text-lg">filter_list</span>
            </button>
          </div>

          <div className="relative pl-8">
            <div
              className="absolute bottom-2 left-[15px] top-2 w-0.5 rounded-full bg-gradient-to-b from-[#0fb9b1] via-[#6366f1] to-[#cbd5e1] opacity-30"
              aria-hidden
            />
            <p className="py-4 text-sm leading-relaxed text-[var(--app-text-muted)]">
              No recent network events yet. Inventory and sales activity will appear here when an
              activity feed is connected.
            </p>
          </div>
        </section>

        {/* Footer strip */}
        <footer className="flex flex-col gap-4 border-t border-[var(--app-surface-subtle)] pt-6 text-[11px] uppercase tracking-[0.1em] text-[var(--app-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-[#cbd5e1]">AuraStores v1.0.0</span>
            <div className="flex flex-wrap gap-4">
              <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[var(--app-text-muted)]">
                Privacy Policy
              </Link>
              <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[var(--app-text-muted)]">
                System Status
              </Link>
            </div>
          </div>
          <p className="text-right sm:text-left">
            © {new Date().getFullYear()} AuraStores
          </p>
        </footer>
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

type BranchRow = {
  label?: string;
  labelLines?: string[];
  value?: string;
  valueLines?: string[];
  valueTone?: "teal" | "indigo";
};

function BranchLocationCard({
  href,
  name,
  mapPriority,
  mapSrc,
  status,
  onManageLogistics,
  notify,
  rows,
}: {
  href: string;
  name: string;
  /** First visible map is typically LCP; load eagerly. */
  mapPriority?: boolean;
  mapSrc: string;
  status: "online" | "offline";
  onManageLogistics: (key: string, message: string, task: () => Promise<unknown>) => Promise<unknown>;
  notify: (input: {
    variant?: "success" | "error" | "info" | "warning";
    title: string;
    description?: string;
  }) => void;
  rows: BranchRow[];
}) {
  const online = status === "online";
  return (
    <Link
      href={href}
      className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-link-teal)]"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm transition hover:border-[var(--app-link-teal)]/30 hover:shadow-md">
      <div className="relative h-32 overflow-hidden bg-[var(--app-surface-subtle)]">
        <Image
          src={mapSrc}
          alt=""
          fill
          className="object-cover object-[center_35%]"
          loading={mapPriority ? "eager" : undefined}
          priority={mapPriority}
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
          }}
        />
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--app-surface)]/90 px-2 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm">
            <span
              className={`size-1.5 rounded-full ${online ? "bg-[var(--app-brand)]" : "bg-[#94a3b8]"}`}
            />
            <span className={online ? "text-[var(--app-brand)]" : "text-[var(--app-text-secondary)]"}>
              {online ? "ONLINE" : "OFFLINE (Syncing)"}
            </span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
            {name}
          </h3>
          <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-muted)]">
            open_in_new
          </span>
        </div>
        <dl className="space-y-3 text-base">
          {rows.map((row, i) => {
            const key = `${row.label ?? row.labelLines?.join()}-${i}`;
            const dt =
              row.labelLines?.length ? (
                <>
                  {row.labelLines.map((line, j) => (
                    <span key={j} className="block leading-snug">
                      {line}
                    </span>
                  ))}
                </>
              ) : (
                row.label
              );
            const ddClass =
              row.valueTone === "teal"
                ? "text-[var(--app-brand)]"
                : row.valueTone === "indigo"
                  ? "text-[#4648d4]"
                  : "text-[var(--app-text)]";
            const dd =
              row.valueLines?.length ? (
                <>
                  {row.valueLines.map((line, j) => (
                    <span key={j} className="block leading-snug">
                      {line}
                    </span>
                  ))}
                </>
              ) : (
                row.value
              );
            return (
              <div key={key} className="flex items-start justify-between gap-4">
                <dt className="text-[var(--app-text-secondary)]">{dt}</dt>
                <dd className={`text-right font-semibold ${ddClass}`}>{dd}</dd>
              </div>
            );
          })}
        </dl>
        {/* <button
          type="button"
          onClick={async () => {
            await onManageLogistics(
              `dashboard-manage-logistics-${name.toLowerCase().replace(/\s/g, "-")}`,
              `Loading logistics for ${name}...`,
              async () => {
                // TODO: implement logistics management
                await new Promise((r) => setTimeout(r, 500));
                notify({
                  variant: "info",
                  title: "Manage Logistics",
                  description: `Logistics view for ${name} coming soon.`,
                });
              },
            );
          }}
          className="mt-auto w-full rounded-lg bg-[var(--app-input-bg)] py-2 text-center text-base font-semibold text-[var(--app-brand)] transition hover:bg-[var(--app-input-focus-bg)]"
        >
          Manage Logistics
        </button> */}
      </div>
      </article>
    </Link>
  );
}
