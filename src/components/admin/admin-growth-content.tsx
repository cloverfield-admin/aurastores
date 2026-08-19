"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { BarRow, SkeletonCard, TabButton } from "@/components/ui/kpi-card";
import { AdminError, AdminSection, AdminTable } from "@/components/admin/admin-primitives";
import {
  count,
  dayLabel,
  humanize,
  moneyCompact,
  percent,
  relative,
  statusClass,
} from "@/components/admin/format";
import { useAdminGrowthQuery, type AdminOnboardingFunnel } from "@/lib/queries/admin";
import { ROUTES } from "@/lib/routes";

const WINDOWS = [30, 90, 365] as const;

const FUNNEL_STAGES: Array<{ key: keyof AdminOnboardingFunnel; label: string }> = [
  { key: "started", label: "Started onboarding" },
  { key: "reached_location", label: "Reached location details" },
  { key: "reached_license", label: "Reached license step" },
  { key: "reached_review", label: "Reached review" },
  { key: "has_branch", label: "Created a branch" },
  { key: "submitted", label: "Submitted for review" },
  { key: "approved", label: "Approved" },
  { key: "first_sale", label: "Rang up a first sale" },
];

export function AdminGrowthContent() {
  const [days, setDays] = useState<number>(90);
  const growth = useAdminGrowthQuery(days);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
            Growth
          </h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            Signups, activation, conversion and the companies going quiet.
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

      {growth.isError ? (
        <AdminError error={growth.error} onRetry={() => void growth.refetch()} />
      ) : growth.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection title="Signups" subtitle={`New users and companies, last ${days} days`}>
              <Sparkline
                points={growth.data.signups.map((p) => ({ label: dayLabel(p.day), value: p.users }))}
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
            </AdminSection>

            <AdminSection title="Sales volume" subtitle={`GMV per day, last ${days} days`}>
              <Sparkline
                points={growth.data.gmv.map((p) => ({
                  label: dayLabel(p.day),
                  value: p.gmv_cents,
                }))}
                formatPoint={(v) => moneyCompact(v)}
              />
            </AdminSection>
          </div>

          <AdminSection
            title="Onboarding funnel"
            subtitle="Where companies get to — and where they stop"
          >
            <div className="space-y-4">
              {FUNNEL_STAGES.map((stage) => (
                <BarRow
                  key={stage.key}
                  label={stage.label}
                  value={growth.data.onboarding_funnel[stage.key]}
                  max={Math.max(growth.data.onboarding_funnel.started, 1)}
                  hint={
                    growth.data.onboarding_funnel.started > 0
                      ? percent(
                          growth.data.onboarding_funnel[stage.key] /
                            growth.data.onboarding_funnel.started,
                        )
                      : undefined
                  }
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-[var(--app-text-faint)]">
              The last stage is the one that matters: a company that finishes onboarding but never
              rings up a sale has not actually activated.
            </p>
          </AdminSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSection
              title="Trial → paid"
              subtitle={`Companies that started a trial in the last ${days} days`}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Trials started" value={count(growth.data.trial_conversion.trials_started)} />
                <Stat label="Now paying" value={count(growth.data.trial_conversion.converted)} />
                <Stat
                  label="Conversion"
                  value={
                    growth.data.trial_conversion.trials_started > 0
                      ? percent(
                          growth.data.trial_conversion.converted /
                            growth.data.trial_conversion.trials_started,
                        )
                      : "—"
                  }
                />
              </div>
              <p className="mt-4 text-xs text-[var(--app-text-faint)]">
                {count(growth.data.trial_conversion.ever_paid)} of these have paid at least one
                invoice, even if they have since downgraded.
              </p>
            </AdminSection>

            {/* Deliberately "Cancellations (current)", not "churn %". There is no
                subscription history: organization_subscriptions is unique per org
                and overwritten in place, so a downgrade leaves no trace. A rate
                computed from this snapshot would be a lie, and someone would make a
                decision on it. */}
            <AdminSection
              title="Cancellations (current)"
              subtitle="A snapshot of where companies stand right now"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat label="Canceled" value={count(growth.data.cancellations.canceled)} />
                <Stat
                  label="Cancelling at period end"
                  value={count(growth.data.cancellations.pending_cancel)}
                />
                <Stat label="Suspended" value={count(growth.data.cancellations.suspended)} warn />
                <Stat
                  label="Pending deletion"
                  value={count(growth.data.cancellations.pending_deletion)}
                  warn
                />
              </div>
              <p className="mt-4 text-xs text-[var(--app-text-faint)]">
                This is a point-in-time count, not a churn rate. Subscriptions are overwritten in
                place when a plan changes, so there is no history to compute a rate over. Every
                admin-driven plan change <em>is</em> recorded in the audit log.
              </p>
            </AdminSection>
          </div>

          <AdminSection
            title="Going quiet"
            subtitle="Companies with no completed sale in 30 days — the ones about to churn"
          >
            <AdminTable
              rows={growth.data.inactive_organizations}
              getKey={(org) => org.id}
              empty="Every company has sold something in the last 30 days."
              minWidth={680}
              columns={[
                {
                  key: "company",
                  header: "Company",
                  cell: (org) => (
                    <Link
                      href={ROUTES.admin.company(org.id)}
                      className="font-semibold text-[var(--app-text)] hover:text-[var(--app-link-teal)]"
                    >
                      {org.display_name}
                    </Link>
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
                  key: "subscription",
                  header: "Subscription",
                  cell: (org) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(org.subscription_status)}`}
                    >
                      {humanize(org.subscription_status)}
                    </span>
                  ),
                },
                {
                  key: "last",
                  header: "Last sale",
                  align: "right",
                  cell: (org) => (
                    <span className="text-[var(--app-text-muted)]">
                      {org.last_sale_at ? relative(org.last_sale_at) : "Never sold"}
                    </span>
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
