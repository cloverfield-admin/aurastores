"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useAdjustStockMutation,
  useDisposeStockBatchMutation,
  useStockDashboardQuery,
} from "@/lib/queries/stock";
import type { StockDashboardResponse } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";

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

const PAGE_SIZE = 10;
const EMPTY_ROWS: StockDashboardResponse["inventory"] = [];

function formatRelativeSync(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function promptForQuantityDelta() {
  const value = window.prompt("Enter a quantity adjustment. Use negative numbers to reduce stock.");

  if (value === null) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed === 0) {
    throw new Error("Enter a non-zero whole number for the stock adjustment.");
  }

  return parsed;
}

function getExpiryStage(row: StockDashboardResponse["inventory"][number]) {
  if (row.status === "disposed" || row.daysToExpiry < 0 || row.daysToExpiry <= 30) {
    return "critical" as const;
  }

  if (row.daysToExpiry <= 90) {
    return "expiring" as const;
  }

  return "watch" as const;
}

function getExpiryLabel(stage: ReturnType<typeof getExpiryStage>) {
  if (stage === "critical") {
    return "Critical";
  }

  if (stage === "expiring") {
    return "Expiring Soon";
  }

  return "Watch";
}

function getExpiryTone(stage: ReturnType<typeof getExpiryStage>) {
  if (stage === "critical") {
    return {
      text: "text-[#b42318]",
      badge: "bg-[#fff1f0] text-[#b42318]",
      icon: "bg-[#fff4f2] text-[#b42318]",
      border: "before:bg-[#c62828]",
    };
  }

  if (stage === "expiring") {
    return {
      text: "text-[#b45309]",
      badge: "bg-[#fff3e8] text-[#b45309]",
      icon: "bg-[#fff3ec] text-[#c76b29]",
      border: "before:bg-[#ef8f57]",
    };
  }

  return {
    text: "text-[#58636e]",
    badge: "bg-[#eef1f4] text-[#4b5563]",
    icon: "bg-[#edf8f6] text-[#0a8f88]",
    border: "before:bg-[#11c5be]",
  };
}

function formatExpiryDate(expiresAt: string) {
  return dateFormatter.format(new Date(expiresAt));
}

