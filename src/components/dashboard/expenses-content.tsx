"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  type ExpenseType,
  type ExpensesDateRangeInput,
  useCreateExpenseMutation,
  useExpensesDashboardQuery,
} from "@/lib/queries/expenses";
import { hasCapability } from "@/lib/rbac/capabilities";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const MAX_DASHBOARD_RANGE_DAYS = 93;

const expenseTypeColors: Record<
  ExpenseType,
  { tile: string; badge: string; icon: string; ring: string }
> = {
  charge: {
    tile: "from-[#fef3c7] via-white to-[#fee2e2] dark:from-amber-950/35 dark:via-[var(--app-surface)] dark:to-rose-950/35",
    badge: "bg-[#ffedd5] text-[#c2410c] dark:bg-amber-500/20 dark:text-amber-100",
    icon: "bg-[#fef3c7] text-[#b45309] dark:bg-amber-500/20 dark:text-amber-100",
    ring: "border-[#f59e0b]",
  },
  restocking: {
    tile: "from-[#dcfce7] via-white to-[#ccfbf1] dark:from-emerald-950/35 dark:via-[var(--app-surface)] dark:to-teal-950/35",
    badge: "bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-100",
    icon: "bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-500/20 dark:text-emerald-100",
    ring: "border-[#22c55e]",
  },
  general: {
    tile: "from-[#eff6ff] via-white to-[#eef2ff] dark:from-blue-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35",
    badge: "bg-[#eef2ff] text-[#4f46e5] dark:bg-indigo-500/20 dark:text-indigo-100",
    icon: "bg-[#dbeafe] text-[#2563eb] dark:bg-blue-500/20 dark:text-blue-100",
    ring: "border-[#6366f1]",
  },
};

function typeColor(type: ExpenseType) {
  return expenseTypeColors[type];
}

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

function clampSeries(series: Array<{ totalCents: number }>) {
  const max = Math.max(1, ...series.map((p) => p.totalCents));
  return { max };
}

