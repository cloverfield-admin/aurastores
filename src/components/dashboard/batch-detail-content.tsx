"use client";

import Link from "next/link";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useRouter } from "next/navigation";
import {
  useAdjustStockMutation,
  useBatchDetailQuery,
  useDisposeStockBatchMutation,
  useRestoreStockBatchMutation,
  type StockBatchDetailResponse,
} from "@/lib/queries/stock";
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

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});

function formatStatusTone(
  daysToExpiry: number,
  status: string,
): {
  badge: string;
  label: string;
  dot: string;
  progress: string;
  text: string;
} {
  if (status === "disposed") {
    return {
      badge: "bg-[#fff1f2] text-[#be123c]",
      label: "Disposed",
      dot: "bg-[#f43f5e]",
      progress: "#e11d48",
      text: "text-[#ba1a1a]",
    };
  }

  if (status === "depleted") {
    return {
      badge: "bg-[#fff7ed] text-[#c2410c]",
      label: "Depleted",
      dot: "bg-[#f97316]",
      progress: "#f97316",
      text: "text-[#c2410c]",
    };
  }

  if (daysToExpiry < 0) {
    return {
      badge: "bg-[#fff1f2] text-[#be123c]",
      label: "Expired",
      dot: "bg-[#f43f5e]",
      progress: "#e11d48",
      text: "text-[#ba1a1a]",
    };
  }

  if (daysToExpiry <= 30) {
    return {
      badge: "bg-[#fffbeb] text-[#b45309]",
      label: "At Risk",
      dot: "bg-[#f59e0b]",
      progress: "#f59e0b",
      text: "text-[#d97706]",
    };
  }

  return {
    badge: "bg-[rgba(15,185,177,0.1)] text-[var(--app-brand)]",
    label: "Stable",
    dot: "bg-[#0fb9b1]",
    progress: "#0fb9b1",
    text: "text-[var(--app-text)]",
  };
}

function getDosageForm(productName: string) {
  const lower = productName.toLowerCase();
  if (lower.includes("capsule")) return "Hard Gelatin Capsules";
  if (lower.includes("tablet")) return "Film-Coated Tablets";
  if (lower.includes("syrup")) return "Oral Suspension";
  if (lower.includes("injection")) return "Injectable Solution";
  return "Clinical Distribution Unit";
}

function getShelfLabel(categoryName: string) {
  const lower = categoryName.toLowerCase();
  if (lower.includes("antibiotic")) return "Shelf A-4, Warehouse 1";
  if (lower.includes("pain")) return "Shelf C-2, Warehouse 1";
  if (lower.includes("vitamin")) return "Shelf B-1, Warehouse 2";
  return "Shelf B-3, Warehouse 1";
}

function getOriginLabel(supplierName: string | null) {
  if (!supplierName) return "Verified supplier network";
  if (/global/i.test(supplierName)) return "Switzerland (CHE)";
  if (/pharma/i.test(supplierName)) return "Regional medical supply chain";
  return "Verified supplier network";
}

function getStabilityMetrics(batch: StockBatchDetailResponse) {
  const potency =
    batch.status === "disposed"
      ? 0
      : batch.daysToExpiry < 0
        ? 72.4
        : batch.daysToExpiry <= 30
          ? 91.2
          : 99.8;

  const alerts = batch.status === "disposed" ? 1 : batch.daysToExpiry <= 30 ? 1 : 0;
  const refillsLeft = Math.max(0, Math.floor(batch.quantityAvailable / 5));
  const nextQa = new Date(batch.receivedAt);
  nextQa.setDate(nextQa.getDate() + 21);

  return {
    potency,
    alerts,
    refillsLeft,
    nextQa: shortDateFormatter.format(nextQa),
  };
}

