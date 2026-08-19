"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { EngineApiError } from "@/lib/api/engine";
import {
  usePublicPlansQuery,
  type PublicPlan,
  type SubscriptionInterval,
  type SubscriptionPlanCode,
} from "@/lib/queries/billing";
import {
  useEngineInvoiceQuery,
  useEngineSubscriptionQuery,
  useSetCancelAtPeriodEndMutation,
  useStartLencoCheckoutMutation,
  type EngineSubscription,
} from "@/lib/queries/subscription";

/**
 * The plans this page sells. Free is where you land, not something you buy, and
 * Enterprise is negotiated rather than self-served — so neither belongs on a page
 * whose only job is to take a Lenco payment.
 */
const SELLABLE_PLANS: SubscriptionPlanCode[] = ["basic", "pro"];

/** Cheapest → richest. Mirrors billing.PlanRank in the engine; keep the two in sync. */
const PLAN_RANK: Record<SubscriptionPlanCode, number> = { free: 0, basic: 1, pro: 2, enterprise: 3 };

const CURRENCY = "ZMW";

const INTERVALS: { key: SubscriptionInterval; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

/**
 * Capability rows rendered on each plan card, in the order a store owner cares
 * about. `pay` is omitted deliberately: no plan on this page grants it (it is the
 * Aura Pay wallet and withdrawal rail, which is Enterprise-only), so a row that is
 * always a grey cross would be noise that makes Pro look worse than it is.
 */
const CAPABILITY_ROWS: { key: string; label: string }[] = [
  { key: "stock", label: "Stock & inventory" },
  { key: "sales", label: "Sales & performance" },
  { key: "catalog", label: "Product catalog & categories" },
  { key: "insights", label: "Insights & analytics" },
  { key: "staff", label: "Staff management" },
  { key: "expenses", label: "Expenses" },
];

function formatMoney(currency: string, amountCents: number) {
  const value = (amountCents / 100).toFixed(2).replace(/\.00$/, "");
  return `${currency} ${value}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function limitLabel(value: number | null | undefined) {
  return value === null || value === undefined ? "Unlimited" : String(value);
}

function intervalNoun(interval: SubscriptionInterval) {
  return interval === "monthly" ? "month" : interval === "quarterly" ? "quarter" : "year";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof EngineApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined notranslate ${className ?? ""}`} aria-hidden="true">
      {name}
    </span>
  );
}

function InlineSpinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden="true"
    />
  );
}

function StatusBadge({ status }: { status: EngineSubscription["status"] }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]";
  const styles: Record<EngineSubscription["status"], string> = {
    active: "bg-[rgba(16,185,129,0.12)] text-[#065f46]",
    trialing: "bg-[rgba(99,102,241,0.12)] text-[#3730a3]",
    pending_payment: "bg-[rgba(234,179,8,0.16)] text-[#854d0e]",
    past_due: "bg-[rgba(239,68,68,0.12)] text-[#7f1d1d]",
    canceled: "bg-[rgba(100,116,139,0.14)] text-[#334155]",
  };
  const labels: Record<EngineSubscription["status"], string> = {
    active: "Active",
    trialing: "Trial",
    pending_payment: "Payment due",
    past_due: "Past due",
    canceled: "Canceled",
  };
  return <span className={`${base} ${styles[status]}`}>{labels[status]}</span>;
}

/** Tenant-facing failure copy. Deliberately not AdminError, whose text talks about
 *  the admin console and names ENGINE_ORIGIN — internals a store owner should not
 *  be shown and could not act on. */
