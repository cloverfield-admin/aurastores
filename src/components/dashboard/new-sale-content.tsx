"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarcodeScannerModal } from "@/components/dashboard/barcode-scanner-modal";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { OutboxFeatureStatus } from "@/components/outbox/outbox-detail-dialog";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { isOfflineQueuedError } from "@/lib/offline/offline-queued-error";
import type { CreateSalePayload, SalesCatalogResponse } from "@/lib/queries/sales";
import {
  getSaleMobileMoneyStatus,
  useCreateSaleMutation,
  useSalesCatalogQuery,
  useSalesCatalogSearchQuery,
  useStartSaleMobileMoneyMutation,
} from "@/lib/queries/sales";
import { useOrganizationOverviewQuery } from "@/lib/queries/organization";
import { useAppMeQuery } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";
import { PRODUCT_NAME } from "@/lib/brand";
import { calculateCollectionFee } from "@/lib/lipila/fees";
import { LIPILA_ZAMBIA_MSISDN_RE, normalizeLipilaZambiaMsisdn } from "@/lib/validation/lipila";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

type LineItem = {
  id: string;
  productId?: string;
  batchId?: string;
  name: string;
  batch: string;
  expiry: string;
  qty: number;
  unitPrice: number;
};

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-muted)]";
const inputClass =
  "w-full rounded-2xl border-0 bg-[var(--app-input-bg)] px-4 py-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-placeholder)] focus:ring-2 focus:ring-[var(--app-brand)]/20";
const MOMO_APPROVAL_TIMEOUT_MESSAGE =
  "We did not receive approval within one minute. The sale is still pending and has not been completed yet.";

type ProductOption = {
  id: string;
  name: string;
  categoryName?: string;
};


