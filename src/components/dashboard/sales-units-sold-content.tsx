"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { type SalesDateRangeInput, useSalesSoldItemsQuery } from "@/lib/queries/sales";
import { hasCapability } from "@/lib/rbac/capabilities";
import { ROUTES } from "@/lib/routes";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

type DatePreset = "today" | "week" | "month" | "custom";

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekUtc(date: Date) {
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysSinceMonday));
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString("en-ZM", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPaymentMethod(method: string | null) {
  if (!method) {
    return "Not captured";
  }

  return method
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border-ui)] bg-[var(--app-surface-muted)] px-4 py-8 text-center">
      <span className="material-symbols-outlined notranslate text-3xl text-[var(--app-text-faint)]">inventory_2</span>
      <p className="mt-3 text-sm font-semibold text-[var(--app-text)]">No products sold in this window</p>
      <p className="mt-1 max-w-sm text-xs text-[var(--app-text-muted)]">
        Completed sales line items will appear here when they match the selected filter.
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface-muted)]"
        />
      ))}
    </div>
  );
}

export function SalesUnitsSoldContent() {
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canSales = hasCapability(workspace.capabilities, "sales");
  const todayIso = useMemo(() => toIsoDateUtc(new Date()), []);
  const todayUtc = useMemo(() => new Date(`${todayIso}T00:00:00.000Z`), [todayIso]);
  const todayRange = useMemo<SalesDateRangeInput>(() => ({ start: todayIso, end: todayIso }), [todayIso]);
  const weekRange = useMemo<SalesDateRangeInput>(
    () => ({ start: toIsoDateUtc(startOfWeekUtc(todayUtc)), end: todayIso }),
    [todayIso, todayUtc],
  );
  const monthRange = useMemo<SalesDateRangeInput>(
    () => ({ start: toIsoDateUtc(startOfMonthUtc(todayUtc)), end: todayIso }),
    [todayIso, todayUtc],
  );
  const initialBranch = searchParams.get("branch") ?? undefined;
  const [branch, setBranch] = useState<string | undefined>(initialBranch);
  const [preset, setPreset] = useState<DatePreset>("today");
  const [range, setRange] = useState<SalesDateRangeInput>(todayRange);
  const [draftStart, setDraftStart] = useState(todayRange.start);
  const [draftEnd, setDraftEnd] = useState(todayRange.end);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const soldItemsQuery = useSalesSoldItemsQuery(branch, canSales, range, page, pageSize);
  const data = soldItemsQuery.data;
  const rows = data?.items ?? [];
  const pagination = data?.pagination ?? { page, pageSize, totalItems: 0, totalPages: 1 };
  const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);

  function applyPreset(nextPreset: Exclude<DatePreset, "custom">) {
    const nextRange = nextPreset === "today" ? todayRange : nextPreset === "week" ? weekRange : monthRange;
    setPreset(nextPreset);
    setRange(nextRange);
    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    setPage(1);
  }

  function applyCustomRange() {
    if (!draftStart || !draftEnd || draftStart > draftEnd) {
      return;
    }

    setPreset("custom");
    setRange({ start: draftStart, end: draftEnd });
    setPage(1);
  }

  if (!canSales) {
    return (
      <LockedCapabilityTease capability="sales">
        <MissingCapabilityNotice capability="sales" variant="inline" className="max-w-3xl" />
      </LockedCapabilityTease>
    );
  }

  return (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Link
              href={branch ? `${ROUTES.dashboard.sales}?branch=${encodeURIComponent(branch)}` : ROUTES.dashboard.sales}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-link-teal)] hover:underline"
            >
              <span className="material-symbols-outlined notranslate text-base">arrow_back</span>
              Aura Sales
            </Link>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Units Sold
            </h1>
            <p className="text-sm text-[var(--app-text-secondary)]">
              Individual products sold from completed sales, grouped by line item.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="units-sold-filters"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-surface-muted)] sm:w-auto"
          >
            <span className="material-symbols-outlined notranslate text-lg">tune</span>
            Filters
            <span className="material-symbols-outlined notranslate text-lg">
              {filtersOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            {filtersOpen ? (
              <div id="units-sold-filters" className="grid min-w-0 gap-4 xl:flex-1">
                <div className="grid gap-3 lg:grid-cols-[minmax(13rem,auto)_minmax(28rem,1fr)] lg:items-end">
                  <label className="min-w-0 space-y-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                      Branch
                    </span>
                    <select
                      value={branch ?? data?.branch.id ?? ""}
                      onChange={(event) => {
                        setBranch(event.target.value || undefined);
                        setPage(1);
                      }}
                      className="w-full rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2.5 text-sm font-semibold text-[var(--app-text)] sm:min-w-52"
                    >
                      {data?.branches.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                      {!data && <option value={branch ?? ""}>Current branch</option>}
                    </select>
                  </label>
                  <div
                    className={`min-w-0 rounded-xl border px-3 py-2 ${
                      preset === "custom"
                        ? "border-[var(--app-brand)] bg-[var(--app-surface)]"
                        : "border-[var(--app-border-ui)] bg-[var(--app-surface)]"
                    }`}
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                      Custom
                    </span>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <input
                        type="date"
                        value={draftStart}
                        onChange={(event) => setDraftStart(event.target.value)}
                        className="min-w-0 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2 text-sm text-[var(--app-text)]"
                      />
                      <input
                        type="date"
                        value={draftEnd}
                        onChange={(event) => setDraftEnd(event.target.value)}
                        className="min-w-0 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2 text-sm text-[var(--app-text)]"
                      />
                      <button
                        type="button"
                        onClick={applyCustomRange}
                        disabled={!draftStart || !draftEnd || draftStart > draftEnd}
                        className="rounded-lg bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-3 py-2 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "today", label: "Today" },
                      { id: "week", label: "This Week" },
                      { id: "month", label: "This Month" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyPreset(option.id as Exclude<DatePreset, "custom">)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          preset === option.id
                            ? "border-transparent bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] text-white"
                            : "border-[var(--app-border-ui)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className="rounded-xl bg-[var(--app-surface-muted)] px-4 py-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                      Page size
                    </span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-1.5 text-sm font-semibold text-[var(--app-text)] lg:min-w-28"
                    >
                      {[10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div
                id="units-sold-filters"
                className="rounded-xl border border-dashed border-[var(--app-border-ui)] bg-[var(--app-surface-muted)] px-4 py-3 text-xs font-semibold text-[var(--app-text-muted)] xl:flex-1"
              >
                {data?.branch.name ?? "Current branch"} · {range.start} → {range.end} · {pageSize} per page
              </div>
            )}

            <div
              className={`grid gap-3 sm:grid-cols-2 ${
                filtersOpen ? "xl:min-w-[18rem]" : "xl:min-w-[28rem]"
              }`}
            >
              <div className="rounded-xl bg-[var(--app-surface-muted)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Line items
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--app-text)]">
                  {pagination.totalItems.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--app-surface-muted)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Visible units
                </p>
                <p className="mt-1 text-xl font-extrabold text-[var(--app-text)]">{totalQuantity.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                Products Sold
              </h2>
              <p className="text-xs text-[var(--app-text-faint)]">
                {range.start} → {range.end} · {data?.branch.name ?? "Current branch"}
              </p>
            </div>
            {soldItemsQuery.isFetching ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-text-muted)]">
                <span className="size-2 animate-pulse rounded-full bg-[var(--app-link-teal)]" />
                Updating results
              </span>
            ) : null}
          </div>

          {soldItemsQuery.isLoading ? (
            <TableSkeleton />
          ) : soldItemsQuery.isError ? (
            <div className="rounded-xl border border-[#fecdd3] bg-[#fff1f2] p-4 text-sm font-semibold text-[#be123c]">
              {soldItemsQuery.error instanceof Error ? soldItemsQuery.error.message : "Unable to load sold products."}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-[var(--app-border-ui)] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                      <th className="px-3 py-3">Sale ID</th>
                      <th className="px-3 py-3">Product</th>
                      <th className="px-3 py-3">Quantity</th>
                      <th className="px-3 py-3">Price</th>
                      <th className="px-3 py-3">Payment Method</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Sold At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border-ui)]">
                    {rows.map((item) => (
                      <tr key={item.id} className="transition hover:bg-[var(--app-surface-muted)]">
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--app-link-teal)]">
                          {item.saleNumber}
                        </td>
                        <td className="min-w-56 px-3 py-3 font-semibold text-[var(--app-text)]">{item.productName}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--app-text-muted)]">
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-[var(--app-text)]">
                          {currencyFormatter.format(item.lineTotalCents / 100)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--app-text-muted)]">
                          {formatPaymentMethod(item.paymentMethod)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--app-text-muted)]">
                          {item.customerName ?? "Walk-In"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[var(--app-text-faint)]">
                          {formatDateTime(item.soldAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {rows.map((item) => (
                  <article key={item.id} className="rounded-xl border border-[var(--app-border-ui)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[var(--app-text)]">{item.productName}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--app-link-teal)]">{item.saleNumber}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[var(--app-text)]">
                        {currencyFormatter.format(item.lineTotalCents / 100)}
                      </p>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="font-semibold text-[var(--app-text-faint)]">Quantity</dt>
                        <dd className="mt-0.5 font-semibold text-[var(--app-text)]">{item.quantity.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[var(--app-text-faint)]">Payment</dt>
                        <dd className="mt-0.5 text-[var(--app-text-muted)]">{formatPaymentMethod(item.paymentMethod)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[var(--app-text-faint)]">Customer</dt>
                        <dd className="mt-0.5 text-[var(--app-text-muted)]">{item.customerName ?? "Walk-In"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[var(--app-text-faint)]">Sold At</dt>
                        <dd className="mt-0.5 text-[var(--app-text-muted)]">{formatDateTime(item.soldAt)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--app-border-ui)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[var(--app-text-faint)]">
              Page {pagination.page.toLocaleString()} of {pagination.totalPages.toLocaleString()} ·{" "}
              {pagination.totalItems.toLocaleString()} line items
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || soldItemsQuery.isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border-ui)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition enabled:hover:bg-[var(--app-surface-muted)] disabled:opacity-50"
              >
                <span className="material-symbols-outlined notranslate text-base">chevron_left</span>
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
                disabled={page >= pagination.totalPages || soldItemsQuery.isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--app-border-ui)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition enabled:hover:bg-[var(--app-surface-muted)] disabled:opacity-50"
              >
                Next
                <span className="material-symbols-outlined notranslate text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