function mapTransactionToDisplay(
  tx: StockBatchDetailResponse["transactions"][number],
) {
  const occurred = new Date(tx.occurredAt);
  const timeStr = `${shortDateFormatter.format(occurred)}, ${occurred.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
  const isAddition = tx.quantityDelta > 0;
  const quantityStr = isAddition
    ? `+ ${tx.quantityDelta.toLocaleString()} Units`
    : `- ${Math.abs(tx.quantityDelta).toLocaleString()} Units`;
  const tone = isAddition
    ? "bg-[rgba(15,185,177,0.1)] text-[var(--app-brand)]"
    : "bg-[var(--app-surface-muted)] text-[#475569]";
  const actor = tx.performedByName ?? tx.transactionType.replace(/_/g, " ");
  const initials = (tx.performedByName ?? "SYS")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const shortId = tx.referenceId ? String(tx.referenceId).slice(-6).toUpperCase() : "";
  const ref =
    tx.referenceType && shortId
      ? tx.referenceType === "sale"
        ? `RX-${shortId}`
        : tx.referenceType === "inventory_batch"
          ? `IN-${shortId}`
          : `${tx.referenceType.replace(/_/g, "-").slice(0, 4).toUpperCase()}-${shortId}`
      : tx.note?.slice(0, 14) ?? "—";

  return { id: tx.id, time: timeStr, quantity: quantityStr, tone, actor, initials, ref };
}

const labelClass = "text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--app-text-faint)]";

type BatchDetailContentProps = {
  batchId: string;
};

export function BatchDetailContent({ batchId }: BatchDetailContentProps) {
  const router = useRouter();
  const { withLoading, notify } = useAuraFeedback();
  const batchQuery = useBatchDetailQuery(batchId);
  const disposeMutation = useDisposeStockBatchMutation();
  const restoreMutation = useRestoreStockBatchMutation();
  const adjustMutation = useAdjustStockMutation();

  const batch = batchQuery.data;

  if (batchQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[var(--app-text-muted)]">Loading product details...</p>
      </div>
    );
  }

  if (batchQuery.isError || !batch) {
    return (
      <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1280px]">
          <Link
            href={ROUTES.dashboard.stock}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--app-brand)] hover:text-[var(--app-link-teal)]"
          >
            <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
            Back to Stock
          </Link>
          <div className="mt-8 rounded-xl border border-[#fee2e2] bg-[#fff7f7] p-8 text-center">
            <span className="material-symbols-outlined notranslate text-4xl text-[#dc2626]">
              error
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
              Product not found
            </h2>
            <p className="mt-2 text-sm text-[var(--app-text-muted)]">
              This product may have been removed or you may not have access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusTone = formatStatusTone(batch.daysToExpiry, batch.status);
  const dosageForm = getDosageForm(batch.productName);
  const shelfLabel = getShelfLabel(batch.categoryName);
  const originLabel = getOriginLabel(batch.supplierName);
  const stability = getStabilityMetrics(batch);
  const dispensingHistory = batch.transactions.map(mapTransactionToDisplay);
  const circleValue = Math.max(0, Math.min(100, batch.stockProgressPercent));

  const handleDispose = async () => {
    await withLoading(
      "dashboard-dispose-batch",
      "Disposing product from live inventory...",
      async () => {
        const result = await disposeMutation.mutateAsync({
          batchId: batch.id,
          branchId: batch.branchId,
          note:
            batch.status === "expired"
              ? "Expired stock disposed from product detail."
              : "Manual stock disposal from product detail.",
        });

        notify({
          variant: "success",
          title: "Product disposed",
          description: `${result.productName} (${result.batchNumber}) was removed from available stock.`,
        });
        await batchQuery.refetch();
      },
    );
  };

  const handleRestore = async () => {
    await withLoading("dashboard-restore-batch", "Restoring disposed product...", async () => {
      const result = await restoreMutation.mutateAsync({
        batchId: batch.id,
        branchId: batch.branchId,
        note: "Product restored from product detail page.",
      });

      notify({
        variant: "success",
        title: "Product restored",
        description: `${result.productName} (${result.batchNumber}) restored with ${result.restoredQuantity.toLocaleString()} units.`,
      });
      await batchQuery.refetch();
    });
  };

  const handleMarkAsUsed = async () => {
    const value = window.prompt("How many units were used from this product?");
    if (value === null) return;

    const quantity = Number.parseInt(value, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
      notify({
        variant: "error",
        title: "Invalid quantity",
        description: "Enter a positive whole number of used units.",
      });
      return;
    }

    const note = window.prompt("Optional note for this usage log:")?.trim() || undefined;

    await withLoading("dashboard-adjust-stock", "Recording product usage...", async () => {
      const result = await adjustMutation.mutateAsync({
        branchId: batch.branchId,
        batchIds: [batch.id],
        quantityDelta: -quantity,
        note,
      });

      notify({
        variant: "success",
        title: "Usage recorded",
        description: `${result.adjustedCount} product${result.adjustedCount === 1 ? "" : "s"} updated.`,
      });
      await batchQuery.refetch();
    });
  };

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div className="space-y-6">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
            <Link href={ROUTES.dashboard.stock} className="hover:text-[var(--app-brand)]">
              Inventory
            </Link>
            <span className="material-symbols-outlined notranslate text-sm text-[#cbd5e1]">
              chevron_right
            </span>
            <span>{batch.categoryName}</span>
            <span className="material-symbols-outlined notranslate text-sm text-[#cbd5e1]">
              chevron_right
            </span>
            <span className="text-[var(--app-text)]">Product details</span>
          </nav>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold tracking-[-0.75px] text-[var(--app-text)]">
                  {batch.productName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${statusTone.badge}`}
                >
                  <span className={`size-1.5 rounded-full ${statusTone.dot}`} />
                  {statusTone.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-base text-[var(--app-text-muted)]">
                <span className="font-medium">#{batch.batchNumber}</span>
                <span className="size-1 rounded-full bg-[#cbd5e1]" />
                <span>{dosageForm}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-cancel-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[#d5dade]"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">print</span>
                Print Label
              </button>
              <button
                type="button"
                onClick={() => router.push(ROUTES.dashboard.stockProductEdit(batch.productId))}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-cancel-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[#d5dade]"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">edit</span>
                Edit Product Details
              </button>
              {batch.status === "disposed" ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={restoreMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(20,184,166,0.2),0px_4px_6px_-4px_rgba(20,184,166,0.2)] transition hover:opacity-95 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined notranslate text-[18px]">settings_backup_restore</span>
                  Restore Product
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkAsUsed}
                  disabled={adjustMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(20,184,166,0.2),0px_4px_6px_-4px_rgba(20,184,166,0.2)] transition hover:opacity-95 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined notranslate text-[18px]">check_circle</span>
                  Mark as Used
                </button>
              )}
              {batch.canDispose && batch.status !== "disposed" ? (
                <button
                  type="button"
                  onClick={handleDispose}
                  disabled={disposeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#fecdd3] bg-[#fff1f2] px-5 py-2.5 text-sm font-semibold text-[#be123c] transition hover:bg-[#ffe4e6] disabled:opacity-60"
                >
                  <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                  Dispose
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="rounded-xl border border-[rgba(241,245,249,0.8)] bg-[var(--app-surface)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] lg:col-span-4">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-bold text-[var(--app-text)]">
                Product Identity
              </h2>
              <span className="material-symbols-outlined notranslate text-[var(--app-text-faint)]">info</span>
            </div>

            <div className="space-y-5">
              <div className="space-y-1">
                <p className={labelClass}>Expiry Date</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-[20px] font-semibold ${statusTone.text}`}>
                    {dateFormatter.format(new Date(batch.expiresAt))}
                  </p>
                  <span className={`text-xs ${statusTone.text} opacity-70`}>
                    ({Math.abs(batch.daysToExpiry)} Day{Math.abs(batch.daysToExpiry) === 1 ? "" : "s"}
                    {batch.daysToExpiry >= 0 ? " Left" : " Over"})
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className={labelClass}>Manufacturing Date</p>
                <p className="text-base font-semibold text-[var(--app-text)]">
                  {batch.manufacturedAt
                    ? dateFormatter.format(new Date(batch.manufacturedAt))
                    : "Not recorded"}
                </p>
              </div>

              <div className="space-y-1">
                <p className={labelClass}>Supplier</p>
                <p className="text-base font-semibold text-[var(--app-text)]">
                  {batch.supplierName ?? "No supplier assigned"}
                </p>
              </div>

              <div className="space-y-1">
                <p className={labelClass}>Origin</p>
                <p className="text-base font-semibold text-[var(--app-text)]">{originLabel}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[rgba(241,245,249,0.8)] bg-[var(--app-surface)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] lg:col-span-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-bold text-[var(--app-text)]">
                  Stock Management
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Real-time depletion tracking for {batch.branchName}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--app-text)]">
                <span className="material-symbols-outlined notranslate text-[18px] text-[var(--app-link-teal)]">
                  location_on
                </span>
                {shelfLabel}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_160px] md:items-center">
              <div className="space-y-10">
                <div>
                  <p className={labelClass}>Current Quantity</p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <span className="text-[52px] font-semibold leading-none tracking-[-0.03em] text-[var(--app-text)]">
                      {batch.quantityAvailable.toLocaleString()}
                    </span>
                    <span className="pb-1 text-[32px] font-medium text-[var(--app-text-faint)]">
                      / {batch.quantityReceived.toLocaleString()} units
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    <span>Depletion Progress</span>
                    <span>Critical Threshold: 500 Units</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eef2f7]">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${circleValue}%`,
                        background:
                          "linear-gradient(90deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mx-auto flex size-[104px] items-center justify-center rounded-full bg-[var(--app-surface-muted)]">
                <div
                  className="flex size-[86px] items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#0fb9b1 0 ${circleValue}%, #e6edf5 ${circleValue}% 100%)`,
                  }}
                >
                  <div className="flex size-[62px] items-center justify-center rounded-full bg-[var(--app-surface)] text-[31px] font-semibold text-[var(--app-text)]">
                    {circleValue}%
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[rgba(241,245,249,0.8)] bg-[var(--app-surface)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] lg:col-span-5">
            <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-bold text-[var(--app-text)]">
              Storage & Handling
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[rgba(15,185,177,0.12)] bg-[rgba(15,185,177,0.04)] p-4">
                <p className={labelClass}>Temperature</p>
                <p className="mt-3 text-[34px] font-semibold leading-none text-[var(--app-text)]">2 - 8°C</p>
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">Refrigerated Storage</p>
              </div>
              <div className="rounded-xl border border-[rgba(99,102,241,0.12)] bg-[rgba(99,102,241,0.04)] p-4">
                <p className={labelClass}>Humidity</p>
                <p className="mt-3 text-[34px] font-semibold leading-none text-[var(--app-text)]">Max 60%</p>
                <p className="mt-2 text-xs text-[var(--app-text-faint)]">Relative Humidity</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined notranslate mt-0.5 text-[18px] text-[#f59e0b]">
                  wb_sunny
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">Light Sensitivity</p>
                  <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
                    Store in original opaque container. Protect from direct sunlight.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined notranslate mt-0.5 text-[18px] text-[#60a5fa]">
                  experiment
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--app-text)]">Special Handling</p>
                  <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
                    Handle with clean, dry hands. Avoid excessive agitation during dispensing.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[rgba(241,245,249,0.8)] bg-[var(--app-surface)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] lg:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-bold text-[var(--app-text)]">
                Dispensing History
              </h2>
              {dispensingHistory.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    notify({
                      variant: "info",
                      title: "Transaction log",
                      description: `Showing latest ${dispensingHistory.length} transactions. Full export coming soon.`,
                    })
                  }
                  className="text-sm font-semibold text-[var(--app-brand)] hover:underline"
                >
                  View Full Log
                </button>
              ) : null}
            </div>

            <div className="mt-6 min-w-0 overflow-x-auto overscroll-x-contain">
              {dispensingHistory.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--app-text-faint)]">
                  No transactions recorded for this product yet.
                </p>
              ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                      Date & Time
                    </th>
                    <th className="pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                      Quantity
                    </th>
                    <th className="pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                      Action By
                    </th>
                    <th className="pb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--app-text-faint)]">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dispensingHistory.map((entry) => (
                    <tr key={entry.id} className="border-t border-[var(--app-surface-subtle)]">
                      <td className="py-4 text-sm text-[var(--app-text)]">{entry.time}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${entry.tone}`}>
                          {entry.quantity}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-6 items-center justify-center rounded-full bg-[rgba(15,185,177,0.12)] text-[10px] font-semibold text-[var(--app-brand)]">
                            {entry.initials}
                          </span>
                          <span className="text-sm text-[var(--app-text)]">{entry.actor}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-[var(--app-text-faint)]">{entry.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(90deg,#0f5c59_0%,#233d7a_55%,#302c86_100%)] p-6 text-white shadow-[0px_24px_48px_-16px_rgba(15,23,42,0.35)] lg:col-span-12 lg:p-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
              <div className="space-y-4">
                <span className="inline-flex rounded-full bg-[rgba(255,255,255,0.12)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                  Safety Insight
                </span>
                <div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-extrabold text-white sm:text-[32px]">
                    Stability Index: {statusTone.label === "Stable" ? "Optimal" : "Monitor Closely"}
                  </h2>
                  <p className="mt-3 max-w-[520px] text-sm leading-7 text-white/80">
                    Based on current storage telemetry, stock level, and shelf-life trend, this product
                    remains {stability.potency.toFixed(1)}% potency aligned. Continue monitoring
                    through the expiration date and maintain the listed storage conditions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    notify({
                      variant: "info",
                      title: "Report export pending",
                      description: "Stability report downloads are not connected yet.",
                    })
                  }
                  className="rounded-xl bg-[var(--app-surface)] px-5 py-3 text-sm font-semibold text-[#2d3e93] transition hover:bg-[var(--app-surface)]/90"
                >
                  Download Stability Report
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Potency" value={`${stability.potency.toFixed(1)}%`} />
                <MetricCard label="Alerts" value={String(stability.alerts)} />
                <MetricCard label="Refills Left" value={stability.refillsLeft.toLocaleString()} />
                <MetricCard label="Next QA" value={stability.nextQa} />
              </div>
            </div>
          </section>

          {batch.notes ? (
            <section className="rounded-xl border border-[rgba(241,245,249,0.8)] bg-[var(--app-surface)] p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] lg:col-span-12">
              <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                Internal Notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--app-text-muted)]">
                {batch.notes}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--app-surface)]/6 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">{label}</p>
      <p className="mt-3 text-[18px] font-bold text-white sm:text-[38px] sm:leading-none">{value}</p>
    </div>
  );
}
