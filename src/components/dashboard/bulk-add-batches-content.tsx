"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BarcodeScannerModal } from "@/components/dashboard/barcode-scanner-modal";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useCreateStockBatchesMutation, useStockCatalogQuery } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";
import { createStockBatchSchema } from "@/lib/validation/stock";

type DraftRow = {
  id: string;
  productName: string;
  productBarcode: string;
  batchNumber: string;
  expiresAt: string;
  quantityReceived: string;
  unitOrderPrice: string;
  unitSellingPrice: string;
  supplierName: string;
  categoryName: string;
  purchaseOrderNumber: string;
  notes: string;
};

type RowResult = {
  status: "idle" | "saving" | "success" | "error";
  message?: string;
  created?: { id: string; batchNumber: string; productName: string };
};

/** Unique default for inventory batch number (Product ref). Max 64 chars per API. */
function generateProductRef(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `B-${ymd}-${suffix}`;
}

function createEmptyRow(): DraftRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productName: "",
    productBarcode: "",
    batchNumber: generateProductRef(),
    expiresAt: "",
    quantityReceived: "",
    unitOrderPrice: "",
    unitSellingPrice: "",
    supplierName: "",
    categoryName: "",
    purchaseOrderNumber: "",
    notes: "",
  };
}

const fieldLabel =
  "mb-2 block text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]";
const inputClass =
  "w-full rounded-lg border-0 bg-[var(--app-input-bg)] px-4 py-4 text-base text-[var(--app-text)] outline-none placeholder:text-[#6c7a78]/60 focus:ring-2 focus:ring-[var(--app-brand)]/20";

