"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useAllProductCategoriesQuery } from "@/lib/queries/product-categories";
import { useStockProductQuery, useUpdateStockProductMutation } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";

const fieldLabel =
  "mb-2 block text-xs font-normal uppercase tracking-[0.1em] text-[#6c7a78]";
const inputClass =
  "w-full rounded-lg border-0 bg-[var(--app-input-bg)] px-4 py-4 text-base text-[var(--app-text)] outline-none placeholder:text-[#6c7a78]/60 focus:ring-2 focus:ring-[var(--app-brand)]/20";

export function ProductEditContent({ productId }: { productId: string }) {
  const router = useRouter();
  const { withLoading, notify } = useAuraFeedback();
  const productQuery = useStockProductQuery(productId);
  const updateMutation = useUpdateStockProductMutation();
  const categoriesQuery = useAllProductCategoriesQuery({ includeArchived: false });

  const product = productQuery.data ?? null;
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [defaultSellingPrice, setDefaultSellingPrice] = useState("");
  const [status, setStatus] = useState<"active" | "discontinued">("active");

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setCategoryName(product.categoryName === "Uncategorized" ? "" : product.categoryName);
    setBarcode(product.barcode ?? "");
    setDefaultSellingPrice((product.defaultSellingPriceCents / 100).toFixed(2));
    setStatus(product.status);
  }, [product]);

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categoriesQuery.data]);

  const isLoading = productQuery.isLoading && !productQuery.data;
  const isSaving = updateMutation.isPending;

  const hasChanges = useMemo(() => {
    if (!product) return false;
    const nextName = name.trim();
    const nextCategory = categoryName.trim();
    const nextBarcode = barcode.trim();
    const nextPrice = Number.parseFloat(defaultSellingPrice);
    const nextPriceCents = Number.isFinite(nextPrice) ? Math.round(nextPrice * 100) : NaN;

    return (
      nextName !== product.name ||
      (nextCategory || "") !== (product.categoryName === "Uncategorized" ? "" : product.categoryName) ||
      (nextBarcode || "") !== (product.barcode ?? "") ||
      (Number.isFinite(nextPriceCents) ? nextPriceCents : product.defaultSellingPriceCents) !==
        product.defaultSellingPriceCents ||
      status !== product.status
    );
  }, [barcode, categoryName, defaultSellingPrice, name, product, status]);

  const canSave = Boolean(product) && hasChanges && !isSaving && !isLoading;

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
                onClick={() => router.back()}
                className="rounded-xl bg-[var(--app-cancel-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[#d5dade]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={async () => {
                  const trimmedName = name.trim();
                  const trimmedCategory = categoryName.trim();
                  const trimmedBarcode = barcode.trim();
                  const parsedPrice = Number.parseFloat(defaultSellingPrice);

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

                  const payload: Parameters<typeof updateMutation.mutateAsync>[0]["payload"] = {};

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

                  if (Object.keys(payload).length === 0) {
                    notify({
                      variant: "info",
                      title: "No changes",
                      description: "Make a change before saving.",
                    });
                    return;
                  }

                  try {
                    await withLoading("dashboard-edit-product", "Saving product...", async () => {
                      await updateMutation.mutateAsync({ productId, payload });
                    });
                    notify({
                      variant: "success",
                      title: "Product updated",
                      description: "Your changes have been saved.",
                    });
                    router.push(ROUTES.dashboard.stock);
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
          </div>
        </section>
      </div>
    </div>
  );
}

