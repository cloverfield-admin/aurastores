"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { BarRow, KpiCard, SkeletonCard, TabButton } from "@/components/dashboard/kpi-card";
import { AdminError, AdminSection, AdminTable } from "@/components/admin/admin-primitives";
import {
  count,
  dayLabel,
  humanize,
  money,
  moneyCompact,
  percent,
  relative,
  statusClass,
} from "@/components/admin/format";
import { useAdminGrowthQuery, useAdminOverviewQuery } from "@/lib/queries/admin";
import { ROUTES } from "@/lib/routes";

const WINDOWS = [7, 30, 90] as const;

export function AdminOverviewContent() {
  const [days, setDays] = useState<number>(30);
  const overview = useAdminOverviewQuery(days);
  // The signups sparkline reuses the growth endpoint rather than duplicating the
  // series on the overview payload.
  const growth = useAdminGrowthQuery(days);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
            Platform overview
          </h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            Every company, user and kwacha on AuraStores.
          </p>
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <TabButton key={w} active={days === w} onClick={() => setDays(w)}>
              {w}d
            </TabButton>
          ))}
        </div>
      </header>

      {overview.isError ? (
        <AdminError error={overview.error} onRetry={() => void overview.refetch()} />
      ) : overview.isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon="group"
              label="Registered users"
              value={count(overview.data.counts.users)}
              sub={`+${count(overview.data.counts.new_users_in_window)} in ${days}d · ${count(
                overview.data.counts.users_active,
              )} active`}
            />
            <KpiCard
              icon="storefront"
              label="Registered companies"
              value={count(overview.data.counts.organizations)}
              sub={`+${count(overview.data.counts.new_organizations_in_window)} in ${days}d · ${count(
                overview.data.counts.organizations_trial,
              )} on trial`}
            />
            <KpiCard
              icon="payments"
              label="MRR"
              value={moneyCompact(overview.data.revenue.mrr_cents)}
              sub={`${count(overview.data.revenue.paying_orgs)} paying · ${moneyCompact(
                overview.data.revenue.arr_cents,
              )} ARR`}
            />
            <KpiCard
              icon="shopping_cart"
              label={`GMV (${days}d)`}
              value={moneyCompact(overview.data.gmv.gmv_cents)}
              sub={`${count(overview.data.gmv.sale_count)} completed sales`}
            />

            <KpiCard
              icon="warning"
              label="MRR at risk"
              value={moneyCompact(overview.data.revenue.mrr_at_risk_cents)}
              sub="Past-due subscriptions — check Lipila collections"
              tone={overview.data.revenue.mrr_at_risk_cents > 0 ? "warn" : "default"}
            />
            <KpiCard
              icon="receipt_long"
              label="Invoice failure rate"
              value={percent(overview.data.invoices.failure_rate)}
              sub={`${count(overview.data.invoices.failed)} failed of ${count(
                overview.data.invoices.paid +
                  overview.data.invoices.failed +
                  overview.data.invoices.expired,
              )} resolved`}
              tone={overview.data.invoices.failure_rate > 0.2 ? "warn" : "default"}
            />
            <KpiCard
              icon="person_off"
              label="Disabled / suspended"
              value={count(
                overview.data.counts.users_disabled + overview.data.counts.organizations_suspended,
              )}
              sub={`${count(overview.data.counts.users_disabled)} users · ${count(
                overview.data.counts.organizations_suspended,
              )} companies`}
              tone={
                overview.data.counts.users_disabled + overview.data.counts.organizations_suspended > 0
                  ? "warn"
                  : "default"
              }
            />
            <KpiCard
              icon="delete_forever"
              label="Pending deletion"
              value={count(
                overview.data.counts.users_pending_deletion +
                  overview.data.counts.organizations_pending_deletion,
              )}
              sub={`${count(overview.data.counts.organizations_pending_deletion)} companies in the 30-day grace window`}
              tone={overview.data.counts.organizations_pending_deletion > 0 ? "warn" : "default"}
            />
          </div>

          {/* Trial expiry is lazy — an org that stopped signing in mid-trial keeps
              the `trialing` status forever. Surfacing it is the only way anyone
              would ever notice. */}
          {overview.data.expired_trials > 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-[#f0c36d] bg-[#fdf6e3] p-4 text-sm text-[#7a5b16]">
              <span aria-hidden className="material-symbols-outlined notranslate text-lg">
                hourglass_disabled
              </span>
              <p>
                <strong>{count(overview.data.expired_trials)}</strong> subscription
                {overview.data.expired_trials === 1 ? " is" : "s are"} still marked{" "}
                <code className="rounded bg-black/5 px-1">trialing</code> with a period that already
                ended. Trials only expire when that company next signs in, so these are stale rather
                than active — they are excluded from the trial counts above.
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection
              title="Signups"
              subtitle={`New users and companies per day, last ${days} days`}
            >
              {growth.isPending ? (
                <div className="h-16 animate-pulse rounded-lg bg-[var(--app-surface-muted)]" />
              ) : growth.isError ? (
                <p className="text-sm text-[var(--app-text-muted)]">Could not load the series.</p>
              ) : (
                <>
                  <Sparkline
                    points={growth.data.signups.map((p) => ({
                      label: dayLabel(p.day),
                      value: p.users,
                    }))}
                    formatPoint={(v) => `${count(v)} users`}
                    compare={{
                      label: "Companies",
                      points: growth.data.signups.map((p) => ({
                        label: dayLabel(p.day),
                        value: p.organizations,
                      })),
                      formatPoint: (v) => count(v),
                    }}
                  />
                  <div className="mt-3 flex gap-4 text-[11px] text-[var(--app-text-muted)]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded bg-[rgb(15,185,177)]" /> Users
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-[rgb(99,102,241)]" />{" "}
                      Companies
                    </span>
                  </div>
                </>
              )}
            </AdminSection>

            <AdminSection title="Plan mix" subtitle="Companies on each plan">
              <div className="space-y-4">
                {overview.data.plan_mix.length === 0 ? (
                  <p className="text-sm text-[var(--app-text-muted)]">No subscriptions yet.</p>
                ) : (
                  overview.data.plan_mix.map((row) => (
                    <BarRow
                      key={row.plan_code}
                      label={row.plan_name}
                      value={row.orgs}
                      max={Math.max(...overview.data.plan_mix.map((r) => r.orgs), 1)}
                      hint={row.trialing > 0 ? `${row.trialing} trialing` : undefined}
                    />
                  ))
                )}
              </div>
            </AdminSection>
          </div>

          <AdminSection
            title="Most active companies"
            subtitle={`Ranked by completed sales in the last ${days} days`}
          >
            <AdminTable
              rows={overview.data.most_active}
              getKey={(org) => org.id}
              empty="No companies yet."
              columns={[
                {
                  key: "company",
                  header: "Company",
                  cell: (org) => (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={ROUTES.admin.company(org.id)}
                        className="font-semibold text-[var(--app-text)] hover:text-[var(--app-link-teal)]"
                      >
                        {org.display_name}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(org.status)}`}
                      >
                        {humanize(org.status)}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "plan",
                  header: "Plan",
                  cell: (org) => (
                    <span className="text-[var(--app-text-muted)]">{humanize(org.plan_code)}</span>
                  ),
                },
                {
                  key: "sales",
                  header: "Sales",
                  align: "right",
                  cell: (org) => <span className="tabular-nums">{count(org.sales_count)}</span>,
                },
                {
                  key: "gmv",
                  header: "GMV",
                  align: "right",
                  cell: (org) => (
                    <span className="tabular-nums font-semibold">{money(org.gmv_cents)}</span>
                  ),
                },
                {
                  key: "last",
                  header: "Last sale",
                  align: "right",
                  cell: (org) => (
                    <span className="text-[var(--app-text-muted)]">{relative(org.last_sale_at)}</span>
                  ),
                },
              ]}
            />
          </AdminSection>
        </>
      )}
    </div>
  );
}
