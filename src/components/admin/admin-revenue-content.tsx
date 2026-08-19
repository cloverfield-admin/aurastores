"use client";

import { useState } from "react";
import { BarRow, KpiCard, SkeletonCard, TabButton } from "@/components/ui/kpi-card";
import { AdminError, AdminSection } from "@/components/admin/admin-primitives";
import { count, humanize, money, moneyCompact, percent } from "@/components/admin/format";
import { useAdminOverviewQuery } from "@/lib/queries/admin";

const WINDOWS = [30, 90, 365] as const;

export function AdminRevenueContent() {
  const [days, setDays] = useState<number>(30);
  const overview = useAdminOverviewQuery(days);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
            Revenue
          </h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            Subscription revenue, normalised to a monthly figure across every billing interval.
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
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon="payments"
              label="MRR"
              value={moneyCompact(overview.data.revenue.mrr_cents)}
              sub="Quarterly and yearly plans normalised to a monthly figure"
            />
            <KpiCard
              icon="savings"
              label="ARR"
              value={moneyCompact(overview.data.revenue.arr_cents)}
              sub="MRR × 12"
            />
            <KpiCard
              icon="warning"
              label="MRR at risk"
              value={moneyCompact(overview.data.revenue.mrr_at_risk_cents)}
              sub="Past-due subscriptions"
              tone={overview.data.revenue.mrr_at_risk_cents > 0 ? "warn" : "default"}
            />
            <KpiCard
              icon="verified"
              label="Paying companies"
              value={count(overview.data.revenue.paying_orgs)}
              sub="On a paid plan, active or past-due"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection title="Plan mix" subtitle="Companies on each plan">
              <div className="space-y-4">
                {overview.data.plan_mix.map((row) => (
                  <BarRow
                    key={row.plan_code}
                    label={row.plan_name}
                    value={row.orgs}
                    max={Math.max(...overview.data.plan_mix.map((r) => r.orgs), 1)}
                    hint={row.trialing > 0 ? `${row.trialing} trialing` : undefined}
                  />
                ))}
              </div>
            </AdminSection>

            <AdminSection title="Subscription status" subtitle="Where every subscription stands">
              <div className="space-y-4">
                {overview.data.subscription_status.map((row) => (
                  <BarRow
                    key={row.status}
                    label={humanize(row.status)}
                    value={row.orgs}
                    max={Math.max(...overview.data.subscription_status.map((r) => r.orgs), 1)}
                  />
                ))}
              </div>
            </AdminSection>
          </div>

          <AdminSection
            title="Invoice health"
            subtitle={`Subscription invoices raised in the last ${days} days`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Paid" value={count(overview.data.invoices.paid)} />
              <Stat label="Failed" value={count(overview.data.invoices.failed)} warn />
              <Stat label="Expired" value={count(overview.data.invoices.expired)} />
              <Stat label="Pending" value={count(overview.data.invoices.pending)} />
              <Stat
                label="Failure rate"
                value={percent(overview.data.invoices.failure_rate)}
                warn={overview.data.invoices.failure_rate > 0.2}
              />
            </div>
            {/* Stating the denominator matters: a rate that counted pending invoices
                as successes would drift toward zero purely as volume grew. */}
            <p className="mt-4 text-xs text-[var(--app-text-faint)]">
              The failure rate is failed ÷ (paid + failed + expired). Invoices still pending are not
              counted either way — they haven&apos;t succeeded or failed yet.
            </p>
          </AdminSection>

          {overview.data.expired_trials > 0 ? (
            <AdminSection title="Stale trials" subtitle="Trials that expired but were never demoted">
              <p className="text-sm text-[var(--app-text-muted)]">
                <strong className="text-[var(--app-text)]">
                  {count(overview.data.expired_trials)}
                </strong>{" "}
                subscription{overview.data.expired_trials === 1 ? "" : "s"} still carry the{" "}
                <code className="rounded bg-[var(--app-surface-subtle)] px-1">trialing</code> status
                with a period that has already ended. A trial is only reconciled to the free plan
                when that company next signs in, so a company that walked away mid-trial keeps the
                status indefinitely. These are excluded from the trialing counts and from MRR.
              </p>
            </AdminSection>
          ) : null}

          <p className="text-xs text-[var(--app-text-faint)]">
            MRR counts paid plans in an <strong>active</strong> or <strong>past-due</strong> state,
            excluding suspended, archived and pending-deletion companies. A trial has not paid, so it
            is not revenue. All figures are ZMW ({money(overview.data.revenue.mrr_cents)} exact).
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold ${
          warn ? "text-[#7d2a2a]" : "text-[var(--app-text)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
