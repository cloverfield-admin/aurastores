"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  type PayDateRangeInput,
  type PayPaymentMethod,
  useActivatePayWalletMutation,
  useDeletePayTransactionMutation,
  usePayDashboardQuery,
  useWithdrawPayWalletMutation,
} from "@/lib/queries/pay";
import { calculateDisbursementFee } from "@/lib/lipila/fees";
import { hasCapability } from "@/lib/rbac/capabilities";
import { ROUTES } from "@/lib/routes";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const paymentMethodOptions: Array<{ value: PayPaymentMethod | "all"; label: string; icon: string }> = [
  { value: "all", label: "All methods", icon: "filter_list" },
  { value: "card", label: "Card", icon: "credit_card" },
  { value: "mobile_money", label: "Mobile money", icon: "phone_iphone" },
  { value: "aura_pay_wallet", label: "Aura Pay wallet", icon: "account_balance_wallet" },
  { value: "cash", label: "Cash", icon: "payments" },
  { value: "insurance", label: "Insurance", icon: "health_and_safety" },
  { value: "bank_transfer", label: "Bank transfer", icon: "account_balance" },
];

const paymentMethodColors: Record<
  PayPaymentMethod,
  { tile: string; badge: string; icon: string; ring: string }
> = {
  aura_pay_wallet: {
    tile: "from-[#0fb9b1]/15 to-[#6366f1]/15 dark:from-teal-500/20 dark:to-indigo-500/20",
    badge: "bg-[#e0f7f5] text-[#047a76] dark:bg-teal-500/20 dark:text-teal-100",
    icon: "bg-[#ccfbf1] text-[#0f766e] dark:bg-teal-500/20 dark:text-teal-100",
    ring: "border-[#0fb9b1]",
  },
  card: {
    tile: "from-[#6366f1]/15 to-[#8b5cf6]/15 dark:from-indigo-500/20 dark:to-violet-500/20",
    badge: "bg-[#eef2ff] text-[#4f46e5] dark:bg-indigo-500/20 dark:text-indigo-100",
    icon: "bg-[#e0e7ff] text-[#4f46e5] dark:bg-indigo-500/20 dark:text-indigo-100",
    ring: "border-[#6366f1]",
  },
  mobile_money: {
    tile: "from-[#22c55e]/15 to-[#14b8a6]/15 dark:from-emerald-500/20 dark:to-teal-500/20",
    badge: "bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-100",
    icon: "bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-500/20 dark:text-emerald-100",
    ring: "border-[#22c55e]",
  },
  cash: {
    tile: "from-[#f59e0b]/15 to-[#f97316]/15 dark:from-amber-500/20 dark:to-orange-500/20",
    badge: "bg-[#ffedd5] text-[#c2410c] dark:bg-amber-500/20 dark:text-amber-100",
    icon: "bg-[#fef3c7] text-[#b45309] dark:bg-amber-500/20 dark:text-amber-100",
    ring: "border-[#f59e0b]",
  },
  insurance: {
    tile: "from-[#06b6d4]/15 to-[#3b82f6]/15 dark:from-cyan-500/20 dark:to-blue-500/20",
    badge: "bg-[#e0f2fe] text-[#0369a1] dark:bg-cyan-500/20 dark:text-cyan-100",
    icon: "bg-[#cffafe] text-[#0891b2] dark:bg-cyan-500/20 dark:text-cyan-100",
    ring: "border-[#06b6d4]",
  },
  bank_transfer: {
    tile: "from-[#64748b]/15 to-[#0f172a]/10 dark:from-slate-500/20 dark:to-slate-900/30",
    badge: "bg-[#f1f5f9] text-[#334155] dark:bg-slate-500/20 dark:text-slate-100",
    icon: "bg-[#e2e8f0] text-[#475569] dark:bg-slate-500/20 dark:text-slate-100",
    ring: "border-[#64748b]",
  },
};

const MAX_DASHBOARD_RANGE_DAYS = 93;

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

