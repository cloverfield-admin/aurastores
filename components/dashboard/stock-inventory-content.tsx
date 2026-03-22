"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTES } from "@/lib/routes";

const METRICS = [
  {
    label: "Total Stock Value",
    value: "$482,850.00",
    sub: "Vs. $430k last month",
    badge: "+12.4%",
    badgeClass: "bg-[#f0fdfa] text-[#0d9488]",
    icon: "payments",
  },
  {
    label: "Items Near Expiry",
    value: "42 Batches",
    sub: "Within next 30 days",
    badge: "Attention",
    badgeClass: "bg-[#fffbeb] text-[#d97706]",
    icon: "schedule",
  },
  {
    label: "Out of Stock",
    value: "18 SKUs",
    sub: "Reorder triggered for 12",
    badge: "Critical",
    badgeClass: "bg-[#fff1f2] text-[#e11d48]",
    icon: "warning",
  },
  {
    label: "Stock Turnover",
    value: "24.5x",
    sub: "Optimized for Q4 rotation",
    badge: "+4.2%",
    badgeClass: "bg-[#eff6ff] text-[#2563eb]",
    icon: "autorenew",
  },
] as const;

const TABLE_ROWS = [
  {
    name: "Amoxicillin 500mg",
    sku: "AMX-2024-01",
    category: "Antibiotics",
    batchId: "#BT-99231",
    expiry: "Safe (12 Oct 2025)",
    expiryVariant: "safe" as const,
    stock: { current: 150, total: 200 },
    stockVariant: "teal" as const,
    action: "menu" as const,
  },
  {
    name: "Influenza Vaccine",
    sku: "VAC-FL-24",
    category: "Vaccines",
    batchId: "#BT-44102",
    expiry: "Expiring Soon (14 Days)",
    expiryVariant: "warning" as const,
    stock: { current: 450, total: 500 },
    stockVariant: "warning" as const,
    action: "menu" as const,
  },
  {
    name: "Lisinopril 10mg",
    sku: "LSN-4452",
    category: "Cardiovascular",
    batchId: "#BT-77290",
    expiry: "Expired (21 Dec 2024)",
    expiryVariant: "critical" as const,
    stock: { current: 312, total: 500 },
    stockVariant: "critical" as const,
    action: "dispose" as const,
  },
] as const;

