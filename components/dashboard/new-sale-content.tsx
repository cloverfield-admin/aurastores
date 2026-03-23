"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { ROUTES } from "@/lib/routes";

const TAX_RATE = 0.15;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

type LineItem = {
  id: string;
  name: string;
  nameLines: string[];
  batch: string;
  expiry: string;
  qty: number;
  unitPrice: number;
};

const INITIAL_ITEMS: LineItem[] = [
  {
    id: "1",
    name: "Amoxicillin 500mg Caps",
    nameLines: ["Amoxicillin", "500mg Caps"],
    batch: "B772-90",
    expiry: "12/25",
    qty: 2,
    unitPrice: 12.5,
  },
  {
    id: "2",
    name: "Paracetamol 500mg",
    nameLines: ["Paracetamol", "500mg"],
    batch: "G001-21",
    expiry: "06/26",
    qty: 1,
    unitPrice: 5,
  },
];

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
  const [customerSearch, setCustomerSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [mobile, setMobile] = useState("");
  const [items, setItems] = useState<LineItem[]>(INITIAL_ITEMS);
  const [paymentMethod, setPaymentMethod] = useState("aura-pay");
  const [reference, setReference] = useState("TXN-9021-X");
  const [discountCode, setDiscountCode] = useState("H-2024-OFF");

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

  function updateQty(id: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "New medication",
        nameLines: ["New medication", ""],
        batch: "—",
        expiry: "—",
        qty: 1,
        unitPrice: 0,
      },
    ]);
  }

  function lineSubtotal(row: LineItem) {
    const line = row.qty * row.unitPrice;
    return line * (1 + TAX_RATE);
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
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#006a65] transition hover:text-[#004d49]"
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
                      <tr
                        key={row.id}
                        className="border-b border-[#f8fafc] last:border-0"
                      >
                        <td className="px-4 py-5 align-top">
                          <div className="space-y-1">
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
                    placeholder="TXN-9021-X"
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
                      await withLoading(
                        "dashboard-complete-sale",
                        "Processing transaction...",
                        async () => {
                          // TODO: implement sale completion API
                          await new Promise((r) => setTimeout(r, 800));
                          notify({
                            variant: "success",
                            title: "Transaction complete",
                            description: "Receipt and Aura Points have been applied.",
                          });
                          router.push(salesHref);
                        },
                      );
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
                        await withLoading(
                          "dashboard-save-draft",
                          "Saving draft sale...",
                          async () => {
                            // TODO: implement draft save API
                            await new Promise((r) => setTimeout(r, 400));
                            notify({
                              variant: "success",
                              title: "Draft saved",
                              description: "Your sale has been saved for later.",
                            });
                          },
                        );
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#f1f5f9] py-3 text-xs font-semibold text-[#191c1e] transition hover:bg-[#e2e8f0]"
                    >
                      <span className="material-symbols-outlined notranslate text-sm">save</span>
                      Save as Draft
                    </button>
                    <button
                      type="button"
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
