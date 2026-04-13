"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BarcodeScannerModal } from "@/components/dashboard/barcode-scanner-modal";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import {
  useCreateStockBatchMutation,
  useStockCatalogQuery,
  useStockProductSuggestQuery,
  type StockProductSuggestResponse,
} from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";

const PRODUCT_SUGGEST_DEBOUNCE_MS = 350;

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

const fieldLabel =
  "mb-2 block text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]";
const inputClass =
  "w-full rounded-lg border-0 bg-[#f2f4f6] px-4 py-4 text-base text-[#191c1e] outline-none placeholder:text-[#6c7a78]/60 focus:ring-2 focus:ring-[#006a65]/20";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

function buildStockHref(branchId?: string) {
  return branchId
    ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(branchId)}`
    : ROUTES.dashboard.stock;
}

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
  const stockCatalogQuery = useStockCatalogQuery({
    branchId,
    includeProducts: false,
    suppressGlobalLoading: true,
  });
  const createBatchMutation = useCreateStockBatchMutation();
  const productFieldRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const hasLoggedReadyRef = useRef(false);
  const [productName, setProductName] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [productSuggestOpen, setProductSuggestOpen] = useState(false);
  const [productBarcode, setProductBarcode] = useState<string | null>(null);
  /** True after a scan found no single product for this barcode; show dedicated Barcode row and require medication name separately. */
  const [barcodeLookupNeedsMedicationName, setBarcodeLookupNeedsMedicationName] = useState(false);
  const [isBarcodeLookupPending, setIsBarcodeLookupPending] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [batchNumber, setBatchNumber] = useState(generateProductRef);
  const [category, setCategory] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedProductSearch(productName);
    }, PRODUCT_SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [productName]);

  const productSuggestQuery = useStockProductSuggestQuery(debouncedProductSearch);
  const productSuggestions = productSuggestQuery.data?.products ?? [];

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!productFieldRef.current?.contains(event.target as Node)) {
        setProductSuggestOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!stockCatalogQuery.data || hasLoggedReadyRef.current || process.env.NODE_ENV === "production") {
      return;
    }

    hasLoggedReadyRef.current = true;
    console.info("[stock-add] form-ready", {
      durationMs: Math.round(performance.now() - openedAtRef.current),
      branchId: stockCatalogQuery.data.branch.id,
    });
  }, [stockCatalogQuery.data]);

  const showProductSuggestPanel =
    productSuggestOpen && debouncedProductSearch.trim().length >= 2;

  const pickProductSuggestion = useCallback(
    (product: { name: string; barcode: string | null }) => {
      setProductName(product.name);
      setProductBarcode(product.barcode?.trim() || null);
      setDebouncedProductSearch(product.name);
      setBarcodeLookupNeedsMedicationName(false);
      setProductSuggestOpen(false);
    },
    [],
  );

  const clearProductBarcode = useCallback(() => {
    setProductBarcode(null);
    setBarcodeLookupNeedsMedicationName(false);
  }, []);

  const onProductNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setProductSuggestOpen(false);
    }
  };

  const q = Number.parseFloat(quantity) || 0;
  const p = Number.parseFloat(unitPrice) || 0;
  const s = Number.parseFloat(sellingPrice) || 0;
  const totalValue = q * p;
  const resolvedBranchId = branchId ?? stockCatalogQuery.data?.branch.id ?? undefined;
  const backToStockHref = buildStockHref(resolvedBranchId);
  const isCatalogPending = stockCatalogQuery.isLoading && !stockCatalogQuery.data;
  const isSaving = createBatchMutation.isPending;

  const completion = useMemo(() => {
    const fields = [productName, batchNumber, expiry, quantity, unitPrice, sellingPrice];
    const filled = fields.filter((f) => String(f).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [productName, batchNumber, expiry, quantity, unitPrice, sellingPrice]);

  const previewMedication = productName.trim() || "";
  const recentEntries = stockCatalogQuery.data?.recentEntries ?? [];
  const isSaveDisabled =
    !productName.trim() || !batchNumber.trim() || !expiry || q <= 0 || p <= 0 || s <= 0;
  const isSaveBlocked = isSaveDisabled || isSaving || isBarcodeLookupPending || !resolvedBranchId;

  return (
    <div className="px-4 pb-16 pt-2 sm:px-6 lg:px-8">
      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={async (code) => {
          const trimmed = code.trim();
          if (!trimmed) {
            return;
          }

          setProductBarcode(trimmed);
          setProductSuggestOpen(false);

          if (trimmed.length < 2) {
            setProductName("");
            setDebouncedProductSearch("");
            setBarcodeLookupNeedsMedicationName(true);
            notify({
              variant: "info",
              title: "Barcode captured",
              description: "Enter the medication name above. Short codes cannot be looked up until you add the product.",
            });
            return;
          }

          try {
            setIsBarcodeLookupPending(true);
            const res = await fetchJson<StockProductSuggestResponse>(
              `${apiUrl("/stock/products/suggest")}?q=${encodeURIComponent(trimmed)}`,
              { method: "GET" },
            );
            const exactByBarcode = res.products.filter((p) => p.barcode === trimmed);
            if (exactByBarcode.length === 1) {
              const matched = exactByBarcode[0];
              setProductName(matched.name);
              setDebouncedProductSearch(matched.name);
              setBarcodeLookupNeedsMedicationName(false);
              notify({
                variant: "success",
                title: "Product matched",
                description: `Loaded “${matched.name}” from this barcode.`,
              });
              return;
            }

            setProductName("");
            setDebouncedProductSearch("");
            setBarcodeLookupNeedsMedicationName(true);
            notify({
              variant: "success",
              title: "Barcode captured",
              description:
                exactByBarcode.length > 1
                  ? "Enter the medication name above, or type a few letters to search and pick the right product."
                  : "No product uses this barcode yet. Enter the medication name above, then save to create it with this barcode.",
            });
          } catch {
            setProductName("");
            setDebouncedProductSearch("");
            setBarcodeLookupNeedsMedicationName(true);
            notify({
              variant: "warning",
              title: "Barcode captured",
              description: "Could not look up this barcode. Enter the medication name above, then try again or save.",
            });
          } finally {
            setIsBarcodeLookupPending(false);
          }
        }}
        title="Scan product barcode"
      />
      <div className="mx-auto max-w-[1280px]">
        {/* Page header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              <Link
                href={backToStockHref}
                className="text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78] hover:text-[#006a65]"
              >
                Aura Stock
              </Link>
              <span className="material-symbols-outlined notranslate text-sm text-[#bbc9c7]">
                chevron_right
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#006a65]">
                New Product
              </span>
            </nav>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold tracking-tight text-[#191c1e] sm:text-[30px] sm:leading-9 sm:tracking-[-0.025em]">
              Add New Product
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(backToStockHref)}
              className="rounded-xl px-6 py-2.5 text-base font-medium text-[#3c4948] transition hover:bg-[#f2f4f6]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaveBlocked}
              onClick={async () => {
                if (isSaveDisabled) {
                  notify({
                    variant: "error",
                    title: "Complete the required fields",
                    description:
                      "Add the medication name, product ref, expiry date, quantity, order price, and selling price.",
                  });
                  return;
                }

                try {
                  const saveStartedAt = typeof performance !== "undefined" ? performance.now() : 0;
                  await withLoading(
                    "dashboard-add-batch",
                    "Saving product to inventory...",
                    async () => {
                      const trimmedMedication = productName.trim();
                      const trimmedBarcode = productBarcode?.trim() ?? "";
                      const result = await createBatchMutation.mutateAsync({
                        branchId: resolvedBranchId,
                        productName: trimmedMedication,
                        ...(trimmedBarcode.length > 0 ? { productBarcode: trimmedBarcode } : {}),
                        batchNumber: batchNumber.trim(),
                        categoryName: category.trim() || undefined,
                        expiresAt: expiry,
                        quantityReceived: q,
                        unitOrderPrice: p,
                        supplierName: supplier.trim() || undefined,
                        purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
                        unitSellingPrice: s,
                        notes: notes.trim() || undefined,
                      });

                      notify({
                        variant: "success",
                        title: "Product saved",
                        description: `${result.productName} (${result.batchNumber}) was added to inventory.${
                          trimmedBarcode.length > 0 ? ` Barcode ${trimmedBarcode} stored on the product.` : ""
                        }`,
                      });
                      if (process.env.NODE_ENV !== "production") {
                        console.info("[stock-add] save-complete", {
                          durationMs: Math.round(performance.now() - saveStartedAt),
                          batchId: result.id,
                        });
                      }
                      router.push(backToStockHref);
                    },
                  );
                } catch (err) {
                  notify({
                    variant: "error",
                    title: "Failed to save product",
                    description: err instanceof Error ? err.message : "Please try again.",
                  });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-8 py-2.5 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,106,101,0.2),0_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving Product..." : "Save Product"}
              <span className="material-symbols-outlined notranslate text-lg">
                {isSaving ? "progress_activity" : "check"}
              </span>
            </button>
          </div>
        </div>

        {isCatalogPending ? (
          <div className="mb-6 rounded-xl border border-[#dbeafe] bg-[#f8fbff] px-4 py-3 text-sm text-[#335c85]">
            Loading branch and supplier details. You can start filling the form while we prepare the rest.
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
                <div ref={productFieldRef}>
                  <label className={fieldLabel} htmlFor="medication">
                    Medication Name
                  </label>
                  <div className="relative">
                    <input
                      id="medication"
                      type="text"
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value);
                        setProductSuggestOpen(true);
                      }}
                      onFocus={() => setProductSuggestOpen(true)}
                      onKeyDown={onProductNameKeyDown}
                      placeholder="e.g. Amoxicillin 500mg Capsules"
                      className={`${inputClass} pr-40`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {showProductSuggestPanel ? (
                      <div
                        id="add-batch-product-suggestions"
                        role="listbox"
                        className="absolute left-0 right-12 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg"
                      >
                        {productSuggestQuery.isFetching && productSuggestions.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-[#64748b]">Searching products…</p>
                        ) : productSuggestions.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-[#64748b]">
                            No matches. You can still use this as a new product name.
                          </p>
                        ) : (
                          productSuggestions.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              role="option"
                              aria-selected={false}
                              className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                      onClick={() => pickProductSuggestion(product)}
                    >
                      <span className="font-medium text-[#0f172a]">{product.name}</span>
                      <span className="text-xs text-[#64748b]">
                                {product.sku} · {product.categoryName}
                                {product.barcode ? ` · ${product.barcode}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      disabled={isBarcodeLookupPending}
                      className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-md bg-[rgba(15,185,177,0.2)] px-3 py-1 text-xs font-semibold text-[#004340] transition hover:bg-[rgba(15,185,177,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className={`material-symbols-outlined notranslate text-base ${
                          isBarcodeLookupPending ? "animate-spin" : ""
                        }`}
                      >
                        {isBarcodeLookupPending ? "progress_activity" : "barcode_scanner"}
                      </span>
                      {isBarcodeLookupPending ? "Looking up..." : "Scan Barcode"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-[#6c7a78]">
                    Medication name is only the product label (never the barcode). Type at least two
                    characters to search, or use Scan to look up by barcode—if nothing matches, enter
                    the name above and save to attach this barcode to a new product.
                  </p>
                  {isBarcodeLookupPending ? (
                    <p className="mt-2 text-[11px] font-medium text-[#006a65]">
                      Looking up this barcode and checking existing products...
                    </p>
                  ) : null}
                  {productBarcode && barcodeLookupNeedsMedicationName ? (
                    <div className="mt-4 space-y-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className={fieldLabel} htmlFor="captured-barcode">
                          Barcode
                        </label>
                        <button
                          type="button"
                          onClick={clearProductBarcode}
                          className="text-[11px] font-semibold text-[#64748b] underline decoration-[#64748b]/40 hover:text-[#0f172a]"
                        >
                          Clear barcode
                        </button>
                      </div>
                      <input
                        id="captured-barcode"
                        readOnly
                        value={productBarcode}
                        className={`${inputClass} cursor-default bg-[#e2e8f0]/60 text-[#0f172a]`}
                        aria-readonly="true"
                      />
                      <p className="text-[11px] leading-relaxed text-[#64748b]">
                        No product uses this barcode yet. Enter the medication name in the field
                        above, then save to create the product with this barcode.
                      </p>
                    </div>
                  ) : null}
                  {productBarcode && !barcodeLookupNeedsMedicationName ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#e0f2f1] px-2 py-1 text-[11px] font-medium text-[#004d49]">
                        Barcode: {productBarcode}
                      </span>
                      <button
                        type="button"
                        onClick={clearProductBarcode}
                        className="text-[11px] font-semibold text-[#64748b] underline decoration-[#64748b]/40 hover:text-[#0f172a]"
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel} htmlFor="batchNumber">
                      Product ref
                    </label>
                    <input
                      id="batchNumber"
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className={inputClass}
                      placeholder="Auto-generated, editable"
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
                <div className="grid gap-6 sm:grid-cols-3">
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
                    <label className={fieldLabel} htmlFor="unitOrderPrice">
                      Order Price (Per Unit)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6c7a78]">
                        ZMW
                      </span>
                      <input
                        id="unitOrderPrice"
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
                  <div>
                    <label className={fieldLabel} htmlFor="unitSellingPrice">
                      Selling Price (Per Unit)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6c7a78]">
                        ZMW
                      </span>
                      <input
                        id="unitSellingPrice"
                        type="number"
                        min={0}
                        step="0.01"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
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

            {/* Product preview */}
            <div className="relative rounded-xl border border-[rgba(0,106,101,0.05)] bg-[#f2f4f6] p-6 shadow-md">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                  Product Preview
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
                    {totalValue > 0 ? currencyFormatter.format(totalValue) : currencyFormatter.format(0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[rgba(187,201,199,0.1)] bg-white/50 p-3 shadow-sm">
                  <p className="text-[10px] font-normal uppercase tracking-wider text-[#6c7a78]">
                    Stock Load
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold tracking-tight text-[#191c1e]">
                    {q > 0 ? q : 0}{" "}
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
                  Complete the core product details to finalize entry
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
                        batch={`Ref #${entry.batchNumber}`}
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
                    Recent product entries will appear here once inventory starts moving.
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