export function ExpensesContent() {
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canPay = hasCapability(workspace.capabilities, "pay");
  const locked = !canPay;
  const branchId = searchParams.get("branch") ?? undefined;
  const { notify, withLoading } = useAuraFeedback();

  const now = useMemo(() => new Date(), []);
  const thisMonthStart = useMemo(() => toIsoDateUtc(startOfMonthUtc(now)), [now]);
  const todayIso = useMemo(() => toIsoDateUtc(now), [now]);
  const thisMonthRange: ExpensesDateRangeInput = { start: thisMonthStart, end: todayIso };

  const [range, setRange] = useState<ExpensesDateRangeInput>(thisMonthRange);
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const [type, setType] = useState<ExpenseType | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const draftDays = useMemo(() => {
    if (!draftStart || !draftEnd) return null;
    if (draftStart > draftEnd) return null;
    return daysBetweenInclusiveUtc(draftStart, draftEnd);
  }, [draftStart, draftEnd]);

  const lastMonthRange = useMemo(() => {
    const end = endOfPreviousMonthUtc(now);
    const start = startOfMonthUtc(end);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(end) };
  }, [now]);

  const last3MonthsRange = useMemo(() => {
    const start = addMonthsUtc(startOfMonthUtc(now), -2);
    return { start: toIsoDateUtc(start), end: todayIso };
  }, [now, todayIso]);

  const expensesQuery = useExpensesDashboardQuery(branchId, canPay, range, type, page, pageSize);
  const createExpenseMutation = useCreateExpenseMutation();

  const data = expensesQuery.data;
  const series = useMemo(() => data?.series ?? [], [data?.series]);
  const { max } = useMemo(() => clampSeries(series), [series]);
  const [hoverPoint, setHoverPoint] = useState<null | { date: string; totalCents: number; x: number; y: number }>(
    null,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<"general" | "restocking">("general");
  const [newDate, setNewDate] = useState(todayIso);
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function submitManualExpense() {
    const amountCents = Math.round(Number(newAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      notify({ variant: "error", title: "Enter a valid amount", description: "Amount must be greater than zero." });
      return;
    }
    if (newDescription.trim().length < 2) {
      notify({
        variant: "error",
        title: "Enter a description",
        description: "Please add a short description for this expense.",
      });
      return;
    }

    try {
      await withLoading("expenses-create", "Saving expense...", async () => {
        await createExpenseMutation.mutateAsync({
          branchId,
          expenseType: newType,
          amountCents,
          description: newDescription,
          expenseDate: newDate,
        });
      });
      setCreateOpen(false);
      setNewAmount("");
      setNewDescription("");
      setNewDate(todayIso);
      setNewType("general");
      notify({ variant: "success", title: "Expense saved", description: "Your expense has been recorded." });
    } catch (error) {
      notify({
        variant: "error",
        title: "Unable to save expense",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  const content = (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div className="relative overflow-visible rounded-[28px] border border-white/60 bg-gradient-to-br from-[#0fb9b1] via-[#14b8a6] to-[#6366f1] p-6 text-white shadow-[0_25px_70px_-30px_rgba(15,185,177,0.65)] sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-[#a78bfa]/25 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white/90 ring-1 ring-white/25">
                <span className="material-symbols-outlined notranslate text-base">receipt_long</span>
                Expenses
              </span>
              <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Branch expenses
              </h1>
              <p className="max-w-2xl text-base text-white/85">
                Track general and restocking expenses, plus provider charges from mobile money sales and wallet withdrawals.
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
                  Date range
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
                      aria-label="Expenses date filter"
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

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-5 py-2.5 text-base font-semibold text-[#0f766e] shadow-sm transition hover:bg-white"
                onClick={() => setCreateOpen(true)}
              >
                <span className="material-symbols-outlined notranslate text-lg">add</span>
                Add expense
              </button>
            </div>
          </div>
        </div>

        <section className="grid gap-6 md:grid-cols-4">
          {[
            {
              label: "Total expenses",
              value: data?.totals.totalCents ?? 0,
              icon: "summarize",
              className:
                "border-[#ccfbf1] bg-gradient-to-br from-[#f0fdfa] via-white to-[#eef2ff] dark:border-teal-500/25 dark:from-teal-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35",
              iconClass: "bg-[#ccfbf1] text-[#0f766e] dark:bg-teal-500/20 dark:text-teal-100",
            },
            {
              label: "Charges",
              value: data?.totals.byType.charge ?? 0,
              icon: "percent",
              className: `border-[#fed7aa] bg-gradient-to-br ${typeColor("charge").tile}`,
              iconClass: typeColor("charge").icon,
            },
            {
              label: "Restocking",
              value: data?.totals.byType.restocking ?? 0,
              icon: "inventory_2",
              className: `border-[#99f6e4] bg-gradient-to-br ${typeColor("restocking").tile}`,
              iconClass: typeColor("restocking").icon,
            },
            {
              label: "General",
              value: data?.totals.byType.general ?? 0,
              icon: "receipt",
              className: `border-[#dbeafe] bg-gradient-to-br ${typeColor("general").tile}`,
              iconClass: typeColor("general").icon,
            },
          ].map((card) => (
            <article
              key={card.label}
              className={`rounded-2xl border p-5 shadow-sm ${card.className}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-muted)]">
                    {card.label}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[var(--app-text)]">
                    {currencyFormatter.format(card.value / 100)}
                  </p>
                </div>
                <span
                  className={`material-symbols-outlined notranslate rounded-xl p-3 text-2xl shadow-sm ${card.iconClass}`}
                >
                  {card.icon}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#ccfbf1] bg-[var(--app-surface)] shadow-sm">
          <div className="mb-0 flex flex-col gap-3 border-b border-[#ccfbf1] bg-gradient-to-r from-[#f0fdfa] via-white to-[#eef2ff] p-5 dark:border-teal-500/25 dark:from-teal-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Expenses flow
              </h2>
              <p className="text-sm text-[var(--app-text-muted)]">Daily totals for the selected date range.</p>
            </div>
            <select
              value={type ?? "all"}
              onChange={(e) => {
                setType(e.target.value === "all" ? undefined : (e.target.value as ExpenseType));
                setPage(1);
              }}
              className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
            >
              <option value="all">All types</option>
              <option value="charge">Charges</option>
              <option value="restocking">Restocking</option>
              <option value="general">General</option>
            </select>
          </div>

          {expensesQuery.isLoading ? (
            <div className="p-10 text-center text-sm text-[var(--app-text-muted)]">Loading expenses...</div>
          ) : expensesQuery.isError ? (
            <div className="p-10 text-center text-sm text-[#e11d48]">Unable to load expenses.</div>
          ) : (
            <div className="relative flex h-44 items-end gap-1 overflow-x-auto bg-[var(--app-surface-muted)] p-4">
              {series.map((point) => {
                const heightPct = Math.max(2, Math.round((point.totalCents / max) * 100));
                return (
                  <div
                    key={point.date}
                    className="relative flex h-full w-3 shrink-0 items-end"
                    onMouseEnter={(event) =>
                      setHoverPoint({
                        date: point.date,
                        totalCents: point.totalCents,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onMouseMove={(event) =>
                      setHoverPoint((current) =>
                        current
                          ? { ...current, x: event.clientX, y: event.clientY }
                          : { date: point.date, totalCents: point.totalCents, x: event.clientX, y: event.clientY },
                      )
                    }
                    onMouseLeave={() => setHoverPoint(null)}
                  >
                    <div
                      className="w-full rounded-md bg-gradient-to-b from-[#0fb9b1] via-[#14b8a6] to-[#6366f1]"
                      style={{ height: `${heightPct}%` }}
                      aria-label={`${point.date}: ${currencyFormatter.format(point.totalCents / 100)}`}
                    />
                  </div>
                );
              })}

              {hoverPoint ? (
                <div
                  className="pointer-events-none fixed z-[9999] w-max max-w-[240px] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text)] shadow-lg"
                  style={{ left: hoverPoint.x, top: hoverPoint.y - 10 }}
                >
                  <p className="font-semibold">{hoverPoint.date}</p>
                  <p className="text-[var(--app-text-muted)]">
                    {currencyFormatter.format(hoverPoint.totalCents / 100)}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#ccfbf1] bg-[var(--app-surface)] shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#ccfbf1] bg-gradient-to-r from-[#f0fdfa] via-white to-[#eef2ff] p-5 dark:border-teal-500/25 dark:from-teal-950/35 dark:via-[var(--app-surface)] dark:to-indigo-950/35 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Expenses
              </h2>
              <p className="text-sm text-[var(--app-text-muted)]">All expense entries in the selected range.</p>
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
              aria-label="Expenses per page"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>

          {!data || data.expenses.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined notranslate text-4xl text-[var(--app-text-faint)]">
                receipt_long
              </span>
              <p className="mt-2 font-semibold text-[var(--app-text)]">No expenses found</p>
              <p className="mt-1 text-sm text-[var(--app-text-muted)]">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3 border-t border-[var(--app-border-ui)] bg-[var(--app-surface)] px-4 py-4">
                {data.expenses.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--app-text-muted)]">
                        {row.expenseDate.slice(0, 10)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${typeColor(row.expenseType).badge}`}
                      >
                        {row.expenseType}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-[var(--app-text)]">{row.description}</p>
                    {row.chargeType ? (
                      <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">{row.chargeType}</p>
                    ) : null}
                    <p className="mt-3 text-lg font-bold text-[var(--app-text)]">
                      {currencyFormatter.format(row.amountCents / 100)}
                    </p>
                  </article>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--app-border-ui)] text-sm">
                  <thead className="bg-gradient-to-r from-[#f0fdfa] to-[#eef2ff] text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:from-teal-950/35 dark:to-indigo-950/35 dark:text-slate-300">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border-ui)]">
                    {data.expenses.map((row) => (
                      <tr key={row.id} className="transition hover:bg-[var(--app-surface-muted)]">
                        <td className="px-5 py-4 text-[var(--app-text-muted)]">
                          {row.expenseDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              typeColor(row.expenseType).badge
                            }`}
                          >
                            {row.expenseType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[var(--app-text)]">
                          <p className="font-semibold">{row.description}</p>
                          {row.chargeType ? (
                            <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">{row.chargeType}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[var(--app-text)]">
                          {currencyFormatter.format(row.amountCents / 100)}
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
              {(data?.pagination.total ?? 0).toLocaleString()} expenses
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

        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                    Add Expense
                  </h2>
                  <p className="mt-1 text-sm text-[var(--app-text-muted)]">Record general expenses or restocking costs.</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)]"
                  onClick={() => setCreateOpen(false)}
                  aria-label="Close add expense dialog"
                >
                  <span className="material-symbols-outlined notranslate">close</span>
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Type
                  </span>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as "general" | "restocking")}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                  >
                    <option value="general">General expense</option>
                    <option value="restocking">Restocking</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Date
                  </span>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                    placeholder="0.00"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
                    Description
                  </span>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)]"
                    placeholder={newType === "restocking" ? "e.g. Supplier restock invoice" : "e.g. Cleaning supplies"}
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[var(--app-border-ui)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)]"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  disabled={createExpenseMutation.isPending}
                  onClick={submitManualExpense}
                >
                  {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
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

