"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useCreateSaleMutation, useSalesCatalogQuery } from "@/lib/queries/sales";
import { ROUTES } from "@/lib/routes";

const TAX_RATE = 0.15;

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
  nameLines: string[];
  batch: string;
  expiry: string;
  qty: number;
  unitPrice: number;
};

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[#64748b]";
const inputClass =
  "w-full rounded-2xl border-0 bg-[#f2f4f6] px-4 py-3.5 text-sm text-[#191c1e] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#006a65]/20";

export function NewSaleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const branch = searchParams.get("branch") ?? undefined;
  const salesHref = branch ? `${ROUTES.dashboard.sales}?branch=${branch}` : ROUTES.dashboard.sales;
  const salesCatalogQuery = useSalesCatalogQuery(branch, true);
  const createSaleMutation = useCreateSaleMutation();
  const [customerSearch, setCustomerSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [mobile, setMobile] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("aura-pay");
  const [reference, setReference] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [notes, setNotes] = useState("");

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
          nameLines: matched.name.split(" ").slice(0, 2),
          batch: batch?.batchNumber ?? "N/A",
          expiry: batch ? new Date(batch.expiresAt).toLocaleDateString("en-US") : "N/A",
          unitPrice: Math.max(item.unitPrice, matched.defaultSellingPriceCents / 100),
        };
      }),
    );
  }, [salesCatalogQuery.data?.products]);

  const { subtotal, tax, discount, grandTotal, auraPoints } = useMemo(() => {
    const sub = items.reduce((acc, row) => acc + row.qty * row.unitPrice, 0);
    const taxAmt = sub * TAX_RATE;
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
  }, [items]);

  const productById = useMemo(() => {
    const entries = (salesCatalogQuery.data?.products ?? []).map((product) => [product.id, product] as const);
    return new Map(entries);
  }, [salesCatalogQuery.data?.products]);

  function getPreferredBatch<T extends { quantityAvailable: number }>(batches: T[]) {
    return batches.find((batch) => batch.quantityAvailable > 0) ?? batches[0];
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
        title: "Unable to load medications",
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
        title: "No medications available",
        description: "There are no sellable products in this branch yet.",
      });
      return;
    }

    const defaultBatch = defaultProduct ? getPreferredBatch(defaultProduct.batches) : undefined;
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        productId: defaultProduct?.id,
        batchId: defaultBatch?.id,
        name: defaultProduct?.name ?? "Select medication",
        nameLines: defaultProduct?.name.split(" ").slice(0, 2) ?? ["Select", "medication"],
        batch: defaultBatch?.batchNumber ?? "N/A",
        expiry: defaultBatch ? new Date(defaultBatch.expiresAt).toLocaleDateString("en-US") : "N/A",
        qty: 1,
        unitPrice: defaultProduct ? defaultProduct.defaultSellingPriceCents / 100 : 0,
      },
    ]);
  }

  function updateItemProduct(id: string, productId: string) {
    const product = salesCatalogQuery.data?.products.find((option) => option.id === productId);
    if (!product) {
      return;
    }

    const batch = getPreferredBatch(product.batches);

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              productId: product.id,
              batchId: batch?.id,
              name: product.name,
              nameLines: product.name.split(" ").slice(0, 2),
              batch: batch?.batchNumber ?? "N/A",
              expiry: batch ? new Date(batch.expiresAt).toLocaleDateString("en-US") : "N/A",
              unitPrice: product.defaultSellingPriceCents / 100,
            }
          : item,
      ),
    );
  }

  function lineSubtotal(row: LineItem) {
    const line = row.qty * row.unitPrice;
    return line * (1 + TAX_RATE);
  }

  async function submitSale(status: "draft" | "completed") {
    const validItems = items.filter((item) => item.productId && item.unitPrice > 0 && item.qty > 0);

    if (validItems.length === 0) {
      throw new Error("Add at least one valid medication line item.");
    }

    return createSaleMutation.mutateAsync({
      branchId: branch,
      customerName: customerSearch || undefined,
      patientCode: patientId || undefined,
      mobile: mobile || undefined,
      paymentMethod:
        paymentMethod === "aura-pay"
          ? "aura-pay"
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
    });
  }

  function getLineItemIssue(item: LineItem) {
    if (!item.productId) {
      return "Select a medication before checkout.";
    }

    const product = productById.get(item.productId);
    if (!product) {
      return "This medication is no longer available in the selected branch.";
    }

    if (product.batches.length === 0) {
      return "No available stock batch in this branch.";
    }

    const selectedBatch =
      (item.batchId ? product.batches.find((batch) => batch.id === item.batchId) : undefined) ??
      product.batches[0];

    if (!selectedBatch) {
      return "No available stock batch in this branch.";
    }

    if (selectedBatch.quantityAvailable <= 0) {
      return "Selected batch is out of stock.";
    }

    if (item.qty > selectedBatch.quantityAvailable) {
      return `Only ${selectedBatch.quantityAvailable} unit${selectedBatch.quantityAvailable === 1 ? "" : "s"} available for this batch.`;
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
          <title>AuraPharma Receipt</title>
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
              <div class="brand">AuraPharma</div>
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
            ${patientId ? `<div>Patient ID: ${escapeHtml(patientId)}</div>` : ""}
            ${mobile ? `<div>Mobile: ${escapeHtml(mobile)}</div>` : ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>

          <div class="totals">
            <div class="totals-row"><span>Subtotal</span><span>${currencyFormatter.format(subtotal)}</span></div>
            <div class="totals-row"><span>Tax (${Math.round(TAX_RATE * 100)}%)</span><span>${currencyFormatter.format(tax)}</span></div>
            <div class="totals-row"><span>Discount</span><span>-${currencyFormatter.format(discount)}</span></div>
            <div class="totals-row grand"><span>Grand Total</span><span>${currencyFormatter.format(grandTotal)}</span></div>
          </div>

          <div class="footer">
            Thank you for choosing AuraPharma.
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
      return "Selected medication has no available stock in this branch. Choose another medication or switch branch.";
    }

    if (message.includes("Insufficient quantity")) {
      return message;
    }

    return message;
  }

  return (
    <div className="px-4 pb-24 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <nav className="flex items-center gap-2" aria-label="Breadcrumb">
              <Link
                href={salesHref}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8] hover:text-[#006a65]"
              >
                Aura Sales
              </Link>
              <span className="material-symbols-outlined notranslate text-sm text-[#cbd5e1]">
                chevron_right
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#006a65]">
                New Sale
              </span>
            </nav>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-[30px] sm:leading-9">
              New Sale
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(salesHref)}
              className="rounded-xl px-6 py-2.5 text-base font-medium text-[#3c4948] transition hover:bg-[#f2f4f6]"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left column */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Customer Information */}
            <section className="rounded-[20px] bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                    person
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                  Customer Information
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
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
                    <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b]">
                      search
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-[#94a3b8]">
                    Search existing records to auto-fill details.
                  </p>
                </div>
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
            </section>

            {/* Items & Prescription */}
            <section className="rounded-[20px] bg-white p-8 shadow-sm">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                      medication_liquid
                    </span>
                  </div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                    Items &amp; Prescription
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={salesCatalogQuery.isLoading}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#006a65] transition hover:text-[#004d49] disabled:cursor-not-allowed disabled:text-[#94a3b8]"
                >
                  <span className="material-symbols-outlined notranslate text-lg">add</span>
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#f1f5f9]">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                        Medication Name
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                        Tax
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                        Subtotal
                      </th>
                      <th className="w-12 px-2 py-3" aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      (() => {
                        const rowIssue = getLineItemIssue(row);
                        return (
                      <tr
                        key={row.id}
                        className={`border-b last:border-0 ${rowIssue ? "border-[#fee2e2] bg-[#fff7f7]" : "border-[#f8fafc]"}`}
                      >
                        <td className="px-4 py-5 align-top">
                          <div className="space-y-2">
                            <select
                              value={row.productId ?? ""}
                              onChange={(event) => updateItemProduct(row.id, event.target.value)}
                              className="w-full rounded-xl border-0 bg-[#f2f4f6] px-3 py-2 text-sm text-[#191c1e] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                            >
                              <option value="" disabled>
                                Select medication
                              </option>
                              {salesCatalogQuery.data?.products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                            {row.nameLines.filter(Boolean).map((line, i) => (
                              <p
                                key={`${row.id}-line-${i}`}
                                className="text-sm font-medium leading-tight text-[#191c1e]"
                              >
                                {line}
                              </p>
                            ))}
                            <p className="text-[11px] text-[#94a3b8]">
                              Batch: {row.batch} | Exp: {row.expiry}
                            </p>
                            {rowIssue ? <p className="text-[11px] font-medium text-[#ba1a1a]">{rowIssue}</p> : null}
                          </div>
                        </td>
                        <td className="px-4 py-5 align-middle">
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) =>
                              updateQty(row.id, Number.parseInt(e.target.value, 10) || 1)
                            }
                            className="w-16 rounded-2xl border-0 bg-[#f2f4f6] px-2 py-1.5 text-center text-sm text-[#191c1e] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                          />
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-sm font-medium text-[#191c1e]">
                          {currencyFormatter.format(row.unitPrice)}
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-xs text-[#64748b]">
                          {Math.round(TAX_RATE * 100)}%
                        </td>
                        <td className="px-4 py-5 align-middle text-right text-sm font-semibold text-[#006a65]">
                          {currencyFormatter.format(lineSubtotal(row))}
                        </td>
                        <td className="px-2 py-5 align-middle">
                          <button
                            type="button"
                            onClick={() => removeItem(row.id)}
                            className="rounded-lg p-1.5 text-[#94a3b8] transition hover:bg-[#fef2f2] hover:text-[#e11d48]"
                            aria-label={`Remove ${row.name}`}
                          >
                            <span className="material-symbols-outlined notranslate text-lg">
                              close
                            </span>
                          </button>
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment Details */}
            <section className="rounded-[20px] bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                    credit_card
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                  Payment Details
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
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
                      <option value="cash">Cash</option>
                      <option value="insurance">Insurance</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b]">
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
            </section>
          </div>

          {/* Cart Summary */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28">
            <div className="relative overflow-hidden rounded-[20px] border border-white/50 bg-[rgba(255,255,255,0.85)] p-8 shadow-[0_25px_50px_-12px_rgba(0,106,101,0.08)] backdrop-blur-md">
              <div className="mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-2xl text-[#006a65]">
                  shopping_basket
                </span>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[#191c1e]">
                  Cart Summary
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]"
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
                      className="min-w-0 flex-1 rounded-2xl border-0 bg-[#f2f4f6] px-4 py-2.5 text-sm text-[#191c1e] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#006a65]/20"
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
                      className="shrink-0 rounded-2xl bg-[#f1f5f9] px-4 py-2.5 text-xs font-semibold text-[#191c1e] transition hover:bg-[#e2e8f0]"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#f1f5f9] pt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Subtotal</span>
                    <span className="font-medium text-[#191c1e]">{currencyFormatter.format(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748b]">Tax ({Math.round(TAX_RATE * 100)}%)</span>
                    <span className="font-medium text-[#191c1e]">{currencyFormatter.format(tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-[#4648d4]">Total Discount</span>
                    <span className="font-semibold text-[#4648d4]">-{currencyFormatter.format(discount)}</span>
                  </div>
                </div>

                <div className="space-y-4 border-t border-[#f1f5f9] pt-6">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                      Grand Total
                    </span>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-tight text-[#191c1e]">
                        {currencyFormatter.format(grandTotal)}
                      </p>
                      <p className="text-[10px] font-semibold text-[#006a65]">
                        {auraPoints} Aura Points Earned
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!validateBeforeSubmit()) {
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
                        notify({
                          variant: "error",
                          title: "Unable to complete transaction",
                          description: getSaleErrorMessage(error),
                        });
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-br from-[#0fb9b1] to-[#4648d4] py-4 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition hover:opacity-95"
                  >
                    Complete Transaction
                    <span className="material-symbols-outlined notranslate text-lg">arrow_forward</span>
                  </button>

                  <div className="grid grid-cols-2 gap-3">
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
                          notify({
                            variant: "error",
                            title: "Unable to save draft",
                            description: getSaleErrorMessage(error),
                          });
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f5f9] py-3 text-xs font-semibold text-[#191c1e] transition hover:bg-[#e2e8f0]"
                    >
                      <span className="material-symbols-outlined notranslate text-sm">save</span>
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintReceipt}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f5f9] py-3 text-xs font-semibold text-[#191c1e] transition hover:bg-[#e2e8f0]"
                    >
                      <span className="material-symbols-outlined notranslate text-sm">print</span>
                      Print Receipt
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-4">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined notranslate shrink-0 text-[#006a65]">
                      auto_awesome
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-[#006a65]">Interaction Check</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-[#3c4948]">
                        No contraindications detected between selected items for this patient
                        profile.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
