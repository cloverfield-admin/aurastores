"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useCreateStockBatchMutation,
  useStockCatalogQuery,
} from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";

const fieldLabel =
  "mb-2 block text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]";
const inputClass =
  "w-full rounded-lg border-0 bg-[#f2f4f6] px-4 py-4 text-base text-[#191c1e] outline-none placeholder:text-[#6c7a78]/60 focus:ring-2 focus:ring-[#006a65]/20";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

function formatRelativeEntry(isoString: string) {
  const diffMinutes = Math.round((Date.now() - new Date(isoString).getTime()) / 60_000);

  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}

export function AddNewBatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const branchId = searchParams.get("branch") ?? undefined;
  const stockCatalogQuery = useStockCatalogQuery({ branchId });
  const createBatchMutation = useCreateStockBatchMutation();
  const [productName, setProductName] = useState("");
  const [batchNumber, setBatchNumber] = useState("B-2024-XP9");
  const [category, setCategory] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [notes, setNotes] = useState("");

  const q = Number.parseFloat(quantity) || 0;
  const p = Number.parseFloat(unitPrice) || 0;
  const totalValue = q * p;

  const completion = useMemo(() => {
    const fields = [productName, batchNumber, expiry, quantity, unitPrice];
    const filled = fields.filter((f) => String(f).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [productName, batchNumber, expiry, quantity, unitPrice]);

  const previewMedication = productName.trim() || "Amoxicillin 500mg Capsules";
  const recentEntries = stockCatalogQuery.data?.recentEntries ?? [];
  const isSaveDisabled =
    !productName.trim() || !batchNumber.trim() || !expiry || q <= 0 || p <= 0;

  return (
    <div className="px-4 pb-16 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        {/* Page header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              <Link
                href={
                  branchId
                    ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
                    : ROUTES.dashboard.stock
                }
                className="text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78] hover:text-[#006a65]"
              >
                Aura Stock
              </Link>
              <span className="material-symbols-outlined notranslate text-sm text-[#bbc9c7]">
                chevron_right
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#006a65]">
                New Batch
              </span>
            </nav>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-tight text-[#191c1e] sm:text-[30px] sm:leading-9 sm:tracking-[-0.025em]">
              Add New Batch
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                router.push(
                  branchId
                    ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
                    : ROUTES.dashboard.stock,
                )
              }
              className="rounded-xl px-6 py-2.5 text-base font-medium text-[#3c4948] transition hover:bg-[#f2f4f6]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (isSaveDisabled) {
                  notify({
                    variant: "error",
                    title: "Complete the required fields",
                    description: "Add the product, batch, expiry date, quantity, and purchase price.",
                  });
                  return;
                }

                try {
                  await withLoading(
                    "dashboard-add-batch",
                    "Saving batch to inventory...",
                    async () => {
                      const result = await createBatchMutation.mutateAsync({
                        branchId,
                        productName: productName.trim(),
                        batchNumber: batchNumber.trim(),
                        categoryName: category.trim() || undefined,
                        expiresAt: expiry,
                        quantityReceived: q,
                        unitCost: p,
                        supplierName: supplier.trim() || undefined,
                        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
                        notes: notes.trim() || undefined,
                      });

                      notify({
                        variant: "success",
                        title: "Batch saved",
                        description: `${result.productName} (${result.batchNumber}) was added to inventory.`,
                      });
                      router.push(
                        branchId
                          ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
                          : ROUTES.dashboard.stock,
                      );
                    },
                  );
                } catch (err) {
                  notify({
                    variant: "error",
                    title: "Failed to save batch",
                    description: err instanceof Error ? err.message : "Please try again.",
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-8 py-2.5 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,106,101,0.2),0_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95"
            >
              Review &amp; Save
              <span className="material-symbols-outlined notranslate text-lg">check</span>
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: forms */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Product Specification */}
            <section className="rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[rgba(0,106,101,0.1)]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                    medication
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                  Product Specification
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={fieldLabel} htmlFor="medication">
                    Medication Name
                  </label>
                  <div className="relative">
                    <input
                      id="medication"
                      type="text"
                      list="stock-product-suggestions"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Amoxicillin 500mg Capsules"
                      className={`${inputClass} pr-36`}
                      autoComplete="off"
                    />
                    <datalist id="stock-product-suggestions">
                      {stockCatalogQuery.data?.products.map((product) => (
                        <option key={product.id} value={product.name} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md bg-[rgba(15,185,177,0.2)] px-3 py-1 text-xs font-semibold text-[#004340] transition hover:bg-[rgba(15,185,177,0.3)]"
                    >
                      <span className="material-symbols-outlined notranslate text-base">
                        barcode_scanner
                      </span>
                      Scan Barcode
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-[#6c7a78]">
                    Existing products appear as suggestions. New names create a product record
                    automatically for your branch.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel} htmlFor="batchNumber">
                      Batch Number
                    </label>
                    <input
                      id="batchNumber"
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className={inputClass}
                      placeholder="B-2024-XP9"
                    />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="expiry">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <input
                        id="expiry"
                        type="date"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className={inputClass}
                        autoComplete="off"
                      />
                      <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b]">
                        calendar_today
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="category">
                    Category
                  </label>
                  <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Antibiotics"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Logistics & Pricing */}
            <section className="rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[rgba(70,72,212,0.1)]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#4648d4]">
                    local_shipping
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                  Logistics &amp; Pricing
                </h2>
              </div>

              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel} htmlFor="quantity">
                      Quantity (Units)
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="unitPrice">
                      Purchase Price (Per Unit)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6c7a78]">
                        ZMW
                      </span>
                      <input
                        id="unitPrice"
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass} pl-14`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="supplier">
                    Supplier
                  </label>
                  <div className="relative">
                    <input
                      id="supplier"
                      list="stock-supplier-suggestions"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className={`${inputClass} pr-10 ${supplier ? "text-[#191c1e]" : "text-[#6b7280]"}`}
                      placeholder="Search or enter supplier"
                    />
                    <datalist id="stock-supplier-suggestions">
                      {stockCatalogQuery.data?.suppliers.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                    <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b]">
                      expand_more
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel} htmlFor="purchaseOrderNumber">
                      Purchase Order
                    </label>
                    <input
                      id="purchaseOrderNumber"
                      type="text"
                      value={purchaseOrderNumber}
                      onChange={(e) => setPurchaseOrderNumber(e.target.value)}
                      placeholder="Optional PO number"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="branchContext">
                      Branch Context
                    </label>
                    <input
                      id="branchContext"
                      type="text"
                      value={stockCatalogQuery.data?.branch.name ?? "Loading branch..."}
                      readOnly
                      className={`${inputClass} cursor-not-allowed text-[#6c7a78]`}
                    />
                  </div>
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Optional receiving notes"
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            {/* Pro Tip */}
            <div className="relative overflow-hidden rounded-xl bg-[#006a65] p-6">
              <div
                className="pointer-events-none absolute -bottom-4 -right-4 size-28 rounded-full bg-white/10 blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-lg text-white">
                    lightbulb
                  </span>
                  <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-white">
                    Pro Tip
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-[#4ddbd2]">
                  Use suggested product and supplier names to keep inventory records normalized.
                  New values are safely created only when they do not already exist.
                </p>
              </div>
            </div>

            {/* Batch Preview */}
            <div className="relative rounded-xl border border-[rgba(0,106,101,0.05)] bg-[#f2f4f6] p-6 shadow-md">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                  Batch Preview
                </h3>
                <span className="rounded-full border border-[rgba(0,106,101,0.2)] bg-[rgba(0,106,101,0.1)] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#006a65]">
                  DRAFT
                </span>
              </div>

              <div className="space-y-6 border-b border-[rgba(187,201,199,0.2)] pb-5">
                <p className="text-[10px] font-normal uppercase tracking-wider text-[#6c7a78]">
                  Selected Medication
                </p>
                <p className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[#191c1e]">
                  {previewMedication}
                </p>
                {category.trim() ? (
                  <p className="text-xs text-[#6c7a78]">Category: {category.trim()}</p>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[rgba(187,201,199,0.1)] bg-white/50 p-3 shadow-sm">
                  <p className="text-[10px] font-normal uppercase tracking-wider text-[#6c7a78]">
                    Total Value
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold tracking-tight text-[#006a65]">
                    {totalValue > 0 ? currencyFormatter.format(totalValue) : currencyFormatter.format(2450)}
                  </p>
                </div>
                <div className="rounded-lg border border-[rgba(187,201,199,0.1)] bg-white/50 p-3 shadow-sm">
                  <p className="text-[10px] font-normal uppercase tracking-wider text-[#6c7a78]">
                    Stock Load
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold tracking-tight text-[#191c1e]">
                    {q > 0 ? q : 500}{" "}
                    <span className="text-sm font-normal text-[#6c7a78]">units</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2 pt-2">
                <div className="flex items-end justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6c7a78]">
                    Form Completion
                  </span>
                  <span className="text-[10px] font-semibold text-[#006a65]">{completion}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#e0e3e5] shadow-inner">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${completion}%`,
                      background:
                        "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                    }}
                  />
                </div>
                <p className="pt-1 text-center text-[10px] text-[#6c7a78]">
                  Complete the core batch details to finalize entry
                </p>
              </div>
            </div>

            {/* Recent Entries */}
            <div>
              <h3 className="mb-6 text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]">
                Recent Entries
              </h3>
              <div className="relative pl-6">
                <div
                  className="absolute bottom-2 left-[7px] top-2 w-0.5 rounded-full bg-gradient-to-b from-[#006a65] via-[#4648d4] to-[#cbd5e1] opacity-40"
                  aria-hidden
                />
                {recentEntries.length > 0 ? (
                  <ul className="space-y-8">
                    {recentEntries.map((entry, index) => (
                      <RecentEntry
                        key={entry.id}
                        title={entry.productName}
                        meta={`Added ${entry.quantityReceived.toLocaleString()} units • ${formatRelativeEntry(entry.createdAt)}`}
                        batch={`Batch #${entry.batchNumber}`}
                        batchClass={
                          index === 0
                            ? "bg-[rgba(0,106,101,0.05)] text-[#191c1e]"
                            : index === 1
                              ? "bg-[rgba(70,72,212,0.05)] text-[#2f2ebe]"
                              : "bg-[#e0e3e5] text-[#6c7a78]"
                        }
                        dotClass={
                          index === 0
                            ? "bg-[#006a65]"
                            : index === 1
                              ? "bg-[#4648d4]"
                              : "bg-[#bbc9c7]"
                        }
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[#6c7a78]">
                    Recent batch entries will appear here once inventory starts moving.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentEntry({
  title,
  meta,
  batch,
  batchClass,
  dotClass,
}: {
  title: string;
  meta: string;
  batch: string;
  batchClass: string;
  dotClass: string;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[17px] top-1 size-3 rounded-full border-2 border-[#f7f9fb] ${dotClass}`}
        aria-hidden
      />
      <p className="text-xs font-semibold text-[#191c1e]">{title}</p>
      <p className="mt-1 text-[11px] text-[#6c7a78]">{meta}</p>
      <span className={`mt-2 inline-block rounded px-1.5 py-0.5 text-[10px] ${batchClass}`}>
        {batch}
      </span>
    </li>
  );
}
