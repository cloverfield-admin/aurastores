"use client";

import Link from "next/link";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { usePayTransactionQuery, type PayPaymentMethod } from "@/lib/queries/pay";
import { hasCapability } from "@/lib/rbac/capabilities";
import { ROUTES } from "@/lib/routes";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 2,
});

const paymentBadgeColors: Record<PayPaymentMethod, string> = {
  aura_pay_wallet: "bg-[#e0f7f5] text-[#047a76] dark:bg-teal-500/20 dark:text-teal-100",
  card: "bg-[#eef2ff] text-[#4f46e5] dark:bg-indigo-500/20 dark:text-indigo-100",
  mobile_money: "bg-[#dcfce7] text-[#15803d] dark:bg-emerald-500/20 dark:text-emerald-100",
  cash: "bg-[#ffedd5] text-[#c2410c] dark:bg-amber-500/20 dark:text-amber-100",
  insurance: "bg-[#e0f2fe] text-[#0369a1] dark:bg-cyan-500/20 dark:text-cyan-100",
  bank_transfer: "bg-[#f1f5f9] text-[#334155] dark:bg-slate-500/20 dark:text-slate-100",
};

function formatPaymentMethod(method: PayPaymentMethod) {
  return method
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(isoString: string | null) {
  if (!isoString) return "Not captured";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function AuraPayTransactionDetailContent({ paymentId }: { paymentId: string }) {
  const workspace = useDashboardWorkspaceAccess();
  const canPay = hasCapability(workspace.capabilities, "pay");
  const locked = !canPay;
  const detailQuery = usePayTransactionQuery(paymentId, canPay);
  const detail = detailQuery.data;

  const content = (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px] space-y-8">
        <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-[#0fb9b1] via-[#14b8a6] to-[#6366f1] p-6 text-white shadow-[0_25px_70px_-30px_rgba(15,185,177,0.65)] sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href={ROUTES.dashboard.pay}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25"
              >
                <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
                Back to Aura Pay
              </Link>
              <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-white">
                Transaction Details
              </h1>
              <p className="mt-2 text-white/85">
                Payment, sale, and purchased item quantities for this transaction.
              </p>
            </div>
          </div>
        </div>

        {detailQuery.isLoading ? (
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center text-sm text-[var(--app-text-muted)] shadow-sm">
            Loading transaction...
          </section>
        ) : detailQuery.isError || !detail ? (
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm">
            <span className="material-symbols-outlined notranslate text-4xl text-[var(--app-text-faint)]">
              receipt_long
            </span>
            <p className="mt-2 font-semibold text-[var(--app-text)]">Transaction not found</p>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              It may be outside your branch access or no longer available.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Amount",
                  value: currencyFormatter.format(detail.payment.amountCents / 100),
                  icon: "payments",
                  className: "border-[#99f6e4] bg-gradient-to-br from-[#f0fdfa] to-white dark:border-teal-500/25 dark:from-teal-950/35 dark:to-[var(--app-surface)]",
                  iconClass: "bg-[#ccfbf1] text-[#0f766e] dark:bg-teal-500/20 dark:text-teal-100",
                },
                {
                  label: "Method",
                  value: formatPaymentMethod(detail.payment.method),
                  icon: "credit_card",
                  className: "border-[#ddd6fe] bg-gradient-to-br from-[#f5f3ff] to-white dark:border-violet-500/25 dark:from-violet-950/35 dark:to-[var(--app-surface)]",
                  iconClass: "bg-[#ede9fe] text-[#7c3aed] dark:bg-violet-500/20 dark:text-violet-100",
                },
                {
                  label: "Status",
                  value: detail.payment.status,
                  icon: "verified",
                  className: "border-[#bbf7d0] bg-gradient-to-br from-[#f0fdf4] to-white dark:border-emerald-500/25 dark:from-emerald-950/35 dark:to-[var(--app-surface)]",
                  iconClass: "bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-500/20 dark:text-emerald-100",
                },
                {
                  label: "Paid At",
                  value: formatDateTime(detail.payment.paidAt ?? detail.payment.createdAt),
                  icon: "schedule",
                  className: "border-[#bfdbfe] bg-gradient-to-br from-[#eff6ff] to-white dark:border-blue-500/25 dark:from-blue-950/35 dark:to-[var(--app-surface)]",
                  iconClass: "bg-[#dbeafe] text-[#2563eb] dark:bg-blue-500/20 dark:text-blue-100",
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className={`rounded-xl border p-5 shadow-sm ${card.className}`}
                >
                  <span className={`material-symbols-outlined notranslate rounded-lg p-2 text-xl ${card.iconClass}`}>
                    {card.icon}
                  </span>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
                    {card.label}
                  </p>
                  {card.label === "Method" ? (
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${paymentBadgeColors[detail.payment.method]}`}>
                      {card.value}
                    </span>
                  ) : (
                    <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold capitalize text-[var(--app-text)]">
                      {card.value}
                    </p>
                  )}
                </article>
              ))}
            </section>

            <section className="rounded-2xl border border-[#ccfbf1] bg-gradient-to-br from-white via-[#f8fafc] to-[#f0fdfa] p-6 shadow-sm dark:border-teal-500/25 dark:from-[var(--app-surface)] dark:via-slate-950/20 dark:to-teal-950/35">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                Sale Summary
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#eef2ff] p-4 dark:bg-indigo-500/15">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Sale Number
                  </p>
                  <p className="mt-1 font-bold text-[var(--app-text)]">{detail.sale.saleNumber}</p>
                </div>
                <div className="rounded-xl bg-[#f0fdfa] p-4 dark:bg-teal-500/15">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Customer
                  </p>
                  <p className="mt-1 font-bold text-[var(--app-text)]">
                    {detail.sale.patientName ?? "Walk-in customer"}
                  </p>
                  {detail.sale.patientPhone && (
                    <p className="mt-1 text-sm text-[var(--app-text-muted)]">{detail.sale.patientPhone}</p>
                  )}
                </div>
                <div className="rounded-xl bg-[#fff7ed] p-4 dark:bg-orange-500/15">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Served By
                  </p>
                  <p className="mt-1 font-bold text-[var(--app-text)]">
                    {detail.sale.servedByName ?? "Not captured"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-[var(--app-text-muted)]">Subtotal</span>
                  <p className="font-bold text-[var(--app-text)]">
                    {currencyFormatter.format(detail.sale.subtotalCents / 100)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--app-text-muted)]">Tax</span>
                  <p className="font-bold text-[var(--app-text)]">
                    {currencyFormatter.format(detail.sale.taxCents / 100)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--app-text-muted)]">Discount</span>
                  <p className="font-bold text-[var(--app-text)]">
                    {currencyFormatter.format(detail.sale.discountCents / 100)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--app-text-muted)]">Total</span>
                  <p className="font-bold text-[var(--app-text)]">
                    {currencyFormatter.format(detail.sale.totalCents / 100)}
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-[var(--app-surface)] shadow-sm">
              <div className="border-b border-[#dbeafe] bg-gradient-to-r from-[#eff6ff] to-[#f0fdfa] p-5 dark:border-blue-500/25 dark:from-blue-950/35 dark:to-teal-950/35">
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                  Purchased Items
                </h2>
              </div>
              <div className="md:hidden space-y-3 border-t border-[var(--app-border-ui)] px-4 py-4">
                {detail.items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 shadow-sm"
                  >
                    <p className="font-semibold text-[var(--app-text)]">{item.description}</p>
                    {item.productName ? (
                      <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">{item.productName}</p>
                    ) : null}
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <dt className="font-semibold text-[var(--app-text-faint)]">Quantity</dt>
                      <dd className="text-[var(--app-text-muted)]">{item.quantity.toLocaleString()}</dd>
                      <dt className="font-semibold text-[var(--app-text-faint)]">Unit price</dt>
                      <dd className="text-[var(--app-text-muted)]">{currencyFormatter.format(item.unitPriceCents / 100)}</dd>
                      <dt className="font-semibold text-[var(--app-text-faint)]">Line total</dt>
                      <dd className="font-bold text-[var(--app-text)]">{currencyFormatter.format(item.lineTotalCents / 100)}</dd>
                    </dl>
                  </article>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--app-border-ui)] text-sm">
                  <thead className="bg-gradient-to-r from-[#eff6ff] to-[#f0fdfa] text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:from-blue-950/35 dark:to-teal-950/35 dark:text-slate-300">
                    <tr>
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Quantity</th>
                      <th className="px-5 py-3 text-right">Unit Price</th>
                      <th className="px-5 py-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--app-border-ui)]">
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[var(--app-text)]">{item.description}</p>
                          {item.productName && (
                            <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">{item.productName}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[var(--app-text-muted)]">{item.quantity.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-[var(--app-text-muted)]">
                          {currencyFormatter.format(item.unitPriceCents / 100)}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[var(--app-text)]">
                          {currencyFormatter.format(item.lineTotalCents / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="pay">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-8">
        <MissingCapabilityNotice capability="pay" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}