export function StockInventoryContent() {
  const [filter, setFilter] = useState<"all" | "expiring">("all");

  return (
    <div className="relative px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006a65]">
              Inventory Management
            </p>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl">
              Stock Inventory
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <span className="size-2 rounded-full bg-[#22c55e]" aria-hidden />
              <span className="text-xs font-medium text-[#94a3b8]">
                Real-time batch sync active • Last synced 2 mins ago
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f2f4f6] px-5 py-2.5 text-base font-semibold text-[#191c1e] transition hover:bg-[#e8eaed]"
            >
              <span className="material-symbols-outlined notranslate text-lg">edit_note</span>
              Bulk Update
            </button>
            <Link
              href={ROUTES.dashboard.stockAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <span className="material-symbols-outlined notranslate text-lg">add</span>
              Add New Batch
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => (
            <article
              key={m.label}
              className="rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-[#f1f5f9]">
                  <span className="material-symbols-outlined notranslate text-xl text-[#64748b]">
                    {m.icon}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${m.badgeClass}`}>
                  {m.badge}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                {m.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-[#191c1e]">
                {m.value}
              </p>
              <p className="mt-2 text-[10px] text-[#94a3b8]">{m.sub}</p>
            </article>
          ))}
        </div>

        {/* Product table */}
        <section className="overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#f2f4f6] p-6 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
              Product Inventory
            </h2>
            <div className="flex rounded-lg bg-[#f2f4f6] p-1">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  filter === "all"
                    ? "bg-white text-[#191c1e] shadow-sm"
                    : "font-medium text-[#64748b] hover:text-[#191c1e]"
                }`}
              >
                All Products
              </button>
              <button
                type="button"
                onClick={() => setFilter("expiring")}
                className={`rounded-md px-4 py-1.5 text-xs transition ${
                  filter === "expiring"
                    ? "bg-white font-semibold text-[#191c1e] shadow-sm"
                    : "font-medium text-[#64748b] hover:text-[#191c1e]"
                }`}
              >
                Expiring Soon
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-[rgba(242,244,246,0.5)]">
                  <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Batch ID
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Expiry Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Stock Level
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr
                    key={row.sku}
                    className={
                      row.expiryVariant === "critical"
                        ? "border-t border-[#f1f5f9] bg-[rgba(255,241,242,0.05)]"
                        : "border-t border-[#f1f5f9]"
                    }
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#191c1e]">{row.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-tight text-[#94a3b8]">
                        SKU: {row.sku}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569]">{row.category}</td>
                    <td className="px-6 py-4 font-mono text-sm text-[#64748b]">{row.batchId}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                          row.expiryVariant === "safe"
                            ? "bg-[#f0fdf4] text-[#15803d]"
                            : row.expiryVariant === "warning"
                              ? "bg-[#fffbeb] text-[#b45309]"
                              : "bg-[#fff1f2] text-[#be123c]"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            row.expiryVariant === "safe"
                              ? "bg-[#22c55e]"
                              : row.expiryVariant === "warning"
                                ? "bg-[#f59e0b]"
                                : "bg-[#f43f5e]"
                          }`}
                        />
                        {row.expiry}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 space-y-1.5">
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(row.stock.current / row.stock.total) * 100}%`,
                              backgroundColor:
                                row.stockVariant === "teal"
                                  ? "#14b8a6"
                                  : row.stockVariant === "warning"
                                    ? "#f59e0b"
                                    : "#e11d48",
                            }}
                          />
                        </div>
                        <p
                          className={`text-[10px] font-semibold ${
                            row.stockVariant === "teal"
                              ? "text-[#0d9488]"
                              : row.stockVariant === "warning"
                                ? "text-[#d97706]"
                                : "text-[#e11d48]"
                          }`}
                        >
                          {row.stock.current} / {row.stock.total} Units
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.action === "dispose" ? (
                        <button
                          type="button"
                          className="rounded-md bg-[#e11d48] px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-[#be123c]"
                        >
                          Dispose
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded p-1 text-[#64748b] hover:bg-slate-100"
                          aria-label="More actions"
                        >
                          <span className="material-symbols-outlined notranslate text-lg">
                            more_vert
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#f1f5f9] bg-[rgba(242,244,246,0.3)] px-6 py-4 sm:flex-row">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
              Showing 1-10 of 1,284 products
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white"
              >
                <span className="material-symbols-outlined notranslate text-lg">chevron_left</span>
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded border border-[#006a65] bg-white text-xs font-semibold text-[#006a65]"
              >
                1
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-xs text-[#475569] hover:bg-white"
              >
                2
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white"
              >
                <span className="material-symbols-outlined notranslate text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </section>

        {/* Insight panels */}
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-xl bg-[#6063ee] p-8">
            <div
              className="pointer-events-none absolute -bottom-4 -right-4 size-48 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-white/20">
                <span className="material-symbols-outlined notranslate text-xl text-white">
                  medication
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-white">
                Automated Batch Reorder
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                Smart systems detected 4 Antibiotic lines nearing threshold. Would you like to
                generate a draft order for the East Side branch?
              </p>
              <button
                type="button"
                className="mt-6 rounded-lg bg-white px-6 py-2.5 text-xs font-semibold text-[#4648d4] shadow-lg transition hover:bg-white/95"
              >
                Review Draft Order
              </button>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-xl border border-[rgba(204,251,241,0.5)] bg-[rgba(240,253,250,0.5)] p-8">
            <div
              className="pointer-events-none absolute -bottom-4 -right-4 size-48 rounded-full opacity-5 blur-3xl"
              style={{
                background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-[#ccfbf1]">
                <span className="material-symbols-outlined notranslate text-xl text-[#0d9488]">
                  show_chart
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#134e4a]">
                Inventory Efficiency
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#0f766e]/80">
                Your storage density increased by 14% this month. Batch rotation logic is working
                optimally for vaccine distribution.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccfbf1] px-3 py-1.5 text-[10px] font-semibold uppercase text-[#115e59]">
                  <span className="material-symbols-outlined notranslate text-xs">trending_up</span>
                  High Rotation
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccfbf1] px-3 py-1.5 text-[10px] font-semibold uppercase text-[#115e59]">
                  <span className="material-symbols-outlined notranslate text-xs">check_circle</span>
                  Optimized
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Footer strip */}
        <footer className="flex flex-col gap-4 border-t border-[#f1f5f9] pt-6 text-[11px] uppercase tracking-[0.1em] text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-[#cbd5e1]">AuraPharma v2.4.0</span>
            <span>© 2024 Clinical Intelligence</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              Privacy Policy
            </Link>
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              System Status
            </Link>
            <Link href="#" className="underline decoration-[rgba(20,184,166,0.3)] hover:text-[#64748b]">
              Pharmacy API
            </Link>
          </div>
        </footer>
      </div>

      {/* FAB */}
      <button
        type="button"
        className="fixed bottom-8 right-8 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-95"
        style={{
          background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
        }}
        aria-label="Undo or history"
      >
        <span className="material-symbols-outlined notranslate text-xl text-white">
          history
        </span>
      </button>
    </div>
  );
}
