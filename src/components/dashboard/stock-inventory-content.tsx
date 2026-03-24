"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { ROUTES } from "@/lib/routes";
import {
  useAdjustStockMutation,
  useDisposeStockBatchMutation,
  useRestoreStockBatchMutation,
  useStockDashboardQuery,
} from "@/lib/queries/stock";
import type { StockDashboardResponse } from "@/lib/queries/stock";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatRelativeSync(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function formatExpiryLabel(daysToExpiry: number, expiresAt: string) {
  if (daysToExpiry < 0) {
    return `Expired (${dateFormatter.format(new Date(expiresAt))})`;
  }

  if (daysToExpiry <= 30) {
    return `Expiring Soon (${daysToExpiry} day${daysToExpiry === 1 ? "" : "s"})`;
  }

  return `Safe (${dateFormatter.format(new Date(expiresAt))})`;
}

const EMPTY_ROWS: StockDashboardResponse["inventory"] = [];

const STOCK_SEARCH_DEBOUNCE_MS = 400;

/** Local state + debounce live here so the heavy parent page does not re-render on every keystroke. */
const StockSearchField = memo(function StockSearchField({
  urlQ,
  onDebouncedChange,
}: {
  urlQ: string;
  onDebouncedChange: (q: string) => void;
}) {
  const [value, setValue] = useState(urlQ);

  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (value === urlQ) {
        return;
      }
      onDebouncedChange(value);
    }, STOCK_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [value, urlQ, onDebouncedChange]);

  return (
    <label className="relative block w-full sm:w-72">
      <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#94a3b8]">
        search
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by product, SKU, batch, or supplier"
        className="w-full rounded-full border-0 bg-[#f2f4f6] py-2 pl-10 pr-4 text-sm text-[#191c1e] placeholder:text-[#94a3b8] outline-none ring-1 ring-transparent focus:ring-[#14b8a6]/25"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
});

type StockAdjustDialogProps = {
  open: boolean;
  label: string;
  batchCount: number;
  selectedBatchLabels: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (quantityDelta: number, note?: string) => Promise<{ adjustedCount: number }>;
};