function buildStockHref(branchId?: string) {
  return branchId
    ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
    : ROUTES.dashboard.stock;
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function BulkAddBatchesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const branchId = searchParams.get("branch") ?? undefined;

  const stockCatalogQuery = useStockCatalogQuery({
    branchId,
    includeProducts: false,
    suppressGlobalLoading: true,
  });
  const createBatchesMutation = useCreateStockBatchesMutation();

  const resolvedBranchId = branchId ?? stockCatalogQuery.data?.branch.id ?? undefined;
  const backToStockHref = buildStockHref(resolvedBranchId);

  const [rows, setRows] = useState<DraftRow[]>(() => [createEmptyRow()]);
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerRowId, setScannerRowId] = useState<string | null>(null);

  const isSaving = createBatchesMutation.isPending;
  const isCatalogPending = stockCatalogQuery.isLoading && !stockCatalogQuery.data;

  const addRow = useCallback(() => {
    setRows((current) => [...current, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((r) => r.id !== rowId)));
    setResults((current) => {
      if (!(rowId in current)) return current;
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  }, []);

  const updateRow = useCallback((rowId: string, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
    setResults((current) => {
      const existing = current[rowId];
      if (!existing || (existing.status !== "error" && existing.status !== "success")) {
        return current;
      }
      return { ...current, [rowId]: { status: "idle" } };
    });
  }, []);

  const rowCountLimit = 50;

  const canAddMore = rows.length < rowCountLimit;

  const renderAddAnotherProductButton = useCallback(
    () => (
      <button
        type="button"
        onClick={addRow}
        disabled={!canAddMore || isSaving}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined notranslate text-lg">add</span>
        Add another product
      </button>
    ),
    [addRow, canAddMore, isSaving],
  );

  const completion = useMemo(() => {
    const totalRequired = rows.length * 6;
    const filled = rows.reduce((acc, row) => {
      const required = [
        row.productName,
        row.batchNumber,
        row.expiresAt,
        row.quantityReceived,
        row.unitOrderPrice,
        row.unitSellingPrice,
      ];
      return acc + required.filter((f) => String(f).trim().length > 0).length;
    }, 0);
    return totalRequired === 0 ? 0 : Math.round((filled / totalRequired) * 100);
  }, [rows]);

  const submitAll = useCallback(async () => {
    if (!resolvedBranchId) {
      notify({
        variant: "error",
        title: "Branch unavailable",
        description: "Wait for branch details to load, then try again.",
      });
      return;
    }

    const prepared = rows.map((row) => {
      const payload = {
        branchId: resolvedBranchId,
        productName: row.productName.trim(),
        ...(normalizeOptional(row.productBarcode) ? { productBarcode: row.productBarcode.trim() } : {}),
        batchNumber: row.batchNumber.trim(),
        categoryName: normalizeOptional(row.categoryName),
        expiresAt: row.expiresAt,
        quantityReceived: Number.parseFloat(row.quantityReceived) || 0,
        unitOrderPrice: Number.parseFloat(row.unitOrderPrice) || 0,
        supplierName: normalizeOptional(row.supplierName),
        purchaseOrderNumber: normalizeOptional(row.purchaseOrderNumber),
        unitSellingPrice: Number.parseFloat(row.unitSellingPrice) || 0,
        notes: normalizeOptional(row.notes),
      };

      return { rowId: row.id, payload };
    });

    const localValidationErrors: Array<{ rowId: string; message: string }> = [];
    for (const item of prepared) {
      const parsed = createStockBatchSchema.safeParse(item.payload);
      if (!parsed.success) {
        localValidationErrors.push({
          rowId: item.rowId,
          message: "Complete the required fields (name, product ref, expiry, quantity, order price, selling price).",
        });
      }
    }

    if (localValidationErrors.length > 0) {
      setResults((current) => {
        const next = { ...current };
        for (const err of localValidationErrors) {
          next[err.rowId] = { status: "error", message: err.message };
        }
        return next;
      });
      notify({
        variant: "error",
        title: "Fix validation errors",
        description: "Some rows are missing required fields. Review the highlighted rows and try again.",
      });
      return;
    }

    setResults((current) => {
      const next = { ...current };
      for (const row of rows) {
        next[row.id] = { status: "saving" };
      }
      return next;
    });

    try {
      const created = await withLoading("dashboard-bulk-add-batches", "Saving products to inventory...", async () => {
        return await createBatchesMutation.mutateAsync(prepared.map((p) => p.payload));
      });

      setResults((current) => {
        const next = { ...current };
        for (let i = 0; i < created.length; i++) {
          const rowId = prepared[i]?.rowId;
          const item = created[i];
          if (!rowId) continue;
          if (item.ok) {
            next[rowId] = {
              status: "success",
              created: item.data,
              message: `${item.data.productName} (${item.data.batchNumber}) saved.`,
            };
          } else {
            next[rowId] = { status: "error", message: item.error ?? "Failed to save this row." };
          }
        }
        return next;
      });

      const okCount = created.filter((r) => r.ok).length;
      const failCount = created.length - okCount;
      notify({
        variant: failCount === 0 ? "success" : "warning",
        title: failCount === 0 ? "Bulk add complete" : "Bulk add partially complete",
        description:
          failCount === 0
            ? `${okCount} product${okCount === 1 ? "" : "s"} saved to inventory.`
            : `${okCount} saved, ${failCount} failed. Fix the failed rows and submit again.`,
      });

      if (failCount === 0) {
        router.push(backToStockHref);
      }
    } catch (err) {
      notify({
        variant: "error",
        title: "Bulk add failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setResults((current) => {
        const next = { ...current };
        for (const row of rows) {
          next[row.id] = { status: "error", message: "Request failed. Try again." };
        }
        return next;
      });
    }
  }, [backToStockHref, createBatchesMutation, notify, resolvedBranchId, router, rows, withLoading]);

  return (
    <div className="px-4 pb-16 pt-2 sm:px-6 lg:px-8">
      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={(open) => {
          setScannerOpen(open);
          if (!open) {
            setScannerRowId(null);
          }
        }}
        onScan={(code) => {
          const trimmed = code.trim();
          if (!trimmed || !scannerRowId) {
            return;
          }
          updateRow(scannerRowId, { productBarcode: trimmed });
          setScannerOpen(false);
          setScannerRowId(null);
          notify({
            variant: "success",
            title: "Barcode captured",
            description: `Stored barcode ${trimmed} on this row.`,
          });
        }}
        title="Scan product barcode"
      />
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              <Link
                href={backToStockHref}
                className="text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78] hover:text-[var(--app-brand)]"
              >
                Aura Stock
              </Link>
              <span className="material-symbols-outlined notranslate text-sm text-[#bbc9c7]">chevron_right</span>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-brand)]">
                Bulk Add
              </span>
            </nav>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-tight text-[var(--app-text)] sm:text-[30px] sm:leading-9 sm:tracking-[-0.025em]">
              Bulk Add Products
            </h1>
            <p className="text-sm text-[#6c7a78]">
              Add multiple products with initial stock batches. Use “+ Add another product” to grow the list.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backToStockHref)}
              className="rounded-xl px-6 py-2.5 text-base font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-input-bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={submitAll}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-8 py-2.5 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,106,101,0.2),0_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving Products..." : "Submit All"}
              <span className="material-symbols-outlined notranslate text-lg">
                {isSaving ? "progress_activity" : "check"}
              </span>
            </button>
          </div>
        </div>

        {isCatalogPending ? (
          <div className="mb-6 rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-4 py-3 text-sm text-[#335c85]">
            Loading branch and supplier details. You can start filling rows while we prepare the rest.
          </div>
        ) : null}

        {stockCatalogQuery.isError ? (
          <div className="mb-6 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
            {stockCatalogQuery.error instanceof Error
              ? stockCatalogQuery.error.message
              : resolvedBranchId
                ? "Branch details could not be fully loaded right now. Supplier suggestions may be unavailable, but you can still save with the selected branch."
                : "Branch details could not be loaded right now. Saving stays disabled until a branch is available."}
          </div>
        ) : null}

        <section className="rounded-xl bg-[var(--app-surface)] p-6 shadow-sm">
          <div
            className="sticky top-[calc(max(5.5rem,env(safe-area-inset-top,0px))+0.5rem)] z-10 -mx-6 mb-4 flex flex-col gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 px-6 pb-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[rgba(0,106,101,0.1)]">
                <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                  playlist_add
                </span>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                  Products ({rows.length})
                </h2>
                <p className="text-xs text-[#6c7a78]">
                  Form completion: <span className="font-semibold text-[var(--app-brand)]">{completion}%</span>
                </p>
              </div>
            </div>

            {renderAddAnotherProductButton()}
          </div>

          {!canAddMore ? (
            <p className="mt-4 text-xs font-medium text-[#9a3412]">
              Limit reached ({rowCountLimit}). Submit what you have, then add more.
            </p>
          ) : null}

          <div className="mt-6 space-y-6">
            {rows.map((row, index) => {
              const result = results[row.id] ?? { status: "idle" as const };
              const statusPill =
                result.status === "success"
                  ? "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]"
                  : result.status === "error"
                    ? "bg-[#fff1f2] text-[#b42318] border-[#fecdd3]"
                    : result.status === "saving"
                      ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
                      : "bg-[var(--app-surface-muted)] text-[var(--app-text-muted)] border-[var(--app-border-ui)]";

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6"
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-[var(--app-text)]">Row {index + 1}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusPill}`}>
                        {result.status}
                      </span>
                      {result.message ? (
                        <span className="text-xs text-[#6c7a78]">{result.message}</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1 || isSaving}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-header-title)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined notranslate text-base">delete</span>
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-7">
                      <div>
                        <label className={fieldLabel} htmlFor={`medication-${row.id}`}>
                          Medication Name
                        </label>
                        <input
                          id={`medication-${row.id}`}
                          type="text"
                          value={row.productName}
                          onChange={(e) => updateRow(row.id, { productName: e.target.value })}
                          placeholder="e.g. Amoxicillin 500mg Capsules"
                          className={inputClass}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label className={fieldLabel} htmlFor={`barcode-${row.id}`}>
                            Barcode (Optional)
                          </label>
                        <div className="relative">
                          <input
                            id={`barcode-${row.id}`}
                            type="text"
                            value={row.productBarcode}
                            onChange={(e) => updateRow(row.id, { productBarcode: e.target.value })}
                            placeholder="Scan or type barcode"
                            className={`${inputClass} pr-12`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setScannerRowId(row.id);
                              setScannerOpen(true);
                            }}
                            disabled={isSaving}
                            className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md bg-[rgba(15,185,177,0.2)] p-2 text-[#004340] transition hover:bg-[rgba(15,185,177,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Scan barcode"
                          >
                            <span className="material-symbols-outlined notranslate text-base">
                              barcode_scanner
                            </span>
                          </button>
                        </div>
                        </div>
                        <div>
                          <label className={fieldLabel} htmlFor={`batchNumber-${row.id}`}>
                            Product ref
                          </label>
                          <input
                            id={`batchNumber-${row.id}`}
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) => updateRow(row.id, { batchNumber: e.target.value })}
                            className={inputClass}
                            placeholder="Auto-generated, editable"
                          />
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label className={fieldLabel} htmlFor={`expiry-${row.id}`}>
                            Expiry Date
                          </label>
                          <div className="relative">
                            <input
                              id={`expiry-${row.id}`}
                              type="date"
                              value={row.expiresAt}
                              onChange={(e) => updateRow(row.id, { expiresAt: e.target.value })}
                              className={inputClass}
                              autoComplete="off"
                            />
                            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
                              calendar_today
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className={fieldLabel} htmlFor={`category-${row.id}`}>
                            Category
                          </label>
                          <input
                            id={`category-${row.id}`}
                            type="text"
                            value={row.categoryName}
                            onChange={(e) => updateRow(row.id, { categoryName: e.target.value })}
                            placeholder="e.g. Antibiotics"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 lg:col-span-5">
                      <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-3">
                        <div className="sm:col-span-1">
                          <label className={fieldLabel} htmlFor={`quantity-${row.id}`}>
                            Quantity (Units)
                          </label>
                          <input
                            id={`quantity-${row.id}`}
                            type="number"
                            min={0}
                            value={row.quantityReceived}
                            onChange={(e) => updateRow(row.id, { quantityReceived: e.target.value })}
                            placeholder="0"
                            className={inputClass}
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className={fieldLabel} htmlFor={`unitOrderPrice-${row.id}`}>
                            Order Price (Per Unit)
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6c7a78]">
                              ZMW
                            </span>
                            <input
                              id={`unitOrderPrice-${row.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.unitOrderPrice}
                              onChange={(e) => updateRow(row.id, { unitOrderPrice: e.target.value })}
                              placeholder="0.00"
                              className={`${inputClass} pl-14`}
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <label className={fieldLabel} htmlFor={`unitSellingPrice-${row.id}`}>
                            Selling Price (Per Unit)
                          </label>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6c7a78]">
                              ZMW
                            </span>
                            <input
                              id={`unitSellingPrice-${row.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              value={row.unitSellingPrice}
                              onChange={(e) => updateRow(row.id, { unitSellingPrice: e.target.value })}
                              placeholder="0.00"
                              className={`${inputClass} pl-14`}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabel} htmlFor={`supplier-${row.id}`}>
                          Supplier
                        </label>
                        <div className="relative">
                          <input
                            id={`supplier-${row.id}`}
                            list="stock-supplier-suggestions"
                            value={row.supplierName}
                            onChange={(e) => updateRow(row.id, { supplierName: e.target.value })}
                            className={`${inputClass} pr-10 ${
                              row.supplierName ? "text-[var(--app-text)]" : "text-[#6b7280]"
                            }`}
                            placeholder="Search or enter supplier"
                          />
                          <datalist id="stock-supplier-suggestions">
                            {stockCatalogQuery.data?.suppliers.map((s) => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                          <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
                            expand_more
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <label className={fieldLabel} htmlFor={`purchaseOrderNumber-${row.id}`}>
                            Purchase Order
                          </label>
                          <input
                            id={`purchaseOrderNumber-${row.id}`}
                            type="text"
                            value={row.purchaseOrderNumber}
                            onChange={(e) => updateRow(row.id, { purchaseOrderNumber: e.target.value })}
                            placeholder="Optional PO number"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={fieldLabel} htmlFor={`branchContext-${row.id}`}>
                            Branch Context
                          </label>
                          <input
                            id={`branchContext-${row.id}`}
                            type="text"
                            value={
                              stockCatalogQuery.data?.branch.name ??
                              (stockCatalogQuery.isError ? "Branch unavailable" : "Loading branch...")
                            }
                            readOnly
                            className={`${inputClass} cursor-not-allowed text-[#6c7a78]`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabel} htmlFor={`notes-${row.id}`}>
                          Notes
                        </label>
                        <textarea
                          id={`notes-${row.id}`}
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          rows={3}
                          placeholder="Optional receiving notes"
                          className={`${inputClass} resize-none`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-stretch gap-3 border-t border-[var(--app-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6c7a78] sm:max-w-md">
              Finished a row? Add the next product here without scrolling back up.
            </p>
            {renderAddAnotherProductButton()}
          </div>
        </section>
      </div>
    </div>
  );
}