function formatPaymentMethod(method: PayPaymentMethod) {
  return paymentMethodOptions.find((option) => option.value === method)?.label ?? method.replace(/_/g, " ");
}

function paymentColors(method: PayPaymentMethod) {
  return paymentMethodColors[method];
}

function formatDateTime(isoString: string | null) {
  if (!isoString) return "Not captured";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function AuraPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const { notify, withLoading } = useAuraFeedback();
  const canPay = hasCapability(workspace.capabilities, "pay");
  const locked = !canPay;
  const branch = searchParams.get("branch") ?? undefined;
  const [method, setMethod] = useState<PayPaymentMethod | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMobile, setWithdrawMobile] = useState("");
  const [actionsOpenForId, setActionsOpenForId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; saleNumber: string } | null>(null);

  const todayUtc = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const thisMonthRange = useMemo<PayDateRangeInput>(() => {
    const start = startOfMonthUtc(todayUtc);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const lastMonthRange = useMemo<PayDateRangeInput>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -1);
    const end = endOfPreviousMonthUtc(firstOfThisMonth);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(end) };
  }, [todayUtc]);

  const last3MonthsRange = useMemo<PayDateRangeInput>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -2);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const [range, setRange] = useState<PayDateRangeInput>(thisMonthRange);
  const [draftStart, setDraftStart] = useState(thisMonthRange.start);
  const [draftEnd, setDraftEnd] = useState(thisMonthRange.end);

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
  }, [
    last3MonthsRange.end,
    last3MonthsRange.start,
    lastMonthRange.end,
    lastMonthRange.start,
    range.end,
    range.start,
    thisMonthRange.end,
    thisMonthRange.start,
  ]);

  const payDashboardQuery = usePayDashboardQuery(branch, canPay, range, method, page, pageSize);
  const activateWalletMutation = useActivatePayWalletMutation();
  const withdrawWalletMutation = useWithdrawPayWalletMutation();
  const deleteTransactionMutation = useDeletePayTransactionMutation();

  const data = payDashboardQuery.data;
  const wallet = data?.wallet ?? null;
  const transactions = data?.transactions ?? [];
  const openTransaction = (paymentId: string) => {
    router.push(ROUTES.dashboard.payTransaction(paymentId));
  };
  const openDeleteDialog = (transaction: { id: string; saleNumber: string }) => {
    setActionsOpenForId(null);
    setDeleteTarget({ id: transaction.id, saleNumber: transaction.saleNumber });
  };
  const handleDeleteTransaction = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      const result = await withLoading("pay-delete-transaction-list", "Deleting transaction and restoring stock...", () =>
        deleteTransactionMutation.mutateAsync(deleteTarget.id),
      );
      notify({
        variant: "success",
        title: "Transaction deleted",
        description: `${result.saleNumber} was deleted and ${result.restoredItemCount} item${result.restoredItemCount === 1 ? "" : "s"} restored to stock.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      notify({
        variant: "error",
        title: "Unable to delete transaction",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };
  const byMethod = data?.metrics.byMethod ?? [];
  const methodMetrics = paymentMethodOptions
    .filter((option): option is { value: PayPaymentMethod; label: string; icon: string } => option.value !== "all")
    .map((option) => ({
      ...option,
      count: byMethod.find((row) => row.method === option.value)?.count ?? 0,
      amountCents: byMethod.find((row) => row.method === option.value)?.amountCents ?? 0,
    }));

  async function activateWallet() {
    try {
      await activateWalletMutation.mutateAsync({ branchId: data?.branch.id ?? branch });
      notify({
        variant: "success",
        title: "Aura Wallet activated",
        description: "This branch can now receive card and mobile money settlements.",
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Unable to activate wallet",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function requestWithdrawal() {
    const amountCents = Math.round(Number(withdrawAmount) * 100);
    const availableCents = data?.balance.availableCents ?? 0;
    const fee = calculateDisbursementFee({ payoutAmountCents: amountCents });
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      notify({
        variant: "error",
        title: "Enter a valid amount",
        description: "Withdrawal amount must be greater than zero.",
      });
      return;
    }
    if (fee.totalDebitCents > availableCents) {
      notify({
        variant: "error",
        title: "Insufficient wallet balance",
        description: "Withdrawal total (payout + Lipila fee) cannot exceed the available Aura Pay balance.",
      });
      return;
    }
    if (withdrawMobile.trim().length < 7) {
      notify({
        variant: "error",
        title: "Enter a mobile money number",
        description: "Withdrawals are currently available to mobile money numbers only.",
      });
      return;
    }

    try {
      await withdrawWalletMutation.mutateAsync({
        branchId: data?.branch.id ?? branch,
        amountCents,
        mobileNumber: withdrawMobile,
      });
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawMobile("");
      notify({
        variant: "success",
        title: "Withdrawal sent",
        description: "Lipila is processing the mobile money withdrawal. The wallet balance has been reserved.",
      });
    } catch (error) {
      notify({
        variant: "error",
        title: "Unable to request withdrawal",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const content = (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      {actionsOpenForId ? (
        <button
          type="button"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          aria-label="Close transaction actions"
          onClick={() => setActionsOpenForId(null)}
        />
      ) : null}
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div className="relative overflow-visible rounded-[28px] border border-white/60 bg-gradient-to-br from-[#0fb9b1] via-[#14b8a6] to-[#6366f1] p-6 text-white shadow-[0_25px_70px_-30px_rgba(15,185,177,0.65)] sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-[#a78bfa]/25 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/90 ring-1 ring-white/25">
                <span className="material-symbols-outlined notranslate text-base">payments</span>
                Branch payments
              </span>
              <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Aura Pay
              </h1>
              <p className="max-w-2xl text-base text-white/85">
                Track branch payments, activate wallets, and prepare card or mobile money settlements for withdrawal.
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">
                {data?.branch.name ?? "Selected branch"} · {range.start} → {range.end}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-5 py-2.5 text-base font-semibold text-[#0f766e] shadow-sm transition hover:bg-white"
                  onClick={() => setDateMenuOpen((open) => !open)}
                  aria-haspopup="dialog"
                  aria-expanded={dateMenuOpen}
                >
                  <span className="material-symbols-outlined notranslate text-lg">calendar_month</span>
                  {selectedLabel}
                </button>

                {dateMenuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[90] bg-black/25 sm:hidden"
                      aria-label="Close date filter"
                      onClick={() => setDateMenuOpen(false)}
                    />
                    <div
                      role="dialog"
                      aria-label="Aura Pay date filter"
                      className="fixed inset-x-0 bottom-0 z-[100] max-h-[min(88dvh,32rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(15,23,42,0.12)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:mt-0 sm:max-h-[min(28rem,80vh)] sm:w-[min(22rem,calc(100vw-2rem))] sm:rounded-xl sm:p-3 sm:shadow-lg"
                    >
                    <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--app-border-ui)] sm:hidden" aria-hidden />
                  <div className="space-y-2">
                    {[
                      { label: "This Month (MTD)", next: thisMonthRange },
                      { label: "Last Month", next: lastMonthRange },
                      { label: "Last 3 Months", next: last3MonthsRange },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                        onClick={() => {
                          setRange(preset.next);
                          setDraftStart(preset.next.start);
                          setDraftEnd(preset.next.end);
                          setPage(1);
                          setDateMenuOpen(false);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="my-3 h-px bg-[var(--app-border-ui)]" />

                  <div className="space-y-3">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                      <label className="min-w-0 space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          Start Date
                        </span>
                        <input
                          type="date"
                          value={draftStart}
                          onChange={(e) => setDraftStart(e.target.value)}
                          className="box-border w-full min-w-0 max-w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2.5 text-base text-[var(--app-text)] sm:px-3 sm:text-sm"
                        />
                      </label>
                      <label className="min-w-0 space-y-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          End Date
                        </span>
                        <input
                          type="date"
                          value={draftEnd}
                          onChange={(e) => setDraftEnd(e.target.value)}
                          className="box-border w-full min-w-0 max-w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2.5 text-base text-[var(--app-text)] sm:px-3 sm:text-sm"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 break-all text-[11px] font-semibold text-[var(--app-text-faint)]">
                        {range.start} → {range.end}
                      </div>
                      <button
                        type="button"
                        className="w-full rounded-lg bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:opacity-50 sm:w-auto"
                        disabled={
                          !draftStart ||
                          !draftEnd ||
                          draftStart > draftEnd ||
                          (draftDays != null && draftDays > MAX_DASHBOARD_RANGE_DAYS)
                        }
                        onClick={() => {
                          setRange({ start: draftStart, end: draftEnd });
                          setPage(1);
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl border border-[#99f6e4] bg-gradient-to-br from-[#f0fdfa] via-white to-[#eef2ff] p-6 shadow-sm dark:border-teal-500/25 dark:from-teal-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35 lg:col-span-1">
            <div className="absolute -right-10 -top-10 size-28 rounded-full bg-[#0fb9b1]/15 blur-2xl" aria-hidden />
            <div className="absolute -bottom-12 left-8 size-32 rounded-full bg-[#6366f1]/10 blur-2xl" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-secondary)]">
                  Wallet Balance
                </p>
                <p className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold text-[var(--app-text)]">
                  {currencyFormatter.format((data?.balance.availableCents ?? 0) / 100)}
                </p>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  {wallet ? "Available for branch withdrawals." : "No Aura Wallet is active for this branch yet."}
                </p>
              </div>
              <span className="material-symbols-outlined notranslate rounded-xl bg-[#ccfbf1] p-3 text-2xl text-[#0f766e] shadow-sm">
                account_balance_wallet
              </span>
            </div>

            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--app-text-muted)]">Status</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                    wallet
                      ? "bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-100"
                      : "bg-[#fef3c7] text-[#b45309] dark:bg-amber-500/20 dark:text-amber-100"
                  }`}
                >
                  {wallet?.status ?? "inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--app-text-muted)]">Pending withdrawals</span>
                <span className="font-semibold text-[var(--app-text)]">
                  {currencyFormatter.format((data?.balance.pendingWithdrawalsCents ?? 0) / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--app-text-muted)]">Lifetime settlements</span>
                <span className="font-semibold text-[var(--app-text)]">
                  {currencyFormatter.format((data?.balance.lifetimeSettlementsCents ?? 0) / 100)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {wallet ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  disabled={(data?.balance.availableCents ?? 0) <= 0}
                  onClick={() => setWithdrawOpen(true)}
                >
                  <span className="material-symbols-outlined notranslate text-lg">outbound</span>
                  Withdraw
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  disabled={activateWalletMutation.isPending || payDashboardQuery.isLoading}
                  onClick={activateWallet}
                >
                  <span className="material-symbols-outlined notranslate text-lg">add_card</span>
                  {activateWalletMutation.isPending ? "Activating..." : "Activate Aura Wallet"}
                </button>
              )}
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {[
              {
                label: "Transactions",
                value: (data?.metrics.totalCount ?? 0).toLocaleString(),
                sub: `${rangeDays} day window`,
                icon: "receipt_long",
                className: "border-[#bfdbfe] bg-gradient-to-br from-[#eff6ff] to-white dark:border-blue-500/25 dark:from-blue-950/35 dark:to-[var(--app-surface)]",
                iconClass: "bg-[#dbeafe] text-[#2563eb] dark:bg-blue-500/20 dark:text-blue-100",
              },
              {
                label: "Settled Value",
                value: currencyFormatter.format((data?.metrics.totalAmountCents ?? 0) / 100),
                sub: "Across selected filters",
                icon: "payments",
                className: "border-[#99f6e4] bg-gradient-to-br from-[#f0fdfa] to-white dark:border-teal-500/25 dark:from-teal-950/35 dark:to-[var(--app-surface)]",
                iconClass: "bg-[#ccfbf1] text-[#0f766e] dark:bg-teal-500/20 dark:text-teal-100",
              },
              {
                label: "Average Transaction",
                value: currencyFormatter.format((data?.metrics.averageTransactionCents ?? 0) / 100),
                sub: "Selected period",
                icon: "monitoring",
                className: "border-[#ddd6fe] bg-gradient-to-br from-[#f5f3ff] to-white dark:border-violet-500/25 dark:from-violet-950/35 dark:to-[var(--app-surface)]",
                iconClass: "bg-[#ede9fe] text-[#7c3aed] dark:bg-violet-500/20 dark:text-violet-100",
              },
              {
                label: "Active Method Filter",
                value: method ? formatPaymentMethod(method) : "All",
                sub: `${data?.pagination.total ?? 0} matching rows`,
                icon: "filter_alt",
                className: "border-[#fed7aa] bg-gradient-to-br from-[#fff7ed] to-white dark:border-orange-500/25 dark:from-orange-950/35 dark:to-[var(--app-surface)]",
                iconClass: "bg-[#ffedd5] text-[#ea580c] dark:bg-orange-500/20 dark:text-orange-100",
              },
            ].map((card) => (
              <article key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.className}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`material-symbols-outlined notranslate rounded-lg p-2 text-xl ${card.iconClass}`}>
                    {card.icon}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
                  {card.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[var(--app-text)]">
                  {card.value}
                </p>
                <p className="mt-2 text-[11px] text-[var(--app-text-faint)]">{card.sub}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#dbeafe] bg-gradient-to-br from-white via-[#f8fafc] to-[#eef2ff] p-5 shadow-sm dark:border-indigo-500/25 dark:from-[var(--app-surface)] dark:via-slate-950/20 dark:to-indigo-950/35">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Transaction Counts by Method
              </h2>
              <p className="text-sm text-[var(--app-text-muted)]">
                Counts and value for the selected date range, before method filtering.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {methodMetrics.map((metric) => (
              <button
                key={metric.value}
                type="button"
                className={`rounded-xl border p-4 text-left transition ${
                  method === metric.value
                    ? `${paymentColors(metric.value).ring} bg-gradient-to-br ${paymentColors(metric.value).tile} shadow-sm`
                    : `border-[var(--app-border-ui)] bg-gradient-to-br ${paymentColors(metric.value).tile} hover:shadow-sm`
                }`}
                onClick={() => {
                  setMethod((current) => (current === metric.value ? undefined : metric.value));
                  setPage(1);
                }}
              >
                <span
                  className={`material-symbols-outlined notranslate rounded-lg p-2 text-xl ${paymentColors(metric.value).icon}`}
                >
                  {metric.icon}
                </span>
                <p className="mt-2 text-sm font-bold text-[var(--app-text)]">{metric.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">{metric.count.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">
                  {currencyFormatter.format(metric.amountCents / 100)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#ccfbf1] bg-[var(--app-surface)] shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#ccfbf1] bg-gradient-to-r from-[#f0fdfa] via-white to-[#eef2ff] p-5 dark:border-teal-500/25 dark:from-teal-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Transactions
              </h2>
              <p className="text-sm text-[var(--app-text-muted)]">
                Click a transaction to view purchased items and quantities.
              </p>
            </div>
            <select
              value={method ?? "all"}
              onChange={(event) => {
                setMethod(event.target.value === "all" ? undefined : (event.target.value as PayPaymentMethod));
                setPage(1);
              }}
              className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
              aria-label="Transactions per page"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

          {payDashboardQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-[var(--app-text-muted)]">Loading transactions...</div>
          ) : payDashboardQuery.isError ? (
            <div className="p-8 text-center text-sm text-[#e11d48]">Unable to load Aura Pay data.</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined notranslate text-4xl text-[var(--app-text-faint)]">
                receipt_long
              </span>
              <p className="mt-2 font-semibold text-[var(--app-text)]">No transactions found</p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                Try a different date range or payment method filter.
              </p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3 border-t border-[var(--app-border-ui)] bg-[var(--app-surface)] px-4 py-4">
                {transactions.map((tx) => (
                  <article
                    key={tx.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTransaction(tx.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openTransaction(tx.id);
                      }
                    }}
                    className="cursor-pointer rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:bg-[var(--app-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-brand)]/20"
                    aria-label={`Open details for transaction ${tx.saleNumber}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--app-link-teal)]">
                          {tx.saleNumber}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--app-text-faint)]">{tx.reference ?? "No reference"}</p>
                      </div>
                      <div className="relative flex shrink-0 items-start gap-2">
                        <p className="text-base font-bold text-[var(--app-text)]">
                          {currencyFormatter.format(tx.amountCents / 100)}
                        </p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActionsOpenForId((current) => (current === tx.id ? null : tx.id));
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
                          aria-haspopup="menu"
                          aria-expanded={actionsOpenForId === tx.id}
                          aria-label={`Actions for ${tx.saleNumber}`}
                        >
                          <span className="material-symbols-outlined notranslate text-xl">more_horiz</span>
                        </button>
                        {actionsOpenForId === tx.id ? (
                          <div
                            role="menu"
                            className="absolute right-0 top-9 z-40 min-w-36 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-1 shadow-lg"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openDeleteDialog(tx)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fff1f2]"
                            >
                              <span className="material-symbols-outlined notranslate text-lg">delete</span>
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentColors(tx.method).badge}`}>
                        {formatPaymentMethod(tx.method)}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <dt className="font-semibold text-[var(--app-text-faint)]">Customer</dt>
                      <dd className="text-[var(--app-text)]">{tx.patientName ?? "Walk-in customer"}</dd>
                      <dt className="font-semibold text-[var(--app-text-faint)]">Items</dt>
                      <dd className="text-[var(--app-text-muted)]">{tx.itemCount.toLocaleString()}</dd>
                      <dt className="font-semibold text-[var(--app-text-faint)]">Paid</dt>
                      <dd className="text-[var(--app-text-muted)]">{formatDateTime(tx.paidAt ?? tx.createdAt)}</dd>
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--app-border-ui)] text-sm">
                  <thead className="bg-gradient-to-r from-[#f0fdfa] to-[#eef2ff] text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:from-teal-950/35 dark:to-indigo-950/35 dark:text-slate-300">
                    <tr>
                      <th className="px-5 py-3">Sale</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Items</th>
                      <th className="px-5 py-3">Paid</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="w-16 px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border-ui)]">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openTransaction(tx.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openTransaction(tx.id);
                          }
                        }}
                        className="cursor-pointer transition hover:bg-[var(--app-surface-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--app-brand)]/20"
                        aria-label={`Open details for transaction ${tx.saleNumber}`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-[var(--app-link-teal)]">{tx.saleNumber}</p>
                          <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">{tx.reference ?? "No reference"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentColors(tx.method).badge}`}>
                            {formatPaymentMethod(tx.method)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[var(--app-text-muted)]">{tx.patientName ?? "Walk-in customer"}</td>
                        <td className="px-5 py-4 text-[var(--app-text-muted)]">{tx.itemCount.toLocaleString()}</td>
                        <td className="px-5 py-4 text-[var(--app-text-muted)]">{formatDateTime(tx.paidAt ?? tx.createdAt)}</td>
                        <td className="px-5 py-4 text-right font-bold text-[var(--app-text)]">
                          {currencyFormatter.format(tx.amountCents / 100)}
                        </td>
                        <td className="relative px-3 py-4 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActionsOpenForId((current) => (current === tx.id ? null : tx.id));
                            }}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
                            aria-haspopup="menu"
                            aria-expanded={actionsOpenForId === tx.id}
                            aria-label={`Actions for ${tx.saleNumber}`}
                          >
                            <span className="material-symbols-outlined notranslate text-xl">more_horiz</span>
                          </button>
                          {actionsOpenForId === tx.id ? (
                            <div
                              role="menu"
                              className="absolute right-3 top-12 z-40 min-w-36 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-1 text-left shadow-lg"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openDeleteDialog(tx)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fff1f2]"
                              >
                                <span className="material-symbols-outlined notranslate text-lg">delete</span>
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-[var(--app-border-ui)] p-5 text-sm">
            <span className="text-[var(--app-text-muted)]">
              Page {data?.pagination.page ?? page} of {data?.pagination.totalPages ?? 1} ·{" "}
              {(data?.pagination.total ?? 0).toLocaleString()} transactions
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--app-border-ui)] px-3 py-2 font-semibold text-[var(--app-text)] disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--app-border-ui)] px-3 py-2 font-semibold text-[var(--app-text)] disabled:opacity-40"
                disabled={page >= (data?.pagination.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {deleteTarget ? (
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-pay-list-transaction-dialog-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-5 shadow-xl sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fee2e2] text-[#b91c1c]">
                  <span className="material-symbols-outlined notranslate text-xl">delete</span>
                </div>
                <div className="min-w-0">
                  <h3 id="delete-pay-list-transaction-dialog-title" className="font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]">
                    Delete transaction?
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                    {deleteTarget.saleNumber} will be deleted from Aura Pay, and all sold product quantities from the
                    linked sale will be restored to stock.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteTransactionMutation.isPending}
                  className="rounded-xl border border-[var(--app-border-ui)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTransaction}
                  disabled={deleteTransactionMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="material-symbols-outlined notranslate text-lg">
                    {deleteTransactionMutation.isPending ? "progress_activity" : "delete"}
                  </span>
                  Delete Transaction
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {withdrawOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                    Withdraw Funds
                  </h2>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                    Withdraw to mobile money. Bank withdrawals are coming soon.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"
                  onClick={() => setWithdrawOpen(false)}
                  aria-label="Close withdrawal dialog"
                >
                  <span className="material-symbols-outlined notranslate">close</span>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                    placeholder="0.00"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Mobile Number
                  </span>
                  <input
                    type="tel"
                    value={withdrawMobile}
                    onChange={(event) => setWithdrawMobile(event.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                    placeholder="+260..."
                  />
                </label>
                <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface-muted)] p-4 text-sm">
                  {(() => {
                    const payoutAmountCents = Math.round(Number(withdrawAmount) * 100);
                    if (!Number.isFinite(payoutAmountCents) || payoutAmountCents <= 0) {
                      return (
                        <p className="text-xs text-[var(--app-text-muted)]">
                          Enter an amount to preview the Lipila fee and total wallet debit.
                        </p>
                      );
                    }
                    const fee = calculateDisbursementFee({ payoutAmountCents });
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[var(--app-text-muted)]">Payout amount</span>
                          <span className="font-semibold text-[var(--app-text)]">
                            {currencyFormatter.format(fee.payoutAmountCents / 100)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[var(--app-text-muted)]">Lipila fee (1.5%)</span>
                          <span className="font-semibold text-[var(--app-text)]">
                            {currencyFormatter.format(fee.feeCents / 100)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-[var(--app-border-ui)] pt-2">
                          <span className="text-[var(--app-text-muted)]">Total wallet debit</span>
                          <span className="font-semibold text-[var(--app-text)]">
                            {currencyFormatter.format(fee.totalDebitCents / 100)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="rounded-xl bg-[rgba(0,106,101,0.08)] p-3 text-xs leading-relaxed text-[var(--app-text-muted)]">
                  Available balance: {currencyFormatter.format((data?.balance.availableCents ?? 0) / 100)}. Funds are
                  reserved immediately and refunded automatically if Lipila reports a failed withdrawal.
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--app-border-ui)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
                  onClick={() => setWithdrawOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  disabled={withdrawWalletMutation.isPending}
                  onClick={requestWithdrawal}
                >
                  {withdrawWalletMutation.isPending ? "Requesting..." : "Request Withdrawal"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="pay">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-8">
        <MissingCapabilityNotice capability="pay" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}
