"use client";

import { useState } from "react";
import { AdminSection } from "@/components/admin/admin-primitives";
import { date, humanize, relative, statusClass } from "@/components/admin/format";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { EngineApiError } from "@/lib/api/engine";
import {
  useAdminSubscriptionMutation,
  type AdminOrgSubscription,
  type AdminSubscriptionCommand,
} from "@/lib/queries/admin";

const PAID_PLANS = ["basic", "pro", "enterprise"];
const ALL_PLANS = ["free", ...PAID_PLANS];
const INTERVALS = ["monthly", "quarterly", "yearly"];

export function AdminSubscriptionPanel({
  orgId,
  subscription,
}: {
  orgId: string;
  subscription: AdminOrgSubscription | null;
}) {
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const mutate = useAdminSubscriptionMutation();
  const busy = isLoading("admin:subscription");

  const [planCode, setPlanCode] = useState(subscription?.plan_code ?? "pro");
  const [interval, setInterval] = useState(subscription?.interval ?? "monthly");
  const [trialPlan, setTrialPlan] = useState("pro");
  const [trialDays, setTrialDays] = useState(7);
  const [extendDays, setExtendDays] = useState(7);

  // A trial that expired but was never demoted — trials only reconcile when the
  // company next signs in, so a store that walked away mid-trial keeps the status
  // indefinitely, and the admin is usually here BECAUSE of it.
  //
  // The ENGINE decides this, not the browser: "has it expired" is a server fact,
  // and deriving it here would mean reading the clock during a render.
  const staleTrial = subscription?.trial_expired ?? false;

  async function run(label: string, command: AdminSubscriptionCommand) {
    try {
      await withLoading("admin:subscription", `${label}…`, () =>
        mutate.mutateAsync({ orgId, command }),
      );
      notify({ variant: "success", title: label, description: "Recorded in the audit log." });
    } catch (error) {
      notify({
        variant: "error",
        title: `${label} failed`,
        description:
          error instanceof EngineApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unknown error.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <AdminSection title="Current plan" subtitle="Shown exactly as stored, with no reconciliation">
        {!subscription ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            This company has no subscription row and runs on the free-plan fallback. Setting a plan
            below creates one.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Plan" value={subscription.plan_name} />
            <Fact label="Interval" value={humanize(subscription.interval)} />
            <Fact
              label="Status"
              value={
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(subscription.status)}`}
                >
                  {humanize(subscription.status)}
                </span>
              }
            />
            <Fact
              label="Renews / ends"
              value={
                subscription.current_period_end
                  ? `${date(subscription.current_period_end)} (${relative(subscription.current_period_end)})`
                  : "Open-ended"
              }
            />
          </div>
        )}

        {staleTrial ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#f0c36d] bg-[#fdf6e3] p-4 text-sm text-[#7a5b16]">
            <span aria-hidden className="material-symbols-outlined notranslate text-lg">
              hourglass_disabled
            </span>
            <p>
              This trial ended {relative(subscription!.current_period_end)} but the subscription still
              says <strong>trialing</strong>. Trials are only reconciled to the free plan when the
              company next signs in, so this one is stale rather than active. Set a plan below to fix
              it.
            </p>
          </div>
        ) : null}

        {subscription?.cancel_at_period_end ? (
          <p className="mt-4 rounded-lg bg-[var(--app-surface-subtle)] p-3 text-xs text-[var(--app-text-muted)]">
            This subscription is set to cancel at the end of the current period.
          </p>
        ) : null}

        {subscription?.intro_trial_used ? (
          <p className="mt-4 text-xs text-[var(--app-text-faint)]">
            This company used its one-time intro trial on{" "}
            {date(subscription.intro_trial_started_at)}. Granting a new trial below resets that, so
            they become eligible for the self-service intro trial again.
          </p>
        ) : null}
      </AdminSection>

      <AdminSection
        title="Set a plan"
        subtitle="Puts the company on this plan immediately, with no invoice and no end date — a comp"
      >
        <div className="flex flex-wrap items-end gap-3">
          <Labelled label="Plan">
            <Select value={planCode} onChange={setPlanCode} options={ALL_PLANS} />
          </Labelled>
          <Labelled label="Interval">
            <Select value={interval} onChange={setInterval} options={INTERVALS} />
          </Labelled>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("Set plan", { action: "set_plan", plan_code: planCode, interval })
            }
            className="rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Set plan
          </button>
        </div>
      </AdminSection>

      <AdminSection
        title="Trials"
        subtitle="Grant a fresh trial, or extend the one they're on"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Labelled label="Trial plan">
              <Select value={trialPlan} onChange={setTrialPlan} options={PAID_PLANS} />
            </Labelled>
            <Labelled label="Days">
              <NumberInput value={trialDays} onChange={setTrialDays} />
            </Labelled>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run("Grant trial", {
                  action: "grant_trial",
                  plan_code: trialPlan,
                  days: trialDays,
                })
              }
              className="rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Grant trial
            </button>
            <p className="w-full text-[11px] text-[var(--app-text-faint)]">
              A trial must be on a paid plan — free is what a trial expires <em>into</em>. Granting
              one also clears their one-time intro-trial flag, so their own billing page will offer
              it again.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t border-[var(--app-border-ui)] pt-4">
            <Labelled label="Extend by (days)">
              <NumberInput value={extendDays} onChange={setExtendDays} />
            </Labelled>
            <button
              type="button"
              disabled={busy || !subscription}
              onClick={() => void run("Extend period", { action: "extend_trial", days: extendDays })}
              className="rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
            >
              Extend current period
            </button>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Cancel" subtitle="End the subscription, now or at the period end">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !subscription}
            onClick={() => void run("Schedule cancellation", { action: "cancel", at_period_end: true })}
            className="rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            Cancel at period end
          </button>
          <button
            type="button"
            disabled={busy || !subscription}
            onClick={() => void run("Cancel now", { action: "cancel", at_period_end: false })}
            className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Cancel immediately
          </button>
        </div>
      </AdminSection>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">{value}</div>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {humanize(o)}
        </option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      value={value}
      inputMode="numeric"
      onChange={(e) => onChange(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
      className="w-24 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none"
    />
  );
}