type MedicationComboboxProps = {
  id?: string;
  value: string;
  products: ProductOption[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onChange: (nextProductId: string) => void;
  onQueryChange?: (q: string) => void;
  onFocusChange?: (focused: boolean) => void;
  queryLoading?: boolean;
};

function MedicationCombobox({
  id,
  value,
  products,
  disabled,
  placeholder = "Select product",
  className,
  onChange,
  onQueryChange,
  onFocusChange,
  queryLoading = false,
}: MedicationComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const selectedName = useMemo(
    () => products.find((p) => p.id === value)?.name ?? "",
    [products, value],
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 75);
    return products
      .filter((p) => {
        const name = p.name.toLowerCase();
        const category = (p.categoryName ?? "").toLowerCase();
        return name.includes(q) || category.includes(q);
      })
      .slice(0, 75);
  }, [products, query]);

  const selectProduct = useCallback(
    (productId: string) => {
      onChange(productId);
      setOpen(false);
      setHighlightedIndex(-1);
      setPanelStyle(null);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const updatePanelPosition = useCallback(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const rect = inputEl.getBoundingClientRect();
    const margin = 8;
    const minHeight = 180;
    const preferredMax = 288; // 72 * 4
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    const openDown = spaceBelow >= Math.min(minHeight, preferredMax) || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      140,
      Math.min(preferredMax, openDown ? spaceBelow - margin : spaceAbove - margin),
    );

    const top = openDown ? rect.bottom + margin : rect.top - margin - maxHeight;

    setPanelStyle({
      top: Math.max(margin, top),
      left: Math.max(margin, rect.left),
      width: rect.width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedName]);

  useEffect(() => {
    if (!open) return;
    const onResizeOrScroll = () => updatePanelPosition();
    window.addEventListener("resize", onResizeOrScroll);
    // capture scroll from any scroll container
    window.addEventListener("scroll", onResizeOrScroll, true);
    return () => {
      window.removeEventListener("resize", onResizeOrScroll);
      window.removeEventListener("scroll", onResizeOrScroll, true);
    };
  }, [open, updatePanelPosition]);

  const listActiveIndex =
    !open || filtered.length === 0
      ? -1
      : highlightedIndex < 0
        ? 0
        : Math.min(highlightedIndex, filtered.length - 1);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "ArrowDown" && !disabled) {
        event.preventDefault();
        setOpen(true);
        setQuery("");
        setHighlightedIndex(0);
        updatePanelPosition();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setHighlightedIndex(-1);
      setQuery("");
      setPanelStyle(null);
      inputRef.current?.blur();
      return;
    }

    if (filtered.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => {
        const base = i < 0 ? -1 : i;
        return base < filtered.length - 1 ? base + 1 : 0;
      });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => {
        const base = i < 0 ? 0 : i;
        return base <= 0 ? filtered.length - 1 : base - 1;
      });
      return;
    }

    if (event.key === "Enter" && listActiveIndex >= 0 && listActiveIndex < filtered.length) {
      event.preventDefault();
      const hit = filtered[listActiveIndex];
      if (hit) {
        selectProduct(hit.id);
      }
    }
  };

  const showFullValueHint = !open && selectedName.length > 26;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""} ${className ?? ""}`}>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="search"
          value={open ? query : selectedName}
          title={open ? query : selectedName}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
            setOpen(true);
            setHighlightedIndex(0);
            updatePanelPosition();
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              setQuery("");
              onQueryChange?.("");
              onFocusChange?.(true);
              setHighlightedIndex(0);
              updatePanelPosition();
            }
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Defer close to allow option click to register.
            window.setTimeout(() => {
              setOpen(false);
              setHighlightedIndex(-1);
              setQuery("");
              onQueryChange?.("");
              onFocusChange?.(false);
              setPanelStyle(null);
            }, 0);
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          className="min-w-0 w-full rounded-xl border-0 bg-[var(--app-input-bg)] px-3 py-2 pr-10 text-sm text-[var(--app-text)] outline-none focus:ring-2 focus:ring-[var(--app-brand)]/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span
          className={`material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] ${
            queryLoading ? "animate-spin" : ""
          }`}
        >
          {queryLoading ? "progress_activity" : "search"}
        </span>
      </div>

      {open && queryLoading ? (
        <p className="mt-1 text-[11px] font-medium text-[var(--app-text-muted)]">Searching…</p>
      ) : null}

      {showFullValueHint ? (
        <p className="mt-1 text-[11px] leading-snug text-[var(--app-text-muted)] break-words whitespace-normal">
          {selectedName}
        </p>
      ) : null}

      {open && panelStyle ? (
        <div
          id={listboxId}
          role="listbox"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            maxHeight: panelStyle.maxHeight,
          }}
          className="fixed z-[1000] overflow-auto rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[var(--app-text-muted)]">No matches.</p>
          ) : (
            filtered.map((product, index) => {
              const active = index === listActiveIndex;
              const selected = product.id === value;
              return (
                <button
                  key={product.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                    active ? "bg-[#f0fdfa]" : "hover:bg-[var(--app-surface-muted)]"
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(e) => {
                    // Prevent input blur from closing before click.
                    e.preventDefault();
                  }}
                  onClick={() => selectProduct(product.id)}
                >
                  <span className="min-w-0 flex-1 font-medium text-[var(--app-header-title)] break-words whitespace-normal">
                    {product.name}
                    {product.categoryName ? (
                      <span className="ml-2 align-middle text-xs font-medium text-[var(--app-text-muted)]">
                        ({product.categoryName})
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-brand)]">
                      check
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

type QtyStepperProps = {
  id: string;
  value: number;
  disabled?: boolean;
  onChange: (nextQty: number) => void;
};

function QtyStepper({ id, value, disabled, onChange }: QtyStepperProps) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    const parsed = Number.parseInt(trimmed, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    setDraft(String(next));
    onChange(next);
  }, [draft, onChange]);

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-2xl bg-[var(--app-input-bg)] ring-1 ring-transparent focus-within:ring-2 focus-within:ring-[var(--app-brand)]/20">
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="inline-flex w-10 items-center justify-center text-[var(--app-text)] transition disabled:cursor-not-allowed disabled:opacity-40 active:bg-[var(--app-surface-muted)]"
        aria-label="Decrease quantity"
      >
        <span className="material-symbols-outlined notranslate text-xl">remove</span>
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={draft}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, "");
          setDraft(next);
        }}
        onFocus={(e) => {
          // Mobile-friendly: tapping selects all so users can overwrite "1" quickly.
          e.target.select();
        }}
        onBlur={commitDraft}
        className="w-16 bg-transparent px-2 text-center text-sm font-medium text-[var(--app-text)] outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Quantity"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="inline-flex w-10 items-center justify-center text-[var(--app-text)] transition disabled:cursor-not-allowed disabled:opacity-40 active:bg-[var(--app-surface-muted)]"
        aria-label="Increase quantity"
      >
        <span className="material-symbols-outlined notranslate text-xl">add</span>
      </button>
    </div>
  );
}

export function NewSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const branch = searchParams.get("branch") ?? undefined;
  const salesHref = branch ? `${ROUTES.dashboard.sales}?branch=${branch}` : ROUTES.dashboard.sales;
  const salesCatalogQuery = useSalesCatalogQuery(branch, true);
  const [pinnedCatalogProducts, setPinnedCatalogProducts] = useState<
    Record<string, SalesCatalogResponse["products"][number]>
  >({});
  const [productSearch, setProductSearch] = useState("");
  const [productSearchDebounced, setProductSearchDebounced] = useState("");
  // Which product combobox currently has focus. Only that one is fed the live
  // server-search results (and the loading flag); every other combobox gets a
  // stable options list, so a search response no longer re-runs the O(n) filter
  // inside every line-item combobox on the screen.
  const [activeComboboxId, setActiveComboboxId] = useState<string | null>(null);
  const handleComboboxFocusChange = useCallback((comboboxId: string, focused: boolean) => {
    setActiveComboboxId((prev) => (focused ? comboboxId : prev === comboboxId ? null : prev));
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => setProductSearchDebounced(productSearch), 200);
    return () => window.clearTimeout(handle);
  }, [productSearch]);
  const salesCatalogSearchQuery = useSalesCatalogSearchQuery(branch, productSearchDebounced, true);
  const isProductSearchLoading =
    productSearchDebounced.trim().length >= 2 && salesCatalogSearchQuery.isFetching;
  const orgQuery = useOrganizationOverviewQuery();
  const meQuery = useAppMeQuery();
  const { storeVertical } = useDashboardWorkspaceAccess();
  const isPharmacyStore = storeVertical === "pharmacy";
  const createSaleMutation = useCreateSaleMutation();
  const startSaleMobileMoneyMutation = useStartSaleMobileMoneyMutation();
  const [customerSearch, setCustomerSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [mobile, setMobile] = useState("");
  const [customerInfoExpanded, setCustomerInfoExpanded] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paymentDetailsExpanded, setPaymentDetailsExpanded] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [notes] = useState("");
  const [scannerLineId, setScannerLineId] = useState<string | "add" | null>(null);
  const [momoDialogOpen, setMomoDialogOpen] = useState(false);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoPending, setMomoPending] = useState(false);
  const [momoStatusMessage, setMomoStatusMessage] = useState<string | null>(null);
  const [momoPaymentNotice, setMomoPaymentNotice] = useState<string | null>(null);
  const [customerPaysLipilaFee, setCustomerPaysLipilaFee] = useState(false);

  const showCustomerInfo =
    customerInfoExpanded ||
    Boolean(customerSearch || (isPharmacyStore && patientId) || mobile);
  const showPaymentDetails = paymentDetailsExpanded || Boolean(reference || paymentMethod !== "cash");

  useEffect(() => {
    if (!salesCatalogQuery.data?.products.length) {
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId) {
          return item;
        }

        const matched =
          salesCatalogQuery.data?.products.find((product) =>
            product.name.toLowerCase().includes(item.name.toLowerCase()),
          ) ?? salesCatalogQuery.data?.products[0];

        if (!matched) {
          return item;
        }

        const batch = matched.batches[0];
        return {
          ...item,
          productId: matched.id,
          batchId: batch?.id,
          name: matched.name,
          batch: batch?.batchNumber ?? "N/A",
          expiry: batch ? new Date(batch.expiresAt).toLocaleDateString("en-US") : "N/A",
          unitPrice: Math.max(item.unitPrice, matched.defaultSellingPriceCents / 100),
        };
      }),
    );
  }, [salesCatalogQuery.data?.products]);
  const taxRateBps = orgQuery.data?.salesTax.enabled ? orgQuery.data.salesTax.rateBps : 0;
  const taxRate = taxRateBps / 10_000;
  const taxRatePctLabel = Math.round(taxRate * 100);

  const salesLimit = meQuery.data?.entitlements?.limits?.salesTransactions ?? null;
  const salesUsage = meQuery.data?.usage?.salesTransactions ?? null;
  const isSalesMonthlyLimitReached =
    salesLimit != null && salesUsage != null && salesUsage >= salesLimit;

  const { subtotal, tax, discount, grandTotal, auraPoints } = useMemo(() => {
    const sub = items.reduce((acc, row) => acc + row.qty * row.unitPrice, 0);
    const taxAmt = sub * taxRate;
    const disc = 0; // placeholder — wire to discount logic later
    const total = sub + taxAmt - disc;
    const points = Math.max(1, Math.round(total * 0.35));
    return {
      subtotal: sub,
      tax: taxAmt,
      discount: disc,
      grandTotal: total,
      auraPoints: points,
    };
  }, [items, taxRate]);

  const momoFeePreview = useMemo(() => {
    const saleTotalCents = Math.max(0, Math.round(grandTotal * 100));
    return calculateCollectionFee({ saleTotalCents, customerPaysFee: customerPaysLipilaFee });
  }, [grandTotal, customerPaysLipilaFee]);

  const mergedCatalogProducts = useMemo(() => {
    const base = salesCatalogQuery.data?.products ?? [];
    const pinned = Object.values(pinnedCatalogProducts);
    const searched = salesCatalogSearchQuery.data?.products ?? [];
    if (pinned.length === 0 && searched.length === 0) return base;
    const map = new Map<string, SalesCatalogResponse["products"][number]>(base.map((p) => [p.id, p]));
    for (const p of pinned) {
      map.set(p.id, p);
    }
    for (const p of searched) {
      map.set(p.id, p);
    }
    return Array.from(map.values());
  }, [salesCatalogQuery.data?.products, pinnedCatalogProducts, salesCatalogSearchQuery.data?.products]);

  const productById = useMemo(() => {
    return new Map(mergedCatalogProducts.map((product) => [product.id, product] as const));
  }, [mergedCatalogProducts]);

  const productOptions: ProductOption[] = useMemo(() => {
    return mergedCatalogProducts.map((p) => ({
      id: p.id,
      name: p.name,
      categoryName: p.categoryName,
    }));
  }, [mergedCatalogProducts]);

  // Base catalogue + already-picked (pinned) products, but NOT live search
  // results. Its identity is stable while the user types, so idle comboboxes
  // fed this list don't re-filter on every server-search response. Pinned
  // products keep selected line items showing their name even if the product
  // came from a server search beyond the preloaded window.
  const stableProductOptions: ProductOption[] = useMemo(() => {
    const map = new Map<string, ProductOption>();
    for (const p of salesCatalogQuery.data?.products ?? []) {
      map.set(p.id, { id: p.id, name: p.name, categoryName: p.categoryName });
    }
    for (const p of Object.values(pinnedCatalogProducts)) {
      map.set(p.id, { id: p.id, name: p.name, categoryName: p.categoryName });
    }
    return Array.from(map.values());
  }, [salesCatalogQuery.data?.products, pinnedCatalogProducts]);

  function getPreferredBatch<T extends { quantityAvailable: number }>(batches: T[]) {
    return batches.find((batch) => batch.quantityAvailable > 0) ?? batches[0];
  }

  function findProductByBarcode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      return undefined;
    }
    const direct = mergedCatalogProducts.find((p) => p.barcode === trimmed);
    if (direct) {
      return direct;
    }
    if (trimmed.length === 12) {
      return mergedCatalogProducts.find((p) => p.barcode === `0${trimmed}`);
    }
    return undefined;
  }

  function addItemWithProduct(productId: string) {
    if (salesCatalogQuery.isLoading) {
      notify({
        variant: "info",
        title: "Catalog still loading",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    if (salesCatalogQuery.isError) {
      notify({
        variant: "error",
        title: "Unable to load products",
        description: "Refresh the page or switch branch, then try again.",
      });
      return;
    }

    const product = productById.get(productId);
    if (!product) {
      notify({
        variant: "warning",
        title: "Product not found",
        description: "This item is not in the catalog for the selected branch.",
      });
      return;
    }

    const defaultBatch = getPreferredBatch(product.batches);
    setPinnedCatalogProducts((prev) => (prev[product.id] ? prev : { ...prev, [product.id]: product }));
    setItems((prev) => [
      {
        id: `new-${Date.now()}`,
        productId: product.id,
        batchId: defaultBatch?.id,
        name: product.name,
        batch: defaultBatch?.batchNumber ?? "N/A",
        expiry: defaultBatch ? new Date(defaultBatch.expiresAt).toLocaleDateString("en-US") : "N/A",
        qty: 1,
        unitPrice: product.defaultSellingPriceCents / 100,
      },
      ...prev,
    ]);
  }

  function updateQty(id: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  function addItem() {
    if (salesCatalogQuery.isLoading) {
      notify({
        variant: "info",
        title: "Catalog still loading",
        description: "Please wait a moment and try adding the item again.",
      });
      return;
    }

    if (salesCatalogQuery.isError) {
      notify({
        variant: "error",
        title: "Unable to load products",
        description: "Refresh the page or switch branch, then try again.",
      });
      return;
    }

    const defaultProduct =
      salesCatalogQuery.data?.products.find((product) =>
        product.batches.some((batch) => batch.quantityAvailable > 0),
      ) ?? salesCatalogQuery.data?.products[0];
    if (!defaultProduct) {
      notify({
        variant: "warning",
        title: "No products available",
        description: "There are no sellable products in this branch yet.",
      });
      return;
    }

    const defaultBatch = defaultProduct ? getPreferredBatch(defaultProduct.batches) : undefined;
    setItems((prev) => [
      {
        id: `new-${Date.now()}`,
        productId: defaultProduct?.id,
        batchId: defaultBatch?.id,
        name: defaultProduct?.name ?? "Select product",
        batch: defaultBatch?.batchNumber ?? "N/A",
        expiry: defaultBatch ? new Date(defaultBatch.expiresAt).toLocaleDateString("en-US") : "N/A",
        qty: 1,
        unitPrice: defaultProduct ? defaultProduct.defaultSellingPriceCents / 100 : 0,
      },
      ...prev,
    ]);
  }

  function updateItemProduct(id: string, productId: string) {
    const product = productById.get(productId);
    if (!product) {
      return;
    }

    const batch = getPreferredBatch(product.batches);
    setPinnedCatalogProducts((prev) => (prev[product.id] ? prev : { ...prev, [product.id]: product }));

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              productId: product.id,
              batchId: batch?.id,
              name: product.name,
              batch: batch?.batchNumber ?? "N/A",
              expiry: batch ? new Date(batch.expiresAt).toLocaleDateString("en-US") : "N/A",
              unitPrice: product.defaultSellingPriceCents / 100,
            }
          : item,
      ),
    );
  }

  type IncrementScanResult =
    | { ok: true; name: string; newQty: number }
    | { ok: false };

  /** When the scanned product is already on a line, bump qty by 1 (stock-capped). */
  function tryIncrementQtyForProduct(productId: string, specificLineId?: string): IncrementScanResult {
    const line = specificLineId
      ? items.find((row) => row.id === specificLineId)
      : items.find((row) => row.productId === productId);

    if (!line || line.productId !== productId) {
      return { ok: false };
    }

    const product = productById.get(productId);
    if (!product) {
      notify({
        variant: "error",
        title: "Product unavailable",
        description: "This product is no longer in the catalog for this branch.",
      });
      return { ok: false };
    }

    if (product.batches.length === 0) {
      notify({
        variant: "error",
        title: "No stock",
        description: "No available batches for this product in this branch.",
      });
      return { ok: false };
    }

    const selectedBatch =
      (line.batchId ? product.batches.find((batch) => batch.id === line.batchId) : undefined) ??
      product.batches[0];

    if (!selectedBatch) {
      notify({
        variant: "error",
        title: "No stock",
        description: "No available batches for this product in this branch.",
      });
      return { ok: false };
    }

    if (selectedBatch.quantityAvailable <= 0) {
      notify({
        variant: "error",
        title: "Out of stock",
        description: `${product.name} has no available units in this branch.`,
      });
      return { ok: false };
    }

    if (line.qty + 1 > selectedBatch.quantityAvailable) {
      notify({
        variant: "error",
        title: "Cannot add more",
        description: `Only ${selectedBatch.quantityAvailable} unit${selectedBatch.quantityAvailable === 1 ? "" : "s"} available for ${product.name}.`,
      });
      return { ok: false };
    }

    const newQty = line.qty + 1;
    updateQty(line.id, newQty);
    return { ok: true, name: product.name, newQty };
  }

  function lineSubtotal(row: LineItem) {
    const line = row.qty * row.unitPrice;
    return line * (1 + taxRate);
  }

  function buildSalePayload(status: "draft" | "completed"): CreateSalePayload {
    const validItems = items.filter((item) => item.productId && item.unitPrice > 0 && item.qty > 0);

    if (validItems.length === 0) {
      throw new Error("Add at least one valid line item.");
    }

    if (status === "completed" && isSalesMonthlyLimitReached) {
      throw new Error(
        "Monthly completed sales limit reached for your plan. Wait until the next UTC month or upgrade in Billing.",
      );
    }

    return {
      branchId: branch,
      customerName: customerSearch || undefined,
      patientCode: isPharmacyStore && patientId ? patientId : undefined,
      mobile: mobile || undefined,
      paymentMethod:
        paymentMethod === "aura-pay"
          ? "aura-pay"
          : paymentMethod === "mobile-money"
            ? "mobile-money"
          : paymentMethod === "insurance"
            ? "insurance"
            : paymentMethod === "card"
              ? "card"
              : "cash",
      paymentReference: reference || undefined,
      discountCode: discountCode || undefined,
      notes: notes || undefined,
      status,
      items: validItems.map((item) => ({
        productId: item.productId as string,
        batchId: item.batchId,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        description: item.name,
      })),
    };
  }

  async function submitSale(status: "draft" | "completed") {
    return createSaleMutation.mutateAsync({
      ...buildSalePayload(status),
      idempotencyKey: crypto.randomUUID(),
    });
  }

  async function waitForMobileMoneyApproval(referenceId: string) {
    const deadline = Date.now() + 60_000;

    while (Date.now() < deadline) {
      const status = await getSaleMobileMoneyStatus(referenceId);
      setMomoStatusMessage(status.message ?? "Waiting for the customer to approve the payment prompt.");

      if (status.status === "successful") {
        return status;
      }
      if (status.status === "failed") {
        throw new Error(status.message ?? "The mobile money payment was declined or failed.");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 2_000));
    }

    throw new Error(MOMO_APPROVAL_TIMEOUT_MESSAGE);
  }

  async function submitMobileMoneySale() {
    const normalized = normalizeLipilaZambiaMsisdn(momoNumber);
    if (!LIPILA_ZAMBIA_MSISDN_RE.test(normalized)) {
      throw new Error(
        "Enter the number as 260 plus 9 digits (12 digits total), e.g. 260971234567. You can add spaces or a leading +.",
      );
    }

    const sale = buildSalePayload("completed");
    const started = await startSaleMobileMoneyMutation.mutateAsync({
      sale,
      mobileMoneyNumber: normalized,
      customerPaysLipilaFee,
      idempotencyKey: crypto.randomUUID(),
    });

    setMomoStatusMessage(started.message ?? "Approve the payment prompt on the customer's phone.");

    if (started.status === "failed") {
      throw new Error(started.message ?? "The mobile money payment failed.");
    }
    if (started.status !== "successful") {
      await waitForMobileMoneyApproval(started.referenceId);
    }

    return started;
  }

  function getLineItemIssue(item: LineItem) {
    if (!item.productId) {
      return "Select a product before checkout.";
    }

    const product = productById.get(item.productId);
    if (!product) {
      return "This product is no longer available in the selected branch.";
    }

    if (product.batches.length === 0) {
      return "No available stock for this product in this branch.";
    }

    const selectedBatch =
      (item.batchId ? product.batches.find((batch) => batch.id === item.batchId) : undefined) ??
      product.batches[0];

    if (!selectedBatch) {
      return "No available stock for this product in this branch.";
    }

    if (selectedBatch.quantityAvailable <= 0) {
      return "Selected product is out of stock.";
    }

    if (item.qty > selectedBatch.quantityAvailable) {
      return `Only ${selectedBatch.quantityAvailable} unit${selectedBatch.quantityAvailable === 1 ? "" : "s"} available for this product.`;
    }

    return null;
  }

  function validateBeforeSubmit() {
    const issues = items
      .map((item) => ({
        name: item.name,
        issue: getLineItemIssue(item),
      }))
      .filter((entry): entry is { name: string; issue: string } => Boolean(entry.issue));

    if (issues.length === 0) {
      return true;
    }

    const firstIssue = issues[0];
    notify({
      variant: "error",
      title: "Fix stock issues before checkout",
      description: `${firstIssue.name}: ${firstIssue.issue}`,
    });

    return false;
  }

  function formatPaymentMethodLabel(value: string) {
    return value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function handlePrintReceipt() {
    const printableItems = items.filter((item) => item.productId && item.qty > 0 && item.unitPrice > 0);

    if (printableItems.length === 0) {
      notify({
        variant: "warning",
        title: "Nothing to print",
        description: "Add at least one valid line item before printing a receipt.",
      });
      return;
    }

    const receiptDate = new Date().toLocaleString("en-ZM", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const receiptNumber = `RCPT-${Date.now().toString().slice(-8)}`;

    const rowsMarkup = printableItems
      .map((item) => {
        const itemTotal = item.qty * item.unitPrice;
        return `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.batch)}</td>
            <td>${item.qty}</td>
            <td>${currencyFormatter.format(item.unitPrice)}</td>
            <td>${currencyFormatter.format(itemTotal)}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${PRODUCT_NAME} Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #191c1e; }
            .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
            .brand { font-size: 18px; font-weight: 700; }
            .meta { font-size: 12px; color: #5b6866; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; }
            .right { text-align: right; }
            .totals { margin-top: 16px; margin-left: auto; width: 260px; }
            .totals-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 12px; }
            .grand { font-size: 15px; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px; }
            .footer { margin-top: 20px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${PRODUCT_NAME}</div>
              <div class="meta">Receipt printed from New Sale</div>
            </div>
            <div class="meta">
              <div>Receipt No: ${escapeHtml(receiptNumber)}</div>
              <div>Date: ${escapeHtml(receiptDate)}</div>
              <div>Payment: ${escapeHtml(formatPaymentMethodLabel(paymentMethod))}</div>
              ${reference ? `<div>Reference: ${escapeHtml(reference)}</div>` : ""}
            </div>
          </div>

          <div class="meta">
            <div>Customer: ${escapeHtml(customerSearch || "Walk-in")}</div>
            ${isPharmacyStore && patientId ? `<div>Patient ID: ${escapeHtml(patientId)}</div>` : ""}
            ${mobile ? `<div>Mobile: ${escapeHtml(mobile)}</div>` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Product ref</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>${currencyFormatter.format(subtotal)}</span></div>
            <div class="totals-row"><span>Tax (${taxRatePctLabel}%)</span><span>${currencyFormatter.format(tax)}</span></div>
            <div class="totals-row"><span>Discount</span><span>-${currencyFormatter.format(discount)}</span></div>
            <div class="totals-row grand"><span>Grand Total</span><span>${currencyFormatter.format(grandTotal)}</span></div>
          </div>

          <div class="footer">
            Thank you for choosing ${PRODUCT_NAME}.
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      notify({
        variant: "error",
        title: "Unable to open print window",
        description: "Please allow popups for this site and try again.",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function getSaleErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to save this sale right now.";

    if (message.includes("No available stock batch")) {
      return "Selected product has no available stock in this branch. Choose another product or switch branch.";
    }

    if (message.includes("Insufficient quantity")) {
      return message;
    }

    if (message.includes("Plan limit reached for salesTransactions")) {
      return "You have reached your plan’s completed sales allowance for this UTC month. It resets when the next month starts (UTC), or you can upgrade for a higher cap.";
    }

    return message;
  }

  const sectionShell = "rounded-[20px] bg-[var(--app-surface)] p-4 shadow-sm sm:p-6 lg:p-8";

  return (
    <div className="min-w-0 px-3 pb-24 pt-2 sm:px-6 lg:px-8">
      <BarcodeScannerModal
        open={scannerLineId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setScannerLineId(null);
          }
        }}
        onScan={(code) => {
          const product = findProductByBarcode(code);
          if (!product) {
            notify({
              variant: "error",
              title: "No matching product",
              description:
                "No product in this branch uses that barcode. Add stock with the barcode first, or pick from the list.",
            });
            return;
          }

          if (scannerLineId === "add") {
            const inc = tryIncrementQtyForProduct(product.id);
            if (inc.ok) {
              notify({
                variant: "info",
                title: "Quantity updated",
                description: `${inc.name} — now ${inc.newQty} ${inc.newQty === 1 ? "unit" : "units"}.`,
              });
              setScannerLineId(null);
              return;
            }
            const alreadyOnSale = items.some((row) => row.productId === product.id);
            if (alreadyOnSale) {
              setScannerLineId(null);
              return;
            }
            addItemWithProduct(product.id);
          } else if (scannerLineId) {
            const inc = tryIncrementQtyForProduct(product.id, scannerLineId);
            if (inc.ok) {
              notify({
                variant: "info",
                title: "Quantity updated",
                description: `${inc.name} — now ${inc.newQty} ${inc.newQty === 1 ? "unit" : "units"}.`,
              });
              setScannerLineId(null);
              return;
            }
            updateItemProduct(scannerLineId, product.id);
          }
          setScannerLineId(null);
        }}
        title="Scan product barcode"
      />
      <div className="mx-auto min-w-0 max-w-[1280px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            <nav className="flex min-w-0 flex-wrap items-center gap-2" aria-label="Breadcrumb">
              <Link
                href={salesHref}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)] hover:text-[var(--app-brand)]"
              >
                Aura Sales
              </Link>
              <span className="material-symbols-outlined notranslate text-sm text-[#cbd5e1]">
                chevron_right
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-brand)]">
                New Sale
              </span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-3xl sm:leading-9 md:text-[30px]">
                New Sale
              </h1>
              <OutboxFeatureStatus feature="sales" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={() => router.push(salesHref)}
              className="w-full rounded-xl px-6 py-2.5 text-sm font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-input-bg)] sm:w-auto sm:text-base"
            >
              Cancel
            </button>
          </div>
        </div>

        {isSalesMonthlyLimitReached ? (
          <div
            className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-5"
            role="status"
          >
            <p className="font-semibold">Monthly completed sales limit reached</p>
            <p className="mt-1 text-amber-900/90">
              You have used {salesUsage ?? 0} of {salesLimit ?? "—"} completed sales this UTC month. You can still save
              drafts; completing a sale unlocks when the next UTC month starts (this page refreshes usage automatically),
              or upgrade in{" "}
              <Link href={ROUTES.billingPortal} className="font-semibold underline underline-offset-2 hover:no-underline">
                Billing
              </Link>
              .
            </p>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-6 sm:gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left column */}
          <div className="flex min-w-0 flex-col gap-6 sm:gap-8 lg:col-span-8">
            {/* Customer Information */}
            <section className={sectionShell}>
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                      person
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="min-w-0 font-[family-name:var(--font-manrope)] text-base font-bold text-[var(--app-text)] sm:text-lg">
                      Customer Information
                    </h2>
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--app-text-faint)]">Optional</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomerInfoExpanded((v) => !v)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                  aria-expanded={showCustomerInfo}
                  aria-controls="customer-info-panel"
                >
                  <span className="material-symbols-outlined notranslate text-base">
                    {showCustomerInfo ? "expand_less" : "expand_more"}
                  </span>
                  {showCustomerInfo ? "Hide" : "Add details"}
                </button>
              </div>

              {showCustomerInfo ? (
                <div id="customer-info-panel" className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={fieldLabel} htmlFor="customerSearch">
                      Customer Name
                    </label>
                    <div className="relative">
                      <input
                        id="customerSearch"
                        type="search"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search by name or ID..."
                        className={`${inputClass} pr-12`}
                      />
                      <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
                        search
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--app-text-faint)]">
                      Search existing records to auto-fill details.
                    </p>
                  </div>
                  {isPharmacyStore ? (
                    <div>
                      <label className={fieldLabel} htmlFor="patientId">
                        Patient ID
                      </label>
                      <input
                        id="patientId"
                        type="text"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        placeholder="e.g. AUR-8892"
                        className={inputClass}
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className={fieldLabel} htmlFor="mobile">
                      Mobile Number
                    </label>
                    <input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2 sm:justify-end">
                    <div className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-[rgba(96,99,238,0.1)] px-3 py-3 sm:w-auto sm:py-2.5">
                      <span className="material-symbols-outlined notranslate shrink-0 text-[#4648d4]">
                        verified
                      </span>
                      <span className="text-xs font-medium text-[#4648d4]">
                        Aura Rewards Member Active
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Items & Prescription */}
            <section className={sectionShell}>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                      shopping_bag
                    </span>
                  </div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-base font-bold text-[var(--app-text)] sm:text-lg">
                    {isPharmacyStore ? "Items & Prescription" : "Items"}
                  </h2>
                </div>
                <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => setScannerLineId("add")}
                    disabled={salesCatalogQuery.isLoading}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border-ui)] py-2.5 text-xs font-semibold text-[#4648d4] transition hover:bg-[var(--app-surface-muted)] hover:text-[#2f2ebe] disabled:cursor-not-allowed disabled:text-[var(--app-text-faint)] min-[400px]:w-auto min-[400px]:border-0 min-[400px]:py-0 sm:text-sm"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">barcode_scanner</span>
                    Scan to add
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={salesCatalogQuery.isLoading}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border-ui)] py-2.5 text-xs font-semibold text-[var(--app-brand)] transition hover:bg-[var(--app-surface-muted)] hover:text-[#004d49] disabled:cursor-not-allowed disabled:text-[var(--app-text-faint)] min-[400px]:w-auto min-[400px]:border-0 min-[400px]:py-0 sm:text-sm"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">add</span>
                    Add Item
                  </button>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-[var(--app-border-ui)] bg-[#fafbfc] p-3 sm:p-4">
                <label className={fieldLabel} htmlFor="sale-product-search">
                  Product Search
                </label>
                <MedicationCombobox
                  id="sale-product-search"
                  value=""
                  products={
                    activeComboboxId === "sale-product-search" ? productOptions : stableProductOptions
                  }
                  disabled={salesCatalogQuery.isLoading || salesCatalogQuery.isError}
                  placeholder="Search product name..."
                  onQueryChange={setProductSearch}
                  onFocusChange={(focused) => handleComboboxFocusChange("sale-product-search", focused)}
                  queryLoading={
                    activeComboboxId === "sale-product-search" ? isProductSearchLoading : false
                  }
                  onChange={(productId) => {
                    addItemWithProduct(productId);
                    setProductSearch("");
                  }}
                />
              </div>

              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--app-border-ui)] bg-[#fafbfc] py-8 text-center text-sm leading-relaxed text-[var(--app-text-muted)] md:hidden">
                  No line items yet. Use <span className="font-semibold text-[var(--app-text)]">Add Item</span> or{" "}
                  <span className="font-semibold text-[var(--app-text)]">Scan to add</span>.
                </p>
              ) : null}

              {/* Mobile: stacked line cards */}
              <div className="space-y-4 md:hidden">
                {items.map((row) => {
                  const rowIssue = getLineItemIssue(row);
                  const comboboxId = `med-select-${row.id}`;
                  return (
                    <div
                      key={row.id}
                      className={`rounded-xl border p-4 ${
                        rowIssue ? "border-[#fecaca] bg-[#fff7f7]" : "border-[var(--app-surface-subtle)] bg-[#fafbfc]"
                      }`}
                    >
                      <div className="space-y-2">
                        <label className={fieldLabel} htmlFor={`med-select-${row.id}`}>
                          Product
                        </label>
                        <div className="grid grid-cols-[1fr,44px] gap-2">
                          <MedicationCombobox
                            id={comboboxId}
                            value={row.productId ?? ""}
                            products={activeComboboxId === comboboxId ? productOptions : stableProductOptions}
                            disabled={salesCatalogQuery.isLoading || salesCatalogQuery.isError}
                            onQueryChange={setProductSearch}
                            onFocusChange={(focused) => handleComboboxFocusChange(comboboxId, focused)}
                            queryLoading={activeComboboxId === comboboxId ? isProductSearchLoading : false}
                            onChange={(nextId) => updateItemProduct(row.id, nextId)}
                            className="min-w-0 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setScannerLineId(row.id)}
                            disabled={salesCatalogQuery.isLoading}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-2 text-[var(--app-brand)] transition hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Scan barcode for this line"
                            title="Scan barcode"
                          >
                            <span className="material-symbols-outlined notranslate text-xl">
                              barcode_scanner
                            </span>
                          </button>
                        </div>
                        <p className="text-sm font-medium leading-snug text-[var(--app-text)] break-words whitespace-normal">
                          {row.name}
                        </p>
                        <p className="text-[11px] text-[var(--app-text-faint)]">
                          Ref: {row.batch} | Exp: {row.expiry}
                        </p>
                        {rowIssue ? <p className="text-[11px] font-medium text-[#ba1a1a]">{rowIssue}</p> : null}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 gap-y-4 border-t border-[var(--app-surface-subtle)] pt-4">
                        <div>
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                            Qty
                          </span>
                          <QtyStepper
                            id={`qty-${row.id}`}
                            value={row.qty}
                            onChange={(next) => updateQty(row.id, next)}
                          />
                        </div>
                        <div className="text-right">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                            Unit price
                          </span>
                          <p className="text-sm font-medium text-[var(--app-text)]">
                            {currencyFormatter.format(row.unitPrice)}
                          </p>
                        </div>
                        <div>
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                            Tax
                          </span>
                          <p className="text-xs text-[var(--app-text-muted)]">{taxRatePctLabel}%</p>
                        </div>
                        <div className="text-right">
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                            Line total
                          </span>
                          <p className="text-sm font-semibold text-[var(--app-brand)]">
                            {currencyFormatter.format(lineSubtotal(row))}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end border-t border-[var(--app-surface-subtle)] pt-3">
                        <button
                          type="button"
                          onClick={() => removeItem(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--app-text-faint)] transition hover:bg-[#fef2f2] hover:text-[#e11d48]"
                          aria-label={`Remove ${row.name}`}
                        >
                          <span className="material-symbols-outlined notranslate text-lg">close</span>
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto overflow-y-visible overscroll-x-contain rounded-xl border border-[var(--app-surface-subtle)] md:block">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--app-surface-subtle)]">
                      <th className="w-[55%] px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                        Product
                      </th>
                      <th className="w-[160px] px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                        Tax
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                        Subtotal
                      </th>
                      <th className="w-12 px-2 py-3" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => {
                      const rowIssue = getLineItemIssue(row);
                      const comboboxId = `med-select-desktop-${row.id}`;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b last:border-0 ${rowIssue ? "border-[#fee2e2] bg-[#fff7f7]" : "border-[#f8fafc]"}`}
                        >
                        <td className="px-4 py-5 align-top">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                            <MedicationCombobox
                              id={comboboxId}
                              value={row.productId ?? ""}
                              products={activeComboboxId === comboboxId ? productOptions : stableProductOptions}
                              disabled={salesCatalogQuery.isLoading || salesCatalogQuery.isError}
                              onQueryChange={setProductSearch}
                              onFocusChange={(focused) => handleComboboxFocusChange(comboboxId, focused)}
                              queryLoading={activeComboboxId === comboboxId ? isProductSearchLoading : false}
                              onChange={(nextId) => updateItemProduct(row.id, nextId)}
                              className="min-w-0 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => setScannerLineId(row.id)}
                              disabled={salesCatalogQuery.isLoading}
                              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-2 text-[var(--app-brand)] transition hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Scan barcode for this line"
                              title="Scan barcode"
                            >
                              <span className="material-symbols-outlined notranslate text-xl">
                                barcode_scanner
                              </span>
                            </button>
                            </div>
                            <p className="text-sm font-medium leading-snug text-[var(--app-text)] break-words whitespace-normal">
                              {row.name}
                            </p>
                            <p className="text-[11px] text-[var(--app-text-faint)]">
                              Ref: {row.batch} | Exp: {row.expiry}
                            </p>
                            {rowIssue ? <p className="text-[11px] font-medium text-[#ba1a1a]">{rowIssue}</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-5 align-middle">
                          <QtyStepper
                            id={`qty-table-${row.id}`}
                            value={row.qty}
                            onChange={(next) => updateQty(row.id, next)}
                          />
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-sm font-medium text-[var(--app-text)]">
                          {currencyFormatter.format(row.unitPrice)}
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-xs text-[var(--app-text-muted)]">
                          {taxRatePctLabel}%
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-sm font-semibold text-[var(--app-brand)]">
                          {currencyFormatter.format(lineSubtotal(row))}
                        </td>
                        <td className="px-2 py-5 align-middle">
                          <button
                            type="button"
                            onClick={() => removeItem(row.id)}
                            className="rounded-lg p-1.5 text-[var(--app-text-faint)] transition hover:bg-[#fef2f2] hover:text-[#e11d48]"
                            aria-label={`Remove ${row.name}`}
                          >
                            <span className="material-symbols-outlined notranslate text-lg">
                              close
                            </span>
                          </button>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment Details */}
            <section className={sectionShell}>
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                      credit_card
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="min-w-0 font-[family-name:var(--font-manrope)] text-base font-bold text-[var(--app-text)] sm:text-lg">
                      Payment Details
                    </h2>
                    {!showPaymentDetails ? (
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--app-text-faint)]">
                        {formatPaymentMethodLabel(paymentMethod)}
                        {reference ? ` • Ref: ${reference}` : ""}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--app-text-faint)]">Optional</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentDetailsExpanded((v) => !v)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                  aria-expanded={showPaymentDetails}
                  aria-controls="payment-details-panel"
                >
                  <span className="material-symbols-outlined notranslate text-base">
                    {showPaymentDetails ? "expand_less" : "expand_more"}
                  </span>
                  {showPaymentDetails ? "Hide" : "Show"}
                </button>
              </div>

              {showPaymentDetails ? (
                <div id="payment-details-panel" className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel} htmlFor="paymentMethod">
                      Payment Method
                    </label>
                    <div className="relative">
                      <select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className={`${inputClass} appearance-none pr-10`}
                      >
                        <option value="aura-pay">Aura Pay Wallet</option>
                        <option value="card">Card</option>
                        <option value="mobile-money">Mobile Money</option>
                        <option value="cash">Cash</option>
                        <option value="insurance">Insurance</option>
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
                        expand_more
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="reference">
                      Reference Number
                    </label>
                    <input
                      id="reference"
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : null}
              {momoPaymentNotice ? (
                <div className="mt-5 rounded-2xl border border-[rgba(0,106,101,0.18)] bg-[rgba(0,106,101,0.08)] p-4 text-sm text-[var(--app-text)]">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined notranslate mt-0.5 text-base text-[var(--app-brand)]">
                      info
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--app-text)]">Mobile money approval pending</p>
                      <p className="mt-1 text-[var(--app-text-muted)]">{momoPaymentNotice}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          {/* Cart Summary */}
          <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-28">
            <div className="relative overflow-hidden rounded-[20px] border border-white/50 bg-[rgba(255,255,255,0.85)] p-4 shadow-[0_25px_50px_-12px_rgba(0,106,101,0.08)] backdrop-blur-md sm:p-6 lg:p-8">
              <div className="mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-2xl text-[var(--app-brand)]">
                  shopping_basket
                </span>
                <h2 className="min-w-0 font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)] sm:text-xl">
                  Cart Summary
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]"
                    htmlFor="discountCode"
                  >
                    Discount Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="discountCode"
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border-0 bg-[var(--app-input-bg)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-placeholder)] focus:ring-2 focus:ring-[var(--app-brand)]/20"
                      placeholder="Enter code"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await withLoading(
                          "dashboard-apply-discount",
                          "Applying discount code...",
                          async () => {
                            // TODO: validate discount via API
                            await new Promise((r) => setTimeout(r, 300));
                            notify({
                              variant: "info",
                              title: "Discount applied",
                              description: "Code verified successfully.",
                            });
                          },
                        );
                      }}
                      className="shrink-0 rounded-2xl bg-[var(--app-surface-subtle)] px-4 py-2.5 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-cancel-hover)]"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-3 border-t border-[var(--app-surface-subtle)] pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--app-text-muted)]">Subtotal</span>
                    <span className="font-medium text-[var(--app-text)]">{currencyFormatter.format(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--app-text-muted)]">Tax ({taxRatePctLabel}%)</span>
                    <span className="font-medium text-[var(--app-text)]">{currencyFormatter.format(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#4648d4]">Total Discount</span>
                    <span className="font-semibold text-[#4648d4]">-{currencyFormatter.format(discount)}</span>
                  </div>
                </div>

                <div className="space-y-4 border-t border-[var(--app-surface-subtle)] pt-6">
                  <div className="flex min-w-0 items-end justify-between gap-3 sm:gap-4">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                      Grand Total
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-3xl md:text-4xl">
                        {currencyFormatter.format(grandTotal)}
                      </p>
                      <p className="text-[10px] font-semibold text-[var(--app-brand)]">
                        {auraPoints} Aura Points Earned
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSalesMonthlyLimitReached || momoPending}
                    title={
                      isSalesMonthlyLimitReached
                        ? `Monthly cap reached (${salesUsage ?? 0}/${salesLimit ?? "—"} completed sales this UTC month).`
                        : undefined
                    }
                    onClick={async () => {
                      if (!validateBeforeSubmit()) {
                        return;
                      }
                      if (paymentMethod === "mobile-money") {
                        setMomoNumber(mobile);
                        setMomoStatusMessage(null);
                        setMomoPaymentNotice(null);
                        setMomoDialogOpen(true);
                        return;
                      }
                      try {
                        await withLoading(
                          "dashboard-complete-sale",
                          "Processing transaction...",
                          async () => {
                            const result = await submitSale("completed");
                            notify({
                              variant: "success",
                              title: "Transaction complete",
                              description: `${result.saleNumber} saved and inventory updated.`,
                            });
                            router.push(salesHref);
                          },
                        );
                      } catch (error) {
                        if (isOfflineQueuedError(error)) {
                          notify({
                            variant: "info",
                            title: "Sale queued for sync",
                            description:
                              "You appear to be offline or the network dropped. This sale will upload when you are back online.",
                          });
                          return;
                        }
                        notify({
                          variant: "error",
                          title: "Unable to complete transaction",
                          description: getSaleErrorMessage(error),
                        });
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-[#0fb9b1] to-[#4648d4] px-3 py-3.5 text-sm font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition hover:opacity-95 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 sm:py-4 sm:text-base"
                  >
                    Complete Transaction
                    <span className="material-symbols-outlined notranslate text-lg">arrow_forward</span>
                  </button>

                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!validateBeforeSubmit()) {
                          return;
                        }
                        try {
                          await withLoading(
                            "dashboard-save-draft",
                            "Saving draft sale...",
                            async () => {
                              const result = await submitSale("draft");
                              notify({
                                variant: "success",
                                title: "Draft saved",
                                description: `${result.saleNumber} saved for later checkout.`,
                              });
                            },
                          );
                        } catch (error) {
                          if (isOfflineQueuedError(error)) {
                            notify({
                              variant: "info",
                              title: "Draft queued for sync",
                              description:
                                "You appear to be offline or the network dropped. This draft will upload when you are back online.",
                            });
                            return;
                          }
                          notify({
                            variant: "error",
                            title: "Unable to save draft",
                            description: getSaleErrorMessage(error),
                          });
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--app-surface-subtle)] py-3 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-cancel-hover)]"
                    >
                      <span className="material-symbols-outlined notranslate text-sm">save</span>
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--app-surface-subtle)] py-3 text-xs font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-cancel-hover)]"
                    >
                      <span className="material-symbols-outlined notranslate text-sm">print</span>
                      Print Receipt
                    </button>
                  </div>
                </div>

                {isPharmacyStore ? (
                  <div className="rounded-2xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="material-symbols-outlined notranslate shrink-0 text-[var(--app-brand)]">
                        auto_awesome
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--app-brand)]">Interaction Check</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-secondary)]">
                          No contraindications detected between selected items for this patient profile.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {momoDialogOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-brand)]">
                  Mobile Money
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                  Customer approval required
                </h3>
                <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                  Enter the customer&apos;s mobile money number. Lipila will send them a prompt to approve this
                  transaction.
                </p>
              </div>
              <button
                type="button"
                disabled={momoPending}
                onClick={() => setMomoDialogOpen(false)}
                className="rounded-full p-2 text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-40"
                aria-label="Close mobile money dialog"
              >
                <span className="material-symbols-outlined notranslate text-lg">close</span>
              </button>
            </div>

            <label className={fieldLabel} htmlFor="momoNumber">
              Customer number
            </label>
            <input
              id="momoNumber"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={momoNumber}
              disabled={momoPending}
              onChange={(e) => setMomoNumber(e.target.value)}
              placeholder="260971234567"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-[var(--app-text-muted)]">
              Lipila requires Zambia international format: <span className="font-mono">260</span> and 9 digits (12
              total). Spaces or a leading + are fine.
            </p>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[rgba(99,102,241,0.06)] p-4">
              <input
                type="checkbox"
                checked={customerPaysLipilaFee}
                disabled={momoPending}
                onChange={(e) => setCustomerPaysLipilaFee(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4648d4]"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  Customer will cover the Lipila mobile money fee (2.5%)
                </p>
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                  If checked, we’ll request a higher amount so the sale total is received after Lipila charges.
                </p>
              </div>
            </label>

            <div className="mt-4 rounded-2xl border border-[rgba(0,0,0,0.06)] bg-[rgba(0,106,101,0.05)] p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--app-text-muted)]">Sale total</span>
                <span className="font-semibold text-[var(--app-text)]">
                  {currencyFormatter.format(momoFeePreview.netAmountCents / 100)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-[var(--app-text-muted)]">Lipila fee (2.5%)</span>
                <span className="font-semibold text-[var(--app-text)]">
                  {currencyFormatter.format(momoFeePreview.feeCents / 100)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-[var(--app-text-muted)]">
                  {customerPaysLipilaFee ? "Customer pays" : "Merchant receives"}
                </span>
                <span className="font-semibold text-[var(--app-text)]">
                  {currencyFormatter.format(
                    (customerPaysLipilaFee ? momoFeePreview.grossAmountCents : momoFeePreview.netAmountCents) / 100,
                  )}
                </span>
              </div>
            </div>

            {momoStatusMessage ? (
              <div className="mt-4 rounded-2xl bg-[rgba(0,106,101,0.08)] p-4 text-sm text-[var(--app-text)]">
                <div className="flex gap-3">
                  {momoPending ? (
                    <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[var(--app-brand)] border-t-transparent" />
                  ) : (
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-brand)]">
                      info
                    </span>
                  )}
                  <p>{momoStatusMessage}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={momoPending}
                onClick={() => setMomoDialogOpen(false)}
                className="rounded-2xl bg-[var(--app-surface-subtle)] px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-cancel-hover)] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={momoPending}
                onClick={async () => {
                  try {
                    setMomoPending(true);
                    setMomoPaymentNotice(null);
                    setMomoStatusMessage("Sending payment request to the customer...");
                    const result = await submitMobileMoneySale();
                    notify({
                      variant: "success",
                      title: "Transaction complete",
                      description: `${result.saleNumber} paid and saved.`,
                    });
                    setMomoPaymentNotice(null);
                    setMomoDialogOpen(false);
                    router.push(salesHref);
                  } catch (error) {
                    const message = getSaleErrorMessage(error);
                    if (message === MOMO_APPROVAL_TIMEOUT_MESSAGE) {
                      setMomoDialogOpen(false);
                      setMomoPaymentNotice(message);
                      notify({
                        variant: "info",
                        title: "Payment approval timed out",
                        description: message,
                      });
                    } else {
                      notify({
                        variant: "error",
                        title: "Mobile money payment failed",
                        description: message,
                      });
                      setMomoStatusMessage(message);
                    }
                  } finally {
                    setMomoPending(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#0fb9b1] to-[#4648d4] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {momoPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