function SubscriptionError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-[#f2b8b5] bg-[#fdf3f3] p-5 text-sm text-[#7d2a2a]">
      <p className="font-semibold">We couldn&apos;t load your plan.</p>
      <p className="mt-1">{errorMessage(error, "Please try again in a moment.")}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-[#f2b8b5] bg-white px-3 py-1.5 text-xs font-bold text-[#7d2a2a] transition hover:bg-[#fdeaea]"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SubscriptionContent() {
  const { notify } = useAuraFeedback();
  const subscription = useEngineSubscriptionQuery();
  const plans = usePublicPlansQuery(CURRENCY);

  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanCode | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const startCheckout = useStartLencoCheckoutMutation();
  const setCancel = useSetCancelAtPeriodEndMutation();

  // The Lenco webhook activates the plan, not this page — so the invoice flipping
  // to `paid` is the only truthful signal that the upgrade landed.
  const invoice = useEngineInvoiceQuery(pendingInvoiceId, Boolean(pendingInvoiceId));

  useEffect(() => {
    if (!pendingInvoiceId || !invoice.data) return;
    if (invoice.data.status === "paid") {
      setPendingInvoiceId(null);
      void subscription.refetch();
      notify({
        variant: "success",
        title: "Payment received",
        description: `Your store is now on ${invoice.data.plan_name}.`,
      });
    } else if (invoice.data.status === "failed" || invoice.data.status === "expired") {
      setPendingInvoiceId(null);
      notify({
        variant: "error",
        title: "Payment not completed",
        description: "The mobile money payment didn't go through. You can try again.",
      });
    }
    // `subscription` and `notify` are stable enough for this effect's purpose; the
    // invoice status transition is what should drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.data, pendingInvoiceId]);

  const sellablePlans = useMemo(
    () =>
      (plans.data?.plans ?? [])
        .filter((p) => SELLABLE_PLANS.includes(p.code))
        .sort((a, b) => PLAN_RANK[a.code] - PLAN_RANK[b.code]),
    [plans.data],
  );

  const current = subscription.data ?? null;
  const currentRank = current ? PLAN_RANK[current.plan_code] : 0;

  function openCheckout(planCode: SubscriptionPlanCode) {
    setPhone("");
    setPhoneError(null);
    setCheckoutPlan(planCode);
  }

  async function submitCheckout() {
    if (!checkoutPlan) return;
    setPhoneError(null);
    try {
      const result = await startCheckout.mutateAsync({
        plan_code: checkoutPlan,
        interval,
        phone,
      });
      setCheckoutPlan(null);
      setPendingInvoiceId(result.invoice_id);
      notify({
        variant: "success",
        title: "Approve the payment on your phone",
        description: result.message,
      });
    } catch (error) {
      // The engine returns a per-field error for a bad number; show it on the input
      // rather than in a toast the customer has to read and then re-find the field.
      const fieldError = error instanceof EngineApiError ? error.fieldErrors().phone : undefined;
      if (fieldError) {
        setPhoneError(fieldError);
        return;
      }
      notify({
        variant: "error",
        title: "Couldn't start the payment",
        description: errorMessage(error, "Please try again."),
      });
    }
  }

  async function changeCancellation(cancel: boolean) {
    try {
      await setCancel.mutateAsync(cancel);
      setConfirmingCancel(false);
      notify({
        variant: "success",
        title: cancel ? "Subscription ending" : "Subscription resumed",
        description: cancel
          ? "You keep your plan until the end of the period you've paid for."
          : "You're staying on your current plan.",
      });
    } catch (error) {
      notify({
        variant: "error",
        title: cancel ? "Couldn't cancel" : "Couldn't resume",
        description: errorMessage(error, "Please try again."),
      });
    }
  }

  if (subscription.isError) {
    return (
      <PageShell>
        <SubscriptionError error={subscription.error} onRetry={() => void subscription.refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CurrentPlanCard
        subscription={current}
        loading={subscription.isLoading}
        canCancel={current?.plan_code !== "free" && current?.status !== "canceled"}
        cancelBusy={setCancel.isPending}
        confirmingCancel={confirmingCancel}
        onAskCancel={() => setConfirmingCancel(true)}
        onDismissCancel={() => setConfirmingCancel(false)}
        onConfirmCancel={() => void changeCancellation(true)}
        onResume={() => void changeCancellation(false)}
      />

      {pendingInvoiceId ? (
        <div className="flex items-center gap-3 rounded-xl border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.06)] p-4 text-sm text-[#3730a3]">
          <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[rgba(99,102,241,0.3)] border-t-[#3730a3]" />
          <p>
            Waiting for your mobile money approval. Keep this page open — your plan updates as soon
            as the payment clears.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--app-text)]">Choose a plan</h2>
            <p className="text-xs text-[var(--app-text-muted)]">
              Paid with mobile money. Prices in {CURRENCY}.
            </p>
          </div>
          <IntervalToggle value={interval} onChange={setInterval} />
        </div>

        {plans.isError ? (
          <SubscriptionError error={plans.error} onRetry={() => void plans.refetch()} />
        ) : plans.isLoading ? (
          <p className="text-sm text-[var(--app-text-muted)]">Loading plans…</p>
        ) : sellablePlans.length === 0 ? (
          <p className="text-sm text-[var(--app-text-muted)]">
            No plans are available right now. Please try again later.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sellablePlans.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                interval={interval}
                currentPlanCode={current?.plan_code ?? null}
                currentRank={currentRank}
                scheduledPlanCode={current?.scheduled_plan_code ?? null}
                busy={startCheckout.isPending || Boolean(pendingInvoiceId)}
                onUpgrade={() => openCheckout(plan.code)}
                onDowngrade={() => openCheckout(plan.code)}
              />
            ))}
          </div>
        )}
      </div>

      {checkoutPlan ? (
        <CheckoutModal
          planName={sellablePlans.find((p) => p.code === checkoutPlan)?.name ?? checkoutPlan}
          amountLabel={priceLabel(sellablePlans.find((p) => p.code === checkoutPlan), interval)}
          interval={interval}
          phone={phone}
          phoneError={phoneError}
          busy={startCheckout.isPending}
          onPhoneChange={(v) => {
            setPhone(v);
            setPhoneError(null);
          }}
          onConfirm={() => void submitCheckout()}
          onCancel={() => setCheckoutPlan(null)}
        />
      ) : null}

    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-[var(--app-text)] sm:text-2xl">Subscription</h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          Manage your AuraStores plan and payments.
        </p>
      </header>
      {children}
    </main>
  );
}

function priceLabel(plan: PublicPlan | undefined, interval: SubscriptionInterval) {
  const price = plan?.prices?.[interval];
  if (!price) return null;
  return formatMoney(price.currency, price.amountCents);
}

function IntervalToggle({
  value,
  onChange,
}: {
  value: SubscriptionInterval;
  onChange: (v: SubscriptionInterval) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="inline-flex rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface-subtle)] p-1"
    >
      {INTERVALS.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
              active
                ? "bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm"
                : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function CurrentPlanCard({
  subscription,
  loading,
  canCancel,
  cancelBusy,
  confirmingCancel,
  onAskCancel,
  onDismissCancel,
  onConfirmCancel,
  onResume,
}: {
  subscription: EngineSubscription | null;
  loading: boolean;
  canCancel: boolean;
  cancelBusy: boolean;
  confirmingCancel: boolean;
  onAskCancel: () => void;
  onDismissCancel: () => void;
  onConfirmCancel: () => void;
  onResume: () => void;
}) {
  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-6">
        <p className="text-sm text-[var(--app-text-muted)]">Loading your plan…</p>
      </section>
    );
  }

  if (!subscription) {
    return (
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-bold text-[var(--app-text)]">No plan yet</h2>
        <p className="mt-1 text-sm text-[var(--app-text-muted)]">
          Choose a plan below to get started.
        </p>
      </section>
    );
  }

  const periodEnd = formatDate(subscription.current_period_end);

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
            Current plan
          </p>
          <h2 className="text-lg font-bold text-[var(--app-text)]">{subscription.plan_name}</h2>
          <p className="text-xs text-[var(--app-text-muted)]">
            Billed {subscription.interval}
            {periodEnd ? ` · renews ${periodEnd}` : ""}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>

      {/* A scheduled plan change only ever comes from the App Store or Play
          Store now (a PRODUCT_CHANGE the store applies at its own renewal), so
          it is reported here and undone where it was made. */}
      {subscription.scheduled_plan_code ? (
        <div className="mt-4 rounded-lg border border-[rgba(234,179,8,0.35)] bg-[rgba(234,179,8,0.08)] p-3">
          <p className="text-xs text-[#854d0e]">
            Scheduled to move to <strong>{subscription.scheduled_plan_code}</strong>
            {periodEnd ? ` on ${periodEnd}` : " at the end of this period"}. You keep{" "}
            {subscription.plan_name} until then. Manage this where you bought it.
          </p>
        </div>
      ) : null}

      {subscription.cancel_at_period_end ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(234,179,8,0.35)] bg-[rgba(234,179,8,0.08)] p-3">
          <p className="text-xs text-[#854d0e]">
            Your plan ends{periodEnd ? ` on ${periodEnd}` : " at the end of this period"} and this
            organization moves to Free. Nothing changes before then.
          </p>
          {canCancel ? (
            <button
              type="button"
              onClick={onResume}
              disabled={cancelBusy}
              className="shrink-0 rounded-lg border border-[rgba(234,179,8,0.5)] bg-white px-3 py-1.5 text-xs font-bold text-[#854d0e] transition hover:bg-[#fffbeb] disabled:opacity-60"
            >
              {cancelBusy ? "Resuming…" : "Resume subscription"}
            </button>
          ) : null}
        </div>
      ) : canCancel ? (
        <div className="mt-4">
          {confirmingCancel ? (
            <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-subtle)] p-3">
              <p className="text-xs text-[var(--app-text-muted)]">
                You keep {subscription.plan_name}
                {periodEnd ? ` until ${periodEnd}` : " until the end of this period"}, then this
                organization moves to Free across every branch. You can undo this any time before
                then.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onConfirmCancel}
                  disabled={cancelBusy}
                  className="rounded-lg border border-[var(--app-border-ui)] px-3 py-1.5 text-xs font-bold text-[var(--app-text)] transition hover:bg-[var(--app-surface)] disabled:opacity-60"
                >
                  {cancelBusy ? "Cancelling…" : "Yes, cancel at period end"}
                </button>
                <button
                  type="button"
                  onClick={onDismissCancel}
                  className="rounded-lg bg-[var(--app-brand)] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Keep my plan
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAskCancel}
              className="text-xs font-semibold text-[var(--app-text-muted)] underline underline-offset-2"
            >
              Cancel subscription
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function PlanCard({
  plan,
  interval,
  currentPlanCode,
  currentRank,
  scheduledPlanCode,
  busy,
  onUpgrade,
  onDowngrade,
}: {
  plan: PublicPlan;
  interval: SubscriptionInterval;
  currentPlanCode: SubscriptionPlanCode | null;
  currentRank: number;
  scheduledPlanCode: SubscriptionPlanCode | null;
  busy: boolean;
  onUpgrade: () => void;
  onDowngrade: () => void;
}) {
  const price = plan.prices?.[interval];
  const isCurrent = plan.code === currentPlanCode;
  const isScheduled = plan.code === scheduledPlanCode;
  const rank = PLAN_RANK[plan.code];
  const isDowngrade = rank < currentRank;
  const capabilities = plan.features?.capabilities ?? {};
  const limits = plan.features?.limits;

  return (
    <section
      className={`flex flex-col rounded-xl border bg-[var(--app-surface)] p-5 shadow-sm ${
        isCurrent ? "border-[var(--app-brand)]" : "border-[var(--app-border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-[var(--app-text)]">{plan.name}</h3>
        {isCurrent ? (
          <span className="rounded-full bg-[rgba(0,106,101,0.12)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-brand)]">
            Current
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-2xl font-bold text-[var(--app-text)]">
        {price ? formatMoney(price.currency, price.amountCents) : "—"}
        {price ? (
          <span className="ml-1 text-sm font-medium text-[var(--app-text-muted)]">
            /{intervalNoun(interval)}
          </span>
        ) : null}
      </p>
      {!price ? (
        <p className="mt-1 text-xs text-[var(--app-text-muted)]">
          Not available on a {intervalNoun(interval)}ly cycle.
        </p>
      ) : null}

      <ul className="mt-5 flex flex-col gap-2">
        {CAPABILITY_ROWS.map((row) => {
          const included = Boolean((capabilities as Record<string, boolean>)[row.key]);
          return (
            <li key={row.key} className="flex items-center gap-2 text-sm">
              <Icon
                name={included ? "check_circle" : "cancel"}
                className={`text-[18px] ${
                  included ? "text-[var(--app-brand)]" : "text-[var(--app-text-faint)]"
                }`}
              />
              <span className={included ? "text-[var(--app-text)]" : "text-[var(--app-text-faint)]"}>
                {row.label}
              </span>
            </li>
          );
        })}
      </ul>

      {limits ? (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[var(--app-border-ui-soft)] pt-4 text-xs">
          <LimitRow label="Products" value={limitLabel(limits.products)} />
          <LimitRow label="Branches" value={limitLabel(limits.branches)} />
          <LimitRow label="Staff" value={limitLabel(limits.staffUsers)} />
          <LimitRow label="Sales / month" value={limitLabel(limits.salesTransactions)} />
        </dl>
      ) : null}

      <div className="mt-6">
        {isCurrent ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text-muted)]"
          >
            Your current plan
          </button>
        ) : isScheduled ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text-muted)]"
          >
            Scheduled
          </button>
        ) : isDowngrade ? (
          <button
            type="button"
            onClick={onDowngrade}
            disabled={busy}
            className="w-full rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            Switch to {plan.name}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            disabled={busy || !price}
            className="w-full rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Upgrade to {plan.name}
          </button>
        )}
      </div>
    </section>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[var(--app-text-muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--app-text)]">{value}</dd>
    </div>
  );
}

function Modal({
  title,
  children,
  labelledBy,
}: {
  title: string;
  children: React.ReactNode;
  labelledBy: string;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl"
      >
        <h2 id={labelledBy} className="text-base font-bold text-[var(--app-text)]">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function CheckoutModal({
  planName,
  amountLabel,
  interval,
  phone,
  phoneError,
  busy,
  onPhoneChange,
  onConfirm,
  onCancel,
}: {
  planName: string;
  amountLabel: string | null;
  interval: SubscriptionInterval;
  phone: string;
  phoneError: string | null;
  busy: boolean;
  onPhoneChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={`Upgrade to ${planName}`} labelledBy="checkout-title">
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        {amountLabel ? `${amountLabel} per ${intervalNoun(interval)}.` : ""} We&apos;ll send a mobile
        money prompt to your phone.
      </p>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <label htmlFor="lenco-phone" className="mb-1.5 block text-xs font-bold text-[var(--app-text)]">
          Mobile money number
        </label>
        <input
          id="lenco-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0971234567"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={busy}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? "lenco-phone-error" : undefined}
          className={`w-full rounded-lg border bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none transition focus:border-[var(--app-brand)] ${
            phoneError ? "border-[#f2b8b5]" : "border-[var(--app-border-ui)]"
          }`}
          required
        />
        {phoneError ? (
          <p id="lenco-phone-error" className="mt-1.5 text-xs font-medium text-[#7d2a2a]">
            {phoneError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-[var(--app-text-faint)]">
            Airtel, MTN or Zamtel. The number pays the mobile money fee.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <InlineSpinner /> : null}
            {busy ? "Sending prompt…" : "Send payment prompt"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

