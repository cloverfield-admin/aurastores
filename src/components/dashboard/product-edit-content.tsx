"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useAllProductCategoriesQuery } from "@/lib/queries/product-categories";
import {
  useAdjustStockMutation,
  useStockProductBatchesQuery,
  useStockProductQuery,
  useUpdateStockBatchMutation,
  useUpdateStockProductMutation,
} from "@/lib/queries/stock";
import { isOfflineQueuedError } from "@/lib/offline/offline-queued-error";
import { ROUTES } from "@/lib/routes";

const fieldLabel =
  "mb-2 block text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]";
const inputClass =
  "w-full rounded-lg border-0 bg-[var(--app-input-bg)] px-4 py-4 text-base text-[var(--app-text)] outline-none placeholder:text-[#6c7a78]/60 focus:ring-2 focus:ring-[var(--app-brand)]/20";

function toDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function ProductEditContent({ productId }: { productId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const productQuery = useStockProductQuery(productId);
  const updateMutation = useUpdateStockProductMutation();
  const updateBatchMutation = useUpdateStockBatchMutation();
  const adjustStockMutation = useAdjustStockMutation();
  const categoriesQuery = useAllProductCategoriesQuery({ includeArchived: false });

  const branchId = searchParams.get("branch") ?? undefined;
  const batchesQuery = useStockProductBatchesQuery(productId, branchId, Boolean(productId));

  const product = productQuery.data ?? null;

  const batches = batchesQuery.data?.batches ?? [];

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesQuery.data]);

  const isLoading = productQuery.isLoading && !productQuery.data;
  const isSaving =
    updateMutation.isPending || updateBatchMutation.isPending || adjustStockMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[var(--app-text-muted)]">Loading product…</p>
      </div>
    );
  }

  if (productQuery.isError || !product) {
    return (
      <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[900px]">
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

  return (
    <ProductEditForm
      key={`${product.id}::${batchesQuery.data?.branchId ?? branchId ?? "no-branch"}`}
      product={product}
      batches={batches}
      batchesLoading={batchesQuery.isLoading}
      categoryOptions={categoryOptions}
      isSaving={isSaving}
      canSave={!isSaving}
      onSave={async ({ productPayload, batchId, batchPatch, quantityAdjustment }) => {
        let offlineQuantityQueued = false;
        await withLoading("dashboard-edit-product", "Saving product...", async () => {
          if (batchId && batchPatch) {
            await updateBatchMutation.mutateAsync({
              batchId,
              payload: {
                branchId,
                ...batchPatch,
              },
            });
          }
          if (Object.keys(productPayload).length > 0) {
            await updateMutation.mutateAsync({ productId, payload: productPayload });
          }
          if (quantityAdjustment && quantityAdjustment.quantityDelta !== 0) {
            try {
              await adjustStockMutation.mutateAsync({
                idempotencyKey: crypto.randomUUID(),
                branchId,
                batchIds: [quantityAdjustment.batchId],
                quantityDelta: quantityAdjustment.quantityDelta,
              });
            } catch (err) {
              if (isOfflineQueuedError(err)) {
                offlineQuantityQueued = true;
              } else {
                throw err;
              }
            }
          }
        });
        return { offlineQuantityQueued };
      }}
      onCancel={() => router.back()}
      onDone={() => router.push(ROUTES.dashboard.stock)}
      notify={notify}
    />
  );
}

function ProductEditForm({
  product,
  batches,
  batchesLoading,
  categoryOptions,
  isSaving,
  canSave,
  onSave,
  onCancel,
  onDone,
  notify,
}: {
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    categoryId: string | null;
    categoryName: string;
    defaultSellingPriceCents: number;
    status: "active" | "discontinued";
  };
  batches: Array<{
    id: string;
    batchNumber: string;
    expiresAt: string;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    quantityAvailable: number;
    receivedAt: string;
  }>;
  batchesLoading: boolean;
  categoryOptions: Array<{ id: string; name: string }>;
  isSaving: boolean;
  canSave: boolean;
  onSave: (args: {
    productPayload: Parameters<ReturnType<typeof useUpdateStockProductMutation>["mutateAsync"]>[0]["payload"];
    batchId?: string;
    batchPatch?: {
      expiresAt?: string;
      batchNumber?: string;
      purchaseOrderNumber?: string | null;
      manufacturedAt?: string | null;
      unitOrderPrice?: number;
      unitSellingPrice?: number;
      notes?: string | null;
      status?: "draft" | "active" | "quarantined" | "expired" | "disposed" | "depleted";
    };
    quantityAdjustment?: { batchId: string; quantityDelta: number };
  }) => Promise<{ offlineQuantityQueued?: boolean }>;
  onCancel: () => void;
  onDone: () => void;
  notify: (args: { variant: "error" | "info" | "success"; title: string; description: string }) => void;
}) {
  const [name, setName] = useState(product.name);
  const [categoryName, setCategoryName] = useState(
    product.categoryName === "Uncategorized" ? "" : product.categoryName,
  );
  const [barcode, setBarcode] = useState(product.barcode ?? "");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState(
    (product.defaultSellingPriceCents / 100).toFixed(2),
  );
  const [status, setStatus] = useState<"active" | "discontinued">(product.status);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [batchExpiryById, setBatchExpiryById] = useState<Record<string, string>>({});
  const [batchNumberById, setBatchNumberById] = useState<Record<string, string>>({});
  const [batchPoNumberById, setBatchPoNumberById] = useState<Record<string, string>>({});
  const [batchManufacturedAtById, setBatchManufacturedAtById] = useState<Record<string, string>>({});
  const [batchUnitOrderPriceById, setBatchUnitOrderPriceById] = useState<Record<string, string>>({});
  const [batchUnitSellingPriceById, setBatchUnitSellingPriceById] = useState<Record<string, string>>({});
  const [batchNotesById, setBatchNotesById] = useState<Record<string, string>>({});
  const [batchStatusById, setBatchStatusById] = useState<
    Record<string, "draft" | "active" | "quarantined" | "expired" | "disposed" | "depleted">
  >({});
  const [batchQuantityById, setBatchQuantityById] = useState<Record<string, string>>({});

  const effectiveBatchId = selectedBatchId || batches[0]?.id || "";
  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === effectiveBatchId) ?? null,
    [batches, effectiveBatchId],
  );

  const defaultBatchExpiry = selectedBatch ? toDateInputValue(selectedBatch.expiresAt) : "";
  const batchExpiry = (effectiveBatchId ? batchExpiryById[effectiveBatchId] : undefined) ?? defaultBatchExpiry;
  const batchNumber = (effectiveBatchId ? batchNumberById[effectiveBatchId] : undefined) ?? (selectedBatch?.batchNumber ?? "");
  const purchaseOrderNumber =
    (effectiveBatchId ? batchPoNumberById[effectiveBatchId] : undefined) ?? "";
  const manufacturedAt =
    (effectiveBatchId ? batchManufacturedAtById[effectiveBatchId] : undefined) ?? "";
  const unitOrderPrice =
    (effectiveBatchId ? batchUnitOrderPriceById[effectiveBatchId] : undefined) ?? "";
  const unitSellingPrice =
    (effectiveBatchId ? batchUnitSellingPriceById[effectiveBatchId] : undefined) ?? "";
  const notes = (effectiveBatchId ? batchNotesById[effectiveBatchId] : undefined) ?? "";
  const batchStatus =
    (effectiveBatchId ? batchStatusById[effectiveBatchId] : undefined) ?? "active";
  const defaultQuantityOnHand =
    selectedBatch != null ? String(selectedBatch.quantityAvailable) : "";
  const quantityOnHand =
    (effectiveBatchId ? batchQuantityById[effectiveBatchId] : undefined) ?? defaultQuantityOnHand;

  const hasChanges = useMemo(() => {
    const nextName = name.trim();
    const nextCategory = categoryName.trim();
    const nextBarcode = barcode.trim();
    const nextPrice = Number.parseFloat(defaultSellingPrice);
    const nextPriceCents = Number.isFinite(nextPrice) ? Math.round(nextPrice * 100) : NaN;

    const batchExpiryChanged =
      Boolean(selectedBatch) &&
      /^\d{4}-\d{2}-\d{2}$/.test(batchExpiry.trim()) &&
      batchExpiry.trim() !== defaultBatchExpiry;

    const batchNumberChanged = selectedBatch != null && batchNumber.trim() !== selectedBatch.batchNumber;

    const quantityFieldDirty =
      selectedBatch != null &&
      selectedBatch.status !== "disposed" &&
      quantityOnHand.trim() !== String(selectedBatch.quantityAvailable);

    return (
      nextName !== product.name ||
      (nextCategory || "") !== (product.categoryName === "Uncategorized" ? "" : product.categoryName) ||
      (nextBarcode || "") !== (product.barcode ?? "") ||
      (Number.isFinite(nextPriceCents) ? nextPriceCents : product.defaultSellingPriceCents) !==
        product.defaultSellingPriceCents ||
      status !== product.status ||
      batchExpiryChanged ||
      batchNumberChanged ||
      purchaseOrderNumber.trim() !== "" ||
      manufacturedAt.trim() !== "" ||
      unitOrderPrice.trim() !== "" ||
      unitSellingPrice.trim() !== "" ||
      notes.trim() !== "" ||
      batchStatus !== "active" ||
      quantityFieldDirty
    );
  }, [
    barcode,
    batchExpiry,
    batchNumber,
    purchaseOrderNumber,
    manufacturedAt,
    unitOrderPrice,
    unitSellingPrice,
    notes,
    batchStatus,
    quantityOnHand,
    categoryName,
    defaultBatchExpiry,
    defaultSellingPrice,
    name,
    product,
    selectedBatch,
    status,
  ]);

  const canSubmit = hasChanges && canSave;

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[900px] space-y-8">
        <div className="space-y-4">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
            <Link href={ROUTES.dashboard.stock} className="hover:text-[var(--app-brand)]">
              Inventory
            </Link>
            <span className="material-symbols-outlined notranslate text-sm text-[#cbd5e1]">
              chevron_right
            </span>
            <span className="text-[var(--app-text)]">Edit product</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold tracking-[-0.75px] text-[var(--app-text)]">
                Edit Product
              </h1>
              <p className="text-sm text-[var(--app-text-muted)]">
                Update how this product appears across stock and sales.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-[var(--app-cancel-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[#d5dade]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={async () => {
                  const trimmedName = name.trim();
                  const trimmedCategory = categoryName.trim();
                  const trimmedBarcode = barcode.trim();
                  const parsedPrice = Number.parseFloat(defaultSellingPrice);
                  const trimmedBatchExpiry = batchExpiry.trim();
                  const trimmedBatchNumber = batchNumber.trim();
                  const trimmedPurchaseOrderNumber = purchaseOrderNumber.trim();
                  const trimmedManufacturedAt = manufacturedAt.trim();
                  const trimmedUnitOrderPrice = unitOrderPrice.trim();
                  const trimmedUnitSellingPrice = unitSellingPrice.trim();
                  const trimmedNotes = notes.trim();
                  const trimmedQuantityOnHand = quantityOnHand.trim();

                  if (!trimmedName || trimmedName.length < 2) {
                    notify({
                      variant: "error",
                      title: "Invalid name",
                      description: "Enter a product name with at least 2 characters.",
                    });
                    return;
                  }

                  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                    notify({
                      variant: "error",
                      title: "Invalid price",
                      description: "Enter a non-negative selling price.",
                    });
                    return;
                  }

                  const payload: Parameters<
                    ReturnType<typeof useUpdateStockProductMutation>["mutateAsync"]
                  >[0]["payload"] = {};

                  if (trimmedName !== product.name) {
                    payload.name = trimmedName;
                  }

                  const currentCategory = product.categoryName === "Uncategorized" ? "" : product.categoryName;
                  if (trimmedCategory !== currentCategory) {
                    payload.categoryName = trimmedCategory ? trimmedCategory : null;
                  }

                  const currentBarcode = product.barcode ?? "";
                  if (trimmedBarcode !== currentBarcode) {
                    payload.barcode = trimmedBarcode ? trimmedBarcode : null;
                  }

                  const nextPriceCents = Math.round(parsedPrice * 100);
                  if (nextPriceCents !== product.defaultSellingPriceCents) {
                    payload.defaultSellingPrice = parsedPrice;
                  }

                  if (status !== product.status) {
                    payload.status = status;
                  }

                  const batchPatch: NonNullable<Parameters<typeof onSave>[0]["batchPatch"]> = {};
                  if (selectedBatch) {
                    if (trimmedBatchExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedBatchExpiry)) {
                      notify({
                        variant: "error",
                        title: "Invalid expiry date",
                        description: "Use the date picker to select a valid expiry date.",
                      });
                      return;
                    }

                    if (trimmedManufacturedAt && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedManufacturedAt)) {
                      notify({
                        variant: "error",
                        title: "Invalid manufactured date",
                        description: "Use YYYY-MM-DD date format.",
                      });
                      return;
                    }

                    if (trimmedBatchExpiry && trimmedBatchExpiry !== defaultBatchExpiry) {
                      batchPatch.expiresAt = trimmedBatchExpiry;
                    }
                    if (trimmedBatchNumber && trimmedBatchNumber !== selectedBatch.batchNumber) {
                      batchPatch.batchNumber = trimmedBatchNumber;
                    }
                    if (trimmedPurchaseOrderNumber) {
                      batchPatch.purchaseOrderNumber = trimmedPurchaseOrderNumber;
                    }
                    if (trimmedManufacturedAt) {
                      batchPatch.manufacturedAt = trimmedManufacturedAt;
                    }
                    if (trimmedUnitOrderPrice) {
                      const parsed = Number.parseFloat(trimmedUnitOrderPrice);
                      if (!Number.isFinite(parsed) || parsed <= 0) {
                        notify({
                          variant: "error",
                          title: "Invalid unit order price",
                          description: "Enter a positive number.",
                        });
                        return;
                      }
                      batchPatch.unitOrderPrice = parsed;
                    }
                    if (trimmedUnitSellingPrice) {
                      const parsed = Number.parseFloat(trimmedUnitSellingPrice);
                      if (!Number.isFinite(parsed) || parsed < 0) {
                        notify({
                          variant: "error",
                          title: "Invalid unit selling price",
                          description: "Enter a non-negative number.",
                        });
                        return;
                      }
                      batchPatch.unitSellingPrice = parsed;
                    }
                    if (trimmedNotes) {
                      batchPatch.notes = trimmedNotes;
                    }
                    if (batchStatus && batchStatus !== "active") {
                      batchPatch.status = batchStatus;
                    }
                  }

                  const disposingThisBatch =
                    Boolean(selectedBatch) &&
                    (selectedBatch!.status === "disposed" || batchPatch.status === "disposed");

                  let quantityAdjustment: { batchId: string; quantityDelta: number } | undefined;
                  if (
                    selectedBatch &&
                    selectedBatch.status !== "disposed" &&
                    trimmedQuantityOnHand !== String(selectedBatch.quantityAvailable)
                  ) {
                    const parsedQty = Number.parseInt(trimmedQuantityOnHand, 10);
                    if (!Number.isFinite(parsedQty) || parsedQty < 0 || parsedQty > 1_000_000) {
                      notify({
                        variant: "error",
                        title: "Invalid quantity",
                        description: "Enter a whole number from 0 to 1,000,000.",
                      });
                      return;
                    }
                    const quantityDelta = parsedQty - selectedBatch.quantityAvailable;
                    if (quantityDelta !== 0 && !disposingThisBatch) {
                      quantityAdjustment = { batchId: selectedBatch.id, quantityDelta };
                    }
                  }

                  if (!selectedBatch && (trimmedBatchExpiry || trimmedBatchNumber)) {
                    notify({
                      variant: "error",
                      title: "No batch selected",
                      description: "Choose an inventory batch before updating batch details.",
                    });
                    return;
                  }

                  const hasBatchPatch = Object.keys(batchPatch).length > 0;
                  const hasQuantityAdjustment =
                    quantityAdjustment != null && quantityAdjustment.quantityDelta !== 0;
                  if (Object.keys(payload).length === 0 && !hasBatchPatch && !hasQuantityAdjustment) {
                    notify({
                      variant: "info",
                      title: "No changes",
                      description: "Make a change before saving.",
                    });
                    return;
                  }

                  try {
                    const saveResult = await onSave({
                      productPayload: payload,
                      ...(hasBatchPatch ? { batchId: selectedBatch!.id, batchPatch } : {}),
                      ...(hasQuantityAdjustment ? { quantityAdjustment } : {}),
                    });
                    notify({
                      variant: "success",
                      title: "Saved changes",
                      description: saveResult?.offlineQuantityQueued
                        ? "Your updates were saved. The quantity change will sync when you are back online."
                        : "Your changes have been saved.",
                    });
                    onDone();
                  } catch (err) {
                    notify({
                      variant: "error",
                      title: "Update failed",
                      description: err instanceof Error ? err.message : "Please try again.",
                    });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(20,184,166,0.2),0px_4px_6px_-4px_rgba(20,184,166,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">
                  {isSaving ? "progress_activity" : "check"}
                </span>
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>

        <section className="rounded-xl bg-[var(--app-surface)] p-8 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel} htmlFor="product-name">
                Product name
              </label>
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Amoxicillin 500mg Capsules"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className={fieldLabel} htmlFor="product-category">
                Category
              </label>
              <input
                id="product-category"
                type="text"
                list="product-category-options"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className={inputClass}
                placeholder="Optional"
                autoComplete="off"
                spellCheck={false}
              />
              <datalist id="product-category-options">
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <p className="mt-2 text-[11px] text-[#6c7a78]">
                Leave blank to mark as Uncategorized. You can type a new category name to create it.
              </p>
            </div>

            <div>
              <label className={fieldLabel} htmlFor="product-barcode">
                Barcode
              </label>
              <input
                id="product-barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className={inputClass}
                placeholder="Optional"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="mt-2 text-[11px] text-[#6c7a78]">
                Barcodes must be unique within your organization. Leave blank to clear.
              </p>
            </div>

            <div>
              <label className={fieldLabel} htmlFor="product-price">
                Default selling price (ZMW)
              </label>
              <input
                id="product-price"
                type="number"
                min={0}
                step="0.01"
                value={defaultSellingPrice}
                onChange={(e) => setDefaultSellingPrice(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={fieldLabel} htmlFor="product-status">
                Status
              </label>
              <select
                id="product-status"
                value={status}
                onChange={(e) => setStatus(e.target.value === "discontinued" ? "discontinued" : "active")}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="mt-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] p-6">
                <h2 className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[var(--app-text)]">
                  Inventory batch expiry
                </h2>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  Expiry dates are tracked per batch, not per product.
                </p>

                {batchesLoading ? (
                  <p className="mt-4 text-sm text-[var(--app-text-muted)]">Loading batches…</p>
                ) : batches.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--app-text-muted)]">
                    No batches found for this product in the current branch. Add stock to set an expiry date.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className={fieldLabel} htmlFor="batch-select">
                        Batch
                      </label>
                      <select
                        id="batch-select"
                        value={effectiveBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batchNumber} · {batch.status.replace(/_/g, " ")} · {batch.quantityAvailable} left
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="batch-quantity">
                        Quantity on hand
                      </label>
                      <input
                        id="batch-quantity"
                        type="number"
                        min={0}
                        max={1_000_000}
                        step={1}
                        inputMode="numeric"
                        value={quantityOnHand}
                        disabled={!selectedBatch || selectedBatch.status === "disposed"}
                        onChange={(e) =>
                          setBatchQuantityById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                      />
                      <p className="mt-2 text-[11px] text-[#6c7a78]">
                        {selectedBatch?.status === "disposed"
                          ? "Disposed batches cannot be quantity-adjusted."
                          : "Applies to the selected batch in the current branch when you save."}
                      </p>
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="batch-expiry">
                        Expiry date
                      </label>
                      <input
                        id="batch-expiry"
                        type="date"
                        value={batchExpiry}
                        onChange={(e) =>
                          setBatchExpiryById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                      />
                      <p className="mt-2 text-[11px] text-[#6c7a78]">
                        This updates the selected batch in the current branch.
                      </p>
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="batch-number">
                        Batch number
                      </label>
                      <input
                        id="batch-number"
                        type="text"
                        value={batchNumber}
                        onChange={(e) =>
                          setBatchNumberById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="po-number">
                        Purchase order number
                      </label>
                      <input
                        id="po-number"
                        type="text"
                        value={purchaseOrderNumber}
                        onChange={(e) =>
                          setBatchPoNumberById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="manufactured-at">
                        Manufactured date
                      </label>
                      <input
                        id="manufactured-at"
                        type="date"
                        value={manufacturedAt}
                        onChange={(e) =>
                          setBatchManufacturedAtById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="unit-order-price">
                        Unit order price
                      </label>
                      <input
                        id="unit-order-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitOrderPrice}
                        onChange={(e) =>
                          setBatchUnitOrderPriceById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="unit-selling-price">
                        Unit selling price
                      </label>
                      <input
                        id="unit-selling-price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitSellingPrice}
                        onChange={(e) =>
                          setBatchUnitSellingPriceById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className={fieldLabel} htmlFor="batch-status">
                        Batch status
                      </label>
                      <select
                        id="batch-status"
                        value={batchStatus}
                        onChange={(e) =>
                          setBatchStatusById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId
                              ? {
                                  [effectiveBatchId]:
                                    e.target.value === "draft"
                                      ? "draft"
                                      : e.target.value === "quarantined"
                                        ? "quarantined"
                                        : e.target.value === "expired"
                                          ? "expired"
                                          : e.target.value === "disposed"
                                            ? "disposed"
                                            : e.target.value === "depleted"
                                              ? "depleted"
                                              : "active",
                                }
                              : null),
                          }))
                        }
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="quarantined">Quarantined</option>
                        <option value="expired">Expired</option>
                        <option value="depleted">Depleted</option>
                        <option value="disposed">Disposed</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={fieldLabel} htmlFor="batch-notes">
                        Batch notes
                      </label>
                      <textarea
                        id="batch-notes"
                        value={notes}
                        onChange={(e) =>
                          setBatchNotesById((prev) => ({
                            ...prev,
                            ...(effectiveBatchId ? { [effectiveBatchId]: e.target.value } : null),
                          }))
                        }
                        className={inputClass}
                        rows={4}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