export function ItemsNearExpiryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const branchId = searchParams.get("branch") ?? undefined;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-asc");
  const [page, setPage] = useState(1);

  const stockQuery = useStockDashboardQuery({
    branchId,
    search: "",
    view: "all",
    page: 1,
    pageSize: 100,
  });

  const adjustStockMutation = useAdjustStockMutation();
  const disposeBatchMutation = useDisposeStockBatchMutation();
  const rows = stockQuery.data?.inventory ?? EMPTY_ROWS;
  const stockHref = branchId
    ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
    : ROUTES.dashboard.stock;

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const nextRows = rows
      .filter((row) => row.status !== "disposed")
      .filter((row) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          row.productName,
          row.batchNumber,
          row.sku,
          row.supplierName ?? "",
          row.categoryName,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
      .filter((row) => {
        if (categoryFilter === "all") {
          return true;
        }

        return row.categoryName === categoryFilter;
      })
      .filter((row) => {
        if (statusFilter === "all") {
          return true;
        }

        return getExpiryStage(row) === statusFilter;
      });

    nextRows.sort((left, right) => {
      if (sortBy === "date-asc") {
        return left.daysToExpiry - right.daysToExpiry;
      }

      if (sortBy === "qty-desc") {
        return right.quantityAvailable - left.quantityAvailable;
      }

      if (sortBy === "loss-desc") {
        return (
          right.quantityAvailable * right.unitCostCents -
          left.quantityAvailable * left.unitCostCents
        );
      }

      return left.productName.localeCompare(right.productName);
    });

    return nextRows;
  }, [categoryFilter, rows, search, sortBy, statusFilter]);

  const pagination = useMemo(() => {
    const totalItems = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;

    return {
      page: currentPage,
      totalPages,
      totalItems,
      items: filteredRows.slice(start, start + PAGE_SIZE),
    };
  }, [filteredRows, page]);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((row) => row.categoryName))).sort((left, right) => left.localeCompare(right)),
    [rows],
  );

  const criticalCount = filteredRows.filter((row) => getExpiryStage(row) === "critical").length;
  const nearExpiryCount = filteredRows.filter((row) => getExpiryStage(row) === "expiring").length;
  const potentialLoss = filteredRows.reduce(
    (sum, row) => sum + row.quantityAvailable * row.unitCostCents,
    0,
  );

  const recentProcessed = (stockQuery.data?.recentEntries ?? []).slice(0, 3);

  async function runAdjustment(batchId: string, label: string) {
    let quantityDelta: number | null;

    try {
      quantityDelta = promptForQuantityDelta();
    } catch (error) {
      notify({
        variant: "error",
        title: "Invalid adjustment",
        description: error instanceof Error ? error.message : "Unable to parse stock adjustment.",
      });
      return;
    }

    if (quantityDelta === null) {
      return;
    }

    const note = window.prompt("Optional note for the stock adjustment:")?.trim() || undefined;

    await withLoading("dashboard-adjust-stock", "Applying stock adjustment...", async () => {
      const result = await adjustStockMutation.mutateAsync({
        branchId,
        batchIds: [batchId],
        quantityDelta,
        note,
      });

      notify({
        variant: "success",
        title: "Adjustment recorded",
        description: `${result.adjustedCount} product${result.adjustedCount === 1 ? "" : "s"} updated for ${label}.`,
      });
    });
  }

  return (
    <div className="px-4 pb-14 pt-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#62707c]">
              <Link href={stockHref} className="font-semibold text-[#1f8b87] transition hover:text-[#0d6d68]">
                Aura Stock
              </Link>
              <span>/</span>
              <span>{stockQuery.data?.branch.name ?? "Central"}</span>
            </div>
            <h1 className="font-[family-name:var(--font-manrope)] text-[38px] font-extrabold leading-none tracking-[-0.03em] text-[#171d23]">
              Expiring Products
            </h1>
            <p className="max-w-3xl text-[15px] leading-6 text-[#5e6873]">
              Monitor and manage inventory nearing clinical expiration. Proactive disposal
              prevents medical protocol violations and financial waste.
              {stockQuery.data ? ` Last synced ${formatRelativeSync(stockQuery.data.lastSyncedAt)}.` : null}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <article className="relative overflow-hidden rounded-[26px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(14,30,37,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-[26px] before:bg-[#c62828]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#818b97]">
                    Total Critical
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-manrope)] text-[44px] font-extrabold leading-none text-[#c62828]">
                    {criticalCount}
                  </p>
                  <p className="mt-2 text-sm text-[#63707b]">Expiring in &lt; 30 days</p>
                </div>
                <div className="flex size-14 items-center justify-center rounded-full bg-[#fff4f2] text-[#c62828]">
                  <span className="material-symbols-outlined notranslate text-[22px]">warning</span>
                </div>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[26px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(14,30,37,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-[26px] before:bg-[#ef8f57]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#818b97]">
                    Near Expiry
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-manrope)] text-[44px] font-extrabold leading-none text-[#d27942]">
                    {nearExpiryCount}
                  </p>
                  <p className="mt-2 text-sm text-[#63707b]">Expiring in 31-90 days</p>
                </div>
                <div className="flex size-14 items-center justify-center rounded-full bg-[#fff3ec] text-[#c76b29]">
                  <span className="material-symbols-outlined notranslate text-[22px]">schedule</span>
                </div>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[26px] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(14,30,37,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-[26px] before:bg-[#11c5be]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#818b97]">
                    Potential Loss
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-manrope)] text-[40px] font-extrabold leading-none text-[#0a8f88]">
                    {currencyFormatter.format(potentialLoss / 100)}
                  </p>
                  <p className="mt-2 text-sm text-[#63707b]">Estimated inventory value</p>
                </div>
                <div className="flex size-14 items-center justify-center rounded-full bg-[#edf8f6] text-[#0a8f88]">
                  <span className="material-symbols-outlined notranslate text-[22px]">payments</span>
                </div>
              </div>
            </article>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-[26px] bg-[#f5f7f8] p-5 shadow-[0_18px_40px_rgba(14,30,37,0.05)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <label className="relative block flex-1">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#98a2ad]">
                      search
                    </span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                      }}
                      placeholder="Search medication or product ref..."
                      className="w-full rounded-[18px] border border-white bg-white py-3 pl-12 pr-4 text-sm text-[#171d23] shadow-sm outline-none placeholder:text-[#a0a9b2] focus:border-[#cfe9e7]"
                    />
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-12 rounded-[14px] border border-white bg-white px-4 text-sm text-[#171d23] shadow-sm outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">Critical</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="watch">Watch</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      setCategoryFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-12 rounded-[14px] border border-white bg-white px-4 text-sm text-[#171d23] shadow-sm outline-none"
                  >
                    <option value="all">Category: All</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-3">
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value);
                      setPage(1);
                    }}
                    className="h-10 rounded-full border border-white bg-white px-4 text-sm text-[#171d23] shadow-sm outline-none"
                  >
                    <option value="date-asc">Sort: Date (Soonest)</option>
                    <option value="qty-desc">Sort: Quantity (Highest)</option>
                    <option value="loss-desc">Sort: Potential Loss</option>
                    <option value="name-asc">Sort: Medication (A-Z)</option>
                  </select>
                </div>
              </section>

              <section className="overflow-hidden rounded-[26px] bg-white shadow-[0_20px_50px_rgba(14,30,37,0.05)]">
                {stockQuery.isError ? (
                  <div className="px-6 py-10 text-sm text-[#b42318]">
                    {stockQuery.error instanceof Error
                      ? stockQuery.error.message
                      : "Unable to load expiring stock."}
                  </div>
                ) : pagination.items.length === 0 && !stockQuery.isLoading ? (
                  <div className="px-6 py-12 text-center">
                    <p className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-[#171d23]">
                      No products found
                    </p>
                    <p className="mt-2 text-sm text-[#66717c]">
                      Try a different search or filter combination.
                    </p>
                    <Link
                      href={stockHref}
                      className="mt-5 inline-flex rounded-full bg-[#0b8a86] px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Back to Stock
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto overscroll-x-contain">
                      <table className="w-full min-w-[740px]">
                        <thead>
                          <tr className="border-b border-[#eef2f4] bg-white">
                            <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Medication Name
                            </th>
                            <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Product ref
                            </th>
                            <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Expiry Date
                            </th>
                            <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Quantity
                            </th>
                            <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Status
                            </th>
                            <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8a96]">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagination.items.map((row) => {
                            const stage = getExpiryStage(row);
                            const tone = getExpiryTone(stage);

                            return (
                              <tr key={row.id} className="border-b border-[#f1f4f6] last:border-b-0">
                                <td className="px-5 py-5">
                                  <Link
                                    href={ROUTES.dashboard.stockBatch(row.id)}
                                    className="block group"
                                  >
                                    <p className="font-[family-name:var(--font-manrope)] text-[18px] font-extrabold leading-6 text-[#171d23] group-hover:text-[#006a65] transition">
                                      {row.productName}
                                    </p>
                                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98a2ad]">
                                      {row.categoryName}
                                    </p>
                                  </Link>
                                </td>
                                <td className="px-5 py-5">
                                  <Link
                                    href={ROUTES.dashboard.stockBatch(row.id)}
                                    className="font-mono text-sm text-[#5d6873] hover:text-[#006a65] transition"
                                  >
                                    #{row.batchNumber}
                                  </Link>
                                  <p className="mt-1 text-[11px] text-[#9ca5ae]">{row.sku}</p>
                                </td>
                                <td className="px-5 py-5">
                                  <p
                                    className={`whitespace-nowrap text-[18px] font-bold leading-6 ${
                                      stage === "critical"
                                        ? "text-[#b42318]"
                                        : stage === "expiring"
                                          ? "text-[#d27942]"
                                          : "text-[#171d23]"
                                    }`}
                                  >
                                    {formatExpiryDate(row.expiresAt)}
                                  </p>
                                </td>
                                <td className="px-5 py-5 text-[18px] leading-6 text-[#171d23]">
                                  <span>{row.quantityAvailable.toLocaleString()}</span>
                                  <span className="ml-1 text-[#5f6c77]">Units</span>
                                </td>
                                <td className="px-5 py-5">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.badge}`}
                                  >
                                    {getExpiryLabel(stage)}
                                  </span>
                                </td>
                                <td className="px-5 py-5">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await runAdjustment(row.id, row.productName);
                                      }}
                                      className="rounded-full border border-[#d8e0e6] px-3 py-1.5 text-[11px] font-semibold text-[#4d5b67] transition hover:bg-[#f7f9fb]"
                                    >
                                      Adjust
                                    </button>
                                    {row.canDispose ? (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await withLoading(
                                            "dashboard-dispose-batch",
                                            "Disposing product...",
                                            async () => {
                                              const result = await disposeBatchMutation.mutateAsync({
                                                batchId: row.id,
                                                branchId,
                                                note:
                                                  stage === "critical"
                                                    ? "Disposed from expiring products dashboard."
                                                    : "Preventive disposal from expiring products dashboard.",
                                              });

                                              notify({
                                                variant: "success",
                                                title: "Product disposed",
                                                description: `${result.productName} (${result.batchNumber}) was removed from available stock.`,
                                              });
                                            },
                                          );
                                        }}
                                        className="rounded-full bg-[#0b8a86] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#08706c]"
                                      >
                                        Dispose
                                      </button>
                                    ) : (
                                      <span className="inline-flex rounded-full bg-[#eef1f4] px-3 py-1.5 text-[11px] font-semibold text-[#66717c]">
                                        Closed
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

                    <div className="flex flex-col gap-4 border-t border-[#eef2f4] px-5 py-4 text-sm text-[#616d78] sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        Showing page {pagination.page} of {pagination.totalPages} •{" "}
                        {pagination.items.length} of {pagination.totalItems} items
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={pagination.page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                          className="rounded-md border border-[#e4e8ec] bg-white px-3 py-1.5 text-sm font-medium text-[#5c6974] disabled:opacity-40"
                        >
                          Prev
                        </button>
                        <span className="rounded-md bg-[#0b8a86] px-3 py-1.5 text-sm font-semibold text-white">
                          {pagination.page}
                        </span>
                        <span className="rounded-md px-3 py-1.5 text-sm font-medium text-[#171d23]">
                          / {pagination.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() =>
                            setPage((current) => Math.min(pagination.totalPages, current + 1))
                          }
                          className="rounded-md border border-[#e4e8ec] bg-white px-3 py-1.5 text-sm font-medium text-[#5c6974] disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <aside className="rounded-[24px] bg-[#f7f8f9] p-6 shadow-[0_18px_40px_rgba(14,30,37,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-10 items-center justify-center rounded-xl bg-[#e8f7f5] text-[#0b8a86]">
                    <span className="material-symbols-outlined notranslate text-[20px]">
                      inventory
                    </span>
                  </div>
                  <div>
                    <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-[#171d23]">
                      Disposal Protocol
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#62707c]">
                      Ensure all biological waste is processed through authorized contractors
                      following Protocol v4.0 standards.
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-sm font-semibold text-[#0b8a86]">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined notranslate text-base">description</span>
                    Standard Operating Procedures
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined notranslate text-base">folder_open</span>
                    Waste Manifest Generator
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined notranslate text-base">task_alt</span>
                    Audit Compliance Checklist
                  </li>
                </ul>
              </aside>

              <aside className="rounded-[24px] bg-white p-6 shadow-[0_18px_40px_rgba(14,30,37,0.05)]">
                <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-bold text-[#171d23]">
                  Recently Processed
                </h2>

                <div className="mt-5 space-y-5">
                  {recentProcessed.length > 0 ? (
                    recentProcessed.map((entry, index) => (
                      <div key={entry.id} className="flex gap-3">
                        <div
                          className={`mt-1 flex size-8 items-center justify-center rounded-full border ${
                            index % 2 === 0
                              ? "border-[#11c5be] text-[#0b8a86]"
                              : "border-[#7678f6] text-[#6266e8]"
                          }`}
                        >
                          <span className="material-symbols-outlined notranslate text-base">
                            done
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#171d23]">
                            {entry.productName}
                          </p>
                          <p className="mt-1 text-xs text-[#66717c]">
                            Ref #{entry.batchNumber} · {entry.quantityReceived.toLocaleString()} units
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#adb5bd]">
                            {formatRelativeSync(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#66717c]">No recently processed entries yet.</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