const StockAdjustDialog = memo(function StockAdjustDialog({
  open,
  label,
  batchCount,
  selectedBatchLabels,
  isSubmitting,
  onClose,
  onSubmit,
}: StockAdjustDialogProps) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantityInput("1");
    } else {
      setQuantityInput("1");
      setNote("");
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#006a65]">Adjust Stock</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-bold text-[#191c1e]">
            {label}
          </h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Apply one adjustment to {batchCount} batch{batchCount === 1 ? "" : "es"}.
          </p>
        </div>

        <div className="space-y-4">
          {batchCount > 1 ? (
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                Selected Batches
              </p>
              <div className="max-h-24 space-y-1 overflow-y-auto text-xs text-[#475569]">
                {selectedBatchLabels.map((batchLabel) => (
                  <p key={batchLabel} className="truncate">
                    {batchLabel}
                  </p>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#b45309]">
                This adjustment applies the same quantity change to all selected batches.
              </p>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
              Quantity Delta
            </span>
            <input
              type="number"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              placeholder="Use negative numbers to reduce stock"
              className="w-full rounded-xl border-0 bg-[#f2f4f6] px-4 py-3 text-sm text-[#191c1e] outline-none ring-1 ring-transparent focus:ring-[#14b8a6]/25"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
              Note (Optional)
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border-0 bg-[#f2f4f6] px-4 py-3 text-sm text-[#191c1e] outline-none ring-1 ring-transparent focus:ring-[#14b8a6]/25"
              placeholder="Reason for this adjustment"
            />
          </label>

          {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}
          {successMessage ? <p className="text-sm font-medium text-[#0d9488]">{successMessage}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl bg-[#f2f4f6] px-4 py-2 text-sm font-semibold text-[#191c1e] transition hover:bg-[#e8eaed] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || successMessage !== null}
            onClick={async () => {
              const quantityDelta = Number.parseInt(quantityInput, 10);

              if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
                setError("Enter a non-zero whole number for the stock adjustment.");
                return;
              }

              setError(null);
              try {
                const result = await onSubmit(quantityDelta, note.trim() || undefined);
                setSuccessMessage(
                  `Adjustment applied successfully to ${result.adjustedCount} batch${result.adjustedCount === 1 ? "" : "es"}.`,
                );
                window.setTimeout(() => onClose(), 900);
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : "Unable to apply stock adjustment.",
                );
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined notranslate animate-spin text-base">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined notranslate text-base">check</span>
            )}
            {successMessage ? "Done" : "Confirm Adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
});

export function StockInventoryContent() {
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [optimisticAdjustments, setOptimisticAdjustments] = useState<
    Record<string, { quantityAvailable: number; status: StockDashboardResponse["inventory"][number]["status"] }>
  >({});
  const [recentlyAdjustedBatchIds, setRecentlyAdjustedBatchIds] = useState<string[]>([]);
  const branchId = searchParams.get("branch") ?? undefined;
  const [filter, setFilter] = useState<"all" | "expiring">(
    searchParams.get("view") === "expiring" ? "expiring" : "all",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
  const [adjustDialog, setAdjustDialog] = useState<{
    open: boolean;
    batchIds: string[];
    label: string;
  }>({
    open: false,
    batchIds: [],
    label: "",
  });
  const stockQuery = useStockDashboardQuery({ branchId, search, view: filter, page, pageSize: 10 });
  const adjustStockMutation = useAdjustStockMutation();
  const disposeBatchMutation = useDisposeStockBatchMutation();
  const restoreBatchMutation = useRestoreStockBatchMutation();

  const rows = useMemo(
    () =>
      (stockQuery.data?.inventory ?? EMPTY_ROWS).map((row) => {
        const optimistic = optimisticAdjustments[row.id];
        if (!optimistic) {
          return row;
        }

        return {
          ...row,
          quantityAvailable: optimistic.quantityAvailable,
          status: optimistic.status,
          stockProgressPercent:
            row.quantityReceived > 0
              ? Math.max(0, Math.min(100, Math.round((optimistic.quantityAvailable / row.quantityReceived) * 100)))
              : 0,
        };
      }),
    [optimisticAdjustments, stockQuery.data?.inventory],
  );
  const isTableRefreshing = stockQuery.isFetching && !stockQuery.isLoading;
  const isPageLoading = isTableRefreshing;
  const pagination = stockQuery.data?.pagination ?? {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  };
  const selectableRowIds = useMemo(
    () => rows.filter((row) => row.status !== "disposed").map((row) => row.id),
    [rows],
  );
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row] as const)), [rows]);
  const allRowsSelected =
    selectableRowIds.length > 0 && selectableRowIds.every((rowId) => selectedBatchIds.includes(rowId));

  useEffect(() => {
    setSelectedBatchIds((current) => current.filter((batchId) => rowById.has(batchId)));
  }, [rowById]);

  useEffect(() => {
    setOptimisticAdjustments({});
  }, [stockQuery.data?.lastSyncedAt]);

  useEffect(() => {
    if (recentlyAdjustedBatchIds.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRecentlyAdjustedBatchIds([]);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [recentlyAdjustedBatchIds]);

  const handleSearchDebounced = useCallback(
    (q: string) => {
      setSearch(q);
      setPage(1);
    },
    [],
  );

  const metrics = stockQuery.data?.metrics ?? {
    totalStockValueCents: 0,
    totalAvailableUnits: 0,
    totalBatchCount: 0,
    nearExpiryBatchCount: 0,
    expiredBatchCount: 0,
    outOfStockSkuCount: 0,
    lowStockSkuCount: 0,
    reorderSuggestedCount: 0,
    stockTurnoverRate: 0,
    healthyBatchRatio: 0,
    unitsSoldLast30Days: 0,
  };
  const stockExpiringHref = branchId
    ? `${ROUTES.dashboard.stockExpiring}?branch=${encodeURIComponent(branchId)}`
    : ROUTES.dashboard.stockExpiring;

  const metricCards = [
    {
      label: "Total Stock Value",
      value: currencyFormatter.format(metrics.totalStockValueCents / 100),
      sub: `${metrics.totalAvailableUnits.toLocaleString()} units across ${metrics.totalBatchCount.toLocaleString()} batches`,
      badge: `${metrics.healthyBatchRatio}% healthy`,
      badgeClass: "bg-[#f0fdfa] text-[#0d9488]",
      icon: "payments",
    },
    {
      label: "Items Near Expiry",
      value: `${metrics.nearExpiryBatchCount.toLocaleString()} Batches`,
      sub: `${metrics.expiredBatchCount.toLocaleString()} already expired`,
      badge: metrics.nearExpiryBatchCount > 0 ? "Attention" : "Stable",
      badgeClass:
        metrics.nearExpiryBatchCount > 0
          ? "bg-[#fffbeb] text-[#d97706]"
          : "bg-[#f0fdf4] text-[#15803d]",
      icon: "schedule",
    },
    {
      label: "Out of Stock",
      value: `${metrics.outOfStockSkuCount.toLocaleString()} SKUs`,
      sub: `${metrics.reorderSuggestedCount.toLocaleString()} products need reorder attention`,
      badge: metrics.outOfStockSkuCount > 0 ? "Critical" : "Covered",
      badgeClass:
        metrics.outOfStockSkuCount > 0
          ? "bg-[#fff1f2] text-[#e11d48]"
          : "bg-[#eff6ff] text-[#2563eb]",
      icon: "warning",
    },
    {
      label: "Stock Turnover",
      value: `${metrics.stockTurnoverRate.toFixed(1)}x`,
      sub: `${metrics.unitsSoldLast30Days.toLocaleString()} units sold in 30 days`,
      badge: "Live",
      badgeClass: "bg-[#eff6ff] text-[#2563eb]",
      icon: "autorenew",
    },
  ];

  async function runAdjustment(
    batchIds: string[],
    label: string,
    quantityDelta: number,
    note?: string,
  ): Promise<{ adjustedCount: number }> {
    if (batchIds.length === 0) {
      throw new Error("Select at least one batch to adjust.");
    }

    return withLoading("dashboard-adjust-stock", "Applying stock adjustment...", async () => {
      const result = await adjustStockMutation.mutateAsync({
        branchId,
        batchIds,
        quantityDelta,
        note,
      });

      setSelectedBatchIds((current) => current.filter((batchId) => !batchIds.includes(batchId)));
      notify({
        variant: "success",
        title: "Adjustment recorded",
        description: `${result.adjustedCount} batch${result.adjustedCount === 1 ? "" : "es"} updated for ${label}.`,
      });

      setOptimisticAdjustments((current) => ({
        ...current,
        ...Object.fromEntries(
          result.updatedBatches.map((batch) => [
            batch.id,
            {
              quantityAvailable: batch.quantityAvailable,
              status: batch.status,
            },
          ]),
        ),
      }));
      setRecentlyAdjustedBatchIds(result.updatedBatches.map((batch) => batch.id));

      return { adjustedCount: result.adjustedCount };
    });
  }

  return (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006a65]">
              Inventory Management
            </p>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl">
              Stock Inventory
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <span className="size-2 rounded-full bg-[#22c55e]" aria-hidden />
              <span className="text-xs font-medium text-[#94a3b8]">
                {stockQuery.data
                  ? `Real-time batch sync active • Last synced ${formatRelativeSync(stockQuery.data.lastSyncedAt)}`
                  : "Loading live inventory snapshot..."}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={selectedBatchIds.length === 0}
              onClick={async () => {
                const validBatchIds = selectedBatchIds.filter((batchId) => {
                  const row = rowById.get(batchId);
                  return row ? row.status !== "disposed" : false;
                });

                if (validBatchIds.length === 0) {
                  notify({
                    variant: "warning",
                    title: "No adjustable batches selected",
                    description: "Select at least one active or expiring batch to run bulk adjustment.",
                  });
                  return;
                }

                setAdjustDialog({
                  open: true,
                  batchIds: validBatchIds,
                  label: "the selected stock set",
                });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-5 py-2.5 text-base font-semibold text-[#191c1e] transition hover:bg-[#e8eaed] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined notranslate text-lg">edit_note</span>
              Bulk Adjust
            </button>
            <button
              type="button"
              onClick={async () => {
                await withLoading(
                  "dashboard-refresh-stock",
                  "Refreshing inventory snapshot...",
                  async () => {
                    const result = await stockQuery.refetch();
                    if (result.error) {
                      throw result.error;
                    }

                    notify({
                      variant: "success",
                      title: "Inventory refreshed",
                      description: "Live stock metrics are now up to date.",
                    });
                  },
                );
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-5 py-2.5 text-base font-semibold text-[#191c1e] transition hover:bg-[#e8eaed]"
            >
              <span className="material-symbols-outlined notranslate text-lg">sync</span>
              Refresh Inventory
            </button>
            <Link
              href={ROUTES.dashboard.stockAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <span className="material-symbols-outlined notranslate text-lg">add</span>
              Add New Batch
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metricCards.map((metric) => {
            const isNearExpiry = metric.label === "Items Near Expiry";
            const cardContent = (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#f1f5f9]">
                    <span className="material-symbols-outlined notranslate text-xl text-[#64748b]">
                      {metric.icon}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${metric.badgeClass}`}>
                    {metric.badge}
                  </span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                  {metric.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[#191c1e]">
                  {stockQuery.isLoading ? "..." : metric.value}
                </p>
                <p className="mt-2 text-[10px] text-[#94a3b8]">{metric.sub}</p>
                {isNearExpiry ? (
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#0d9488]">
                    View details
                    <span className="material-symbols-outlined notranslate text-sm">arrow_forward</span>
                  </span>
                ) : null}
              </>
            );

            if (isNearExpiry) {
              return (
                <Link
                  key={metric.label}
                  href={stockExpiringHref}
                  className="block rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm transition hover:border-[#14b8a6]/30 hover:shadow-md"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <article
                key={metric.label}
                className="rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm"
              >
                {cardContent}
              </article>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#f2f4f6] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                Product Inventory
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <StockSearchField urlQ={search} onDebouncedChange={handleSearchDebounced} />
                <div className="flex rounded-lg bg-[#f2f4f6] p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("all");
                      setPage(1);
                    }}
                    className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                      filter === "all"
                        ? "bg-white text-[#191c1e] shadow-sm"
                        : "font-medium text-[#64748b] hover:text-[#191c1e]"
                    }`}
                  >
                    All Products
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("expiring");
                      setPage(1);
                    }}
                    className={`rounded-md px-4 py-1.5 text-xs transition ${
                      filter === "expiring"
                        ? "bg-white font-semibold text-[#191c1e] shadow-sm"
                        : "font-medium text-[#64748b] hover:text-[#191c1e]"
                    }`}
                  >
                    Expiring Soon
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.1em] text-[#94a3b8]">
              <span>
                {selectedBatchIds.length > 0
                  ? `${selectedBatchIds.length} batch${selectedBatchIds.length === 1 ? "" : "es"} selected`
                  : "Select rows to apply bulk adjustments"}
              </span>
              <span>Branch: {stockQuery.data?.branch.name ?? "Loading..."}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {stockQuery.isError ? (
              <div className="px-6 py-10 text-sm text-[#b42318]">
                {stockQuery.error instanceof Error
                  ? stockQuery.error.message
                  : "Unable to load stock inventory right now."}
              </div>
            ) : rows.length === 0 && !stockQuery.isLoading ? (
              <div className="px-6 py-12 text-center">
                <p className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                  {search || filter === "expiring" ? "No matching batches" : "No batches yet"}
                </p>
                <p className="mt-2 text-sm text-[#64748b]">
                  {search || filter === "expiring"
                    ? "Try a different search term or switch back to the full inventory view."
                    : "Add your first stock batch to start tracking metrics, expiry, and reorder risk."}
                </p>
                {!search && filter === "all" ? (
                  <Link
                    href={ROUTES.dashboard.stockAdd}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">add</span>
                    Create First Batch
                  </Link>
                ) : null}
              </div>
            ) : (
              <div>
                {isTableRefreshing ? (
                  <div className="flex items-center gap-2 border-b border-[#f1f5f9] bg-[#f8fafc] px-6 py-2 text-xs font-medium text-[#64748b]">
                    <span className="material-symbols-outlined notranslate animate-spin text-sm">progress_activity</span>
                    Updating table results...
                  </div>
                ) : null}
                <table className="w-full min-w-[860px]">
                  <thead>
                  <tr className="bg-[rgba(242,244,246,0.5)]">
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={allRowsSelected}
                        onChange={() => {
                          setSelectedBatchIds((current) =>
                            allRowsSelected
                              ? current.filter((id) => !selectableRowIds.includes(id))
                              : Array.from(new Set([...current, ...selectableRowIds])),
                          );
                        }}
                        className="size-4 rounded border-[#cbd5e1] text-[#0d9488] focus:ring-[#14b8a6]"
                        aria-label="Select visible batches"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Batch ID
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Expiry Date
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Stock Level
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Actions
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                    const expiryVariant =
                      row.status === "expired" || row.status === "disposed"
                        ? "critical"
                        : row.status === "expiring_soon"
                          ? "warning"
                          : "safe";
                    const isSelected = selectedBatchIds.includes(row.id);
                    const canAdjust = row.status !== "disposed";
                    const isRecentlyAdjusted = recentlyAdjustedBatchIds.includes(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={
                          isRecentlyAdjusted
                            ? "border-t border-[#bbf7d0] bg-[rgba(240,253,244,0.9)] transition-colors"
                            : expiryVariant === "critical"
                              ? "border-t border-[#f1f5f9] bg-[rgba(255,241,242,0.05)]"
                              : "border-t border-[#f1f5f9]"
                        }
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canAdjust}
                            onChange={() => {
                              setSelectedBatchIds((current) =>
                                isSelected
                                  ? current.filter((id) => id !== row.id)
                                  : [...current, row.id],
                              );
                            }}
                            className="size-4 rounded border-[#cbd5e1] text-[#0d9488] focus:ring-[#14b8a6] disabled:opacity-40"
                            aria-label={`Select batch ${row.batchNumber}`}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={ROUTES.dashboard.stockBatch(row.id)}
                            className="block group"
                          >
                            <p className="text-sm font-semibold text-[#191c1e] group-hover:text-[#006a65] transition">
                              {row.productName}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-tight text-[#94a3b8] group-hover:text-[#00504c] transition">
                              SKU: {row.sku}
                            </p>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#475569]">{row.categoryName}</td>
                        <td className="px-6 py-4">
                          <Link
                            href={ROUTES.dashboard.stockBatch(row.id)}
                            className="font-mono text-sm text-[#64748b] hover:text-[#006a65] transition"
                          >
                            #{row.batchNumber}
                          </Link>
                          {row.supplierName ? (
                            <p className="mt-1 text-[10px] text-[#94a3b8]">{row.supplierName}</p>
                          ) : null}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                              expiryVariant === "safe"
                                ? "bg-[#f0fdf4] text-[#15803d]"
                                : expiryVariant === "warning"
                                  ? "bg-[#fffbeb] text-[#b45309]"
                                  : "bg-[#fff1f2] text-[#be123c]"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                expiryVariant === "safe"
                                  ? "bg-[#22c55e]"
                                  : expiryVariant === "warning"
                                    ? "bg-[#f59e0b]"
                                    : "bg-[#f43f5e]"
                              }`}
                            />
                            {formatExpiryLabel(row.daysToExpiry, row.expiresAt)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 space-y-1.5">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${row.stockProgressPercent}%`,
                                  backgroundColor:
                                    expiryVariant === "safe"
                                      ? "#14b8a6"
                                      : expiryVariant === "warning"
                                        ? "#f59e0b"
                                        : "#e11d48",
                                }}
                              />
                            </div>
                            <p
                              className={`text-[10px] font-semibold ${
                                expiryVariant === "safe"
                                  ? "text-[#0d9488]"
                                  : expiryVariant === "warning"
                                    ? "text-[#d97706]"
                                    : "text-[#e11d48]"
                              }`}
                            >
                              {row.quantityAvailable.toLocaleString()} /{" "}
                              {row.quantityReceived.toLocaleString()} Units
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canAdjust ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  setAdjustDialog({
                                    open: true,
                                    batchIds: [row.id],
                                    label: row.productName,
                                  });
                                }}
                                className="rounded-md bg-[#eff6ff] px-3 py-1 text-[10px] font-semibold text-[#2563eb] hover:bg-[#dbeafe]"
                              >
                                Adjust
                              </button>
                            ) : null}
                            {row.canDispose ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await withLoading(
                                    "dashboard-dispose-batch",
                                    "Disposing batch from live inventory...",
                                    async () => {
                                      const result = await disposeBatchMutation.mutateAsync({
                                        batchId: row.id,
                                        branchId,
                                        note:
                                          row.status === "expired"
                                            ? "Expired stock disposed from dashboard."
                                            : "Manual stock disposal recorded from dashboard.",
                                      });

                                      setSelectedBatchIds((current) =>
                                        current.filter((id) => id !== row.id),
                                      );
                                      notify({
                                        variant: "success",
                                        title: "Batch disposed",
                                        description: `${result.productName} (${result.batchNumber}) was removed from available stock.`,
                                      });
                                    },
                                  );
                                }}
                                className="rounded-md bg-[#e11d48] px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-[#be123c]"
                              >
                                Dispose
                              </button>
                            ) : row.status === "disposed" ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await withLoading(
                                    "dashboard-restore-batch",
                                    "Restoring disposed batch...",
                                    async () => {
                                      const result = await restoreBatchMutation.mutateAsync({
                                        batchId: row.id,
                                        branchId,
                                        note: "Batch restored from stock dashboard.",
                                      });

                                      notify({
                                        variant: "success",
                                        title: "Batch restored",
                                        description: `${result.productName} (${result.batchNumber}) restored with ${result.restoredQuantity.toLocaleString()} units.`,
                                      });
                                    },
                                  );
                                }}
                                className="rounded-md bg-[#0d9488] px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-[#0f766e]"
                              >
                                Restore
                              </button>
                            ) : (
                              <span className="inline-flex rounded-full bg-[#f8fafc] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#64748b]">
                                {row.status.replace("_", " ")}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#f1f5f9] bg-[rgba(242,244,246,0.3)] px-6 py-4 sm:flex-row">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Showing page {pagination.page.toLocaleString()} of {pagination.totalPages.toLocaleString()} •{" "}
              {pagination.totalItems.toLocaleString()} tracked batches
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || isPageLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined notranslate text-lg">chevron_left</span>
              </button>
              <span className="inline-flex min-w-14 items-center justify-center gap-1 rounded border border-[#006a65] bg-white px-3 py-1 text-xs font-semibold text-[#006a65]">
                {isPageLoading ? (
                  <span className="material-symbols-outlined notranslate animate-spin text-sm">progress_activity</span>
                ) : null}
                {pagination.page}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || isPageLoading}
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined notranslate text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-xl bg-[#6063ee] p-8">
            <div
              className="pointer-events-none absolute -bottom-4 -right-4 size-48 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-white/20">
                <span className="material-symbols-outlined notranslate text-xl text-white">
                  medication
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white">
                Automated Batch Reorder
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                {stockQuery.data
                  ? stockQuery.data.draftOrder.productCount > 0
                    ? `Smart systems detected ${stockQuery.data.draftOrder.productCount} product lines nearing threshold for ${stockQuery.data.draftOrder.branchName}.`
                    : `No urgent reorder drafts are needed for ${stockQuery.data.branch.name} right now.`
                  : "Checking current reorder thresholds..."}
              </p>
              <button
                type="button"
                onClick={() => {
                  const draftOrder = stockQuery.data?.draftOrder;

                  notify({
                    variant: "info",
                    title:
                      draftOrder && draftOrder.productCount > 0
                        ? "Draft order ready"
                        : "No reorder needed",
                    description:
                      draftOrder && draftOrder.productCount > 0
                        ? `Suggested products: ${draftOrder.products.join(", ")}`
                        : "Current stock levels are above the configured reorder thresholds.",
                  });
                }}
                className="mt-6 rounded-lg bg-white px-6 py-2.5 text-xs font-semibold text-[#4648d4] shadow-lg transition hover:bg-white/95"
              >
                Review Draft Order
              </button>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-[rgba(204,251,241,0.5)] bg-[rgba(240,253,250,0.5)] p-8">
            <div
              className="pointer-events-none absolute -bottom-4 -right-4 size-48 rounded-full opacity-5 blur-3xl"
              style={{
                background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-[#ccfbf1]">
                <span className="material-symbols-outlined notranslate text-xl text-[#0d9488]">
                  show_chart
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#134e4a]">
                Inventory Efficiency
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#0f766e]/80">
                {`${metrics.healthyBatchRatio}% of your tracked batches are healthy, while ${metrics.nearExpiryBatchCount} batches need closer rotation this month.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccfbf1] px-3 py-1.5 text-[10px] font-semibold uppercase text-[#115e59]">
                  <span className="material-symbols-outlined notranslate text-xs">trending_up</span>
                  {metrics.stockTurnoverRate >= 1 ? "High Rotation" : "Steady Rotation"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccfbf1] px-3 py-1.5 text-[10px] font-semibold uppercase text-[#115e59]">
                  <span className="material-symbols-outlined notranslate text-xs">check_circle</span>
                  {metrics.healthyBatchRatio >= 75 ? "Optimized" : "Monitor Closely"}
                </span>
              </div>
            </div>
          </article>
        </div>

        <footer className="flex flex-col gap-4 border-t border-[#f1f5f9] pt-6 text-[11px] uppercase tracking-[0.1em] text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-[#cbd5e1]">AuraPharma v2.4.0</span>
            <span>© 2024 Clinical Intelligence</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              Privacy Policy
            </Link>
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              System Status
            </Link>
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              Pharmacy API
            </Link>
          </div>
        </footer>
      </div>

      <button
        type="button"
        className="fixed bottom-8 right-8 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-95"
        style={{
          background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
        }}
        aria-label="Undo or history"
      >
        <span className="material-symbols-outlined notranslate text-xl text-white">
          history
        </span>
      </button>

      <StockAdjustDialog
        open={adjustDialog.open}
        label={adjustDialog.label}
        batchCount={adjustDialog.batchIds.length}
        selectedBatchLabels={adjustDialog.batchIds.map((batchId) => {
          const row = rowById.get(batchId);
          return row ? `${row.productName} (#${row.batchNumber})` : `Batch ${batchId}`;
        })}
        isSubmitting={adjustStockMutation.isPending}
        onClose={() => {
          setAdjustDialog({
            open: false,
            batchIds: [],
            label: "",
          });
        }}
        onSubmit={async (quantityDelta, note) => {
          return runAdjustment(
            adjustDialog.batchIds.filter((batchId) => {
              const row = rowById.get(batchId);
              return row ? row.status !== "disposed" : false;
            }),
            adjustDialog.label,
            quantityDelta,
            note,
          );
        }}
      />
    </div>
  );
}
