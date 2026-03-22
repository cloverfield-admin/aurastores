"use client";

import Link from "next/link";
import { useState } from "react";

/** Bar heights (px) approximating Figma clinical trends — Oct is peak */
const CHART_BAR_HEIGHTS = [102, 166, 128, 218, 154, 192];
const CHART_MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Normalized efficacy line points (0–100) for SVG polyline */
const EFFICACY_POINTS = [42, 55, 48, 92, 68, 74];

const AI_FEED = [
  {
    title: "Seasonal Demand Alert",
    body: "Antibiotic sales are up 15% across all branches due to seasonal flu trends. Suggesting 20% inventory buffer.",
    time: "2 hours ago",
    accent: "border-[#0fb9b1]",
    dot: "bg-[#0fb9b1]",
    titleClass: "text-[#6ff7ee]",
  },
  {
    title: "Branch Performance Lag",
    body: "Batch #B-2024 is underperforming in the East Side branch. Current throughput is 12% below regional avg.",
    time: "5 hours ago",
    accent: "border-[rgba(186,26,26,0.4)]",
    dot: "bg-[#ba1a1a]",
    titleClass: "text-[#ba1a1a]",
  },
  {
    title: "Efficiency Milestone",
    body: "West Side branch has reached a record 98.4% clinical efficacy score for diabetic patient counseling.",
    time: "Yesterday",
    accent: "border-[rgba(70,72,212,0.4)]",
    dot: "bg-[#4648d4]",
    titleClass: "text-[#e1e0ff]",
  },
] as const;

const HEATMAP_ROWS = [
  {
    drug: "Amoxicillin 500mg",
    sub: "Shortage in 12 days",
    pct: "-24%",
    trend: "Seasonal Spike",
    bar: "bg-[#ba1a1a]",
    pctClass: "text-[#ba1a1a]",
  },
  {
    drug: "Lisinopril 10mg",
    sub: "Shortage in 28 days",
    pct: "-8%",
    trend: "Regular Trend",
    bar: "bg-[#f28a5b]",
    pctClass: "text-[#9a461c]",
  },
] as const;

const TOP_MEDS = [
  {
    name: "Atorvastatin 20mg",
    nameLines: null as string[] | null,
    category: "Cardiovascular",
    volume: "12,450",
    value: "$45,210.00",
    icon: "pill" as const,
  },
  {
    name: "Metformin HCL",
    nameLines: ["500mg"],
    category: "Anti-diabetic",
    volume: "10,120",
    value: "$18,450.00",
    icon: "pill" as const,
  },
  {
    name: "Fluzone",
    nameLines: ["Quadrivalent"],
    category: "Immunization",
    volume: "8,500",
    value: "$84,000.00",
    icon: "vaccines" as const,
  },
] as const;

const MAX_BAR = Math.max(...CHART_BAR_HEIGHTS);

function buildEfficacyPath(width: number, height: number) {
  const n = EFFICACY_POINTS.length;
  const step = width / (n - 1);
  return EFFICACY_POINTS.map((p, i) => {
    const x = i * step;
    const y = height - (p / 100) * height;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

export function AuraInsightsContent() {
  const [showSyncToast, setShowSyncToast] = useState(true);

  return (
    <div className="relative px-4 pb-28 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Main column */}
          <div className="flex flex-col gap-6 lg:col-span-9">
            {/* Clinical Trends Overview */}
            <section className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[#f1f5f9] p-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-[family-name:var(--font-manrope)] text-base font-normal text-[#191c1e]">
                    Clinical Trends Overview
                  </h2>
                  <p className="mt-1 text-base text-[#6c7a78]">
                    Prescription volume vs. clinical efficacy scores (Q3 2024)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#0fb9b1]" aria-hidden />
                    <span className="text-base uppercase tracking-[0.05em] text-[#6c7a78]">
                      Volume
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#4648d4]" aria-hidden />
                    <span className="text-base uppercase tracking-[0.05em] text-[#6c7a78]">
                      Efficacy
                    </span>
                  </div>
                </div>
              </div>

              <div className="relative px-4 pb-4 pt-2 sm:px-8">
                <div className="relative h-56 sm:h-64">
                  <div className="absolute inset-x-0 bottom-8 top-0 flex items-end justify-between gap-1 sm:gap-2">
                    {CHART_BAR_HEIGHTS.map((h, i) => {
                      const pct = (h / MAX_BAR) * 100;
                      const isPeak = i === 3;
                      return (
                        <div
                          key={CHART_MONTHS[i]}
                          className="relative flex min-h-0 flex-1 flex-col justify-end"
                        >
                          {isPeak && (
                            <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded bg-[#191c1e] px-2 py-1 text-center text-[10px] leading-snug text-[#f7f9fb] shadow-md">
                              Peak
                              <br />
                              Performance
                            </div>
                          )}
                          <div
                            className="relative w-full overflow-hidden rounded-t-lg bg-[#eceef0]"
                            style={{ height: `${Math.max(pct, 8)}%` }}
                          >
                            <div
                              className="absolute inset-x-1 bottom-0 top-0 rounded-t-md opacity-40"
                              style={{
                                background:
                                  "linear-gradient(137deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <svg
                    className="pointer-events-none absolute inset-x-0 bottom-8 top-0 z-[1] w-full overflow-visible"
                    viewBox="0 0 600 200"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      d={buildEfficacyPath(600, 200)}
                      fill="none"
                      stroke="#4648d4"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="mt-2 flex justify-between px-1 text-sm uppercase text-[#6c7a78] sm:px-2 sm:text-base">
                  {CHART_MONTHS.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </section>

            {/* Inventory Heatmap + Aura Sync Finance */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-[family-name:var(--font-manrope)] text-base font-normal text-[#191c1e]">
                      Inventory Heatmap
                    </h3>
                    <p className="mt-0.5 text-base uppercase tracking-[-0.025em] text-[#6c7a78]">
                      Predictive Shortages
                    </p>
                  </div>
                  <span className="material-symbols-outlined notranslate text-[#f59e0b]" aria-hidden>
                    warning
                  </span>
                </div>
                <div className="space-y-3">
                  {HEATMAP_ROWS.map((row) => (
                    <div
                      key={row.drug}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[#f2f4f6] p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`h-8 w-2 shrink-0 rounded-full ${row.bar}`} />
                        <div>
                          <p className="text-xs font-semibold text-[#191c1e]">{row.drug}</p>
                          <p className="text-[10px] text-[#6c7a78]">{row.sub}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-semibold ${row.pctClass}`}>{row.pct}</p>
                        <p className="text-[10px] text-[#6c7a78]">{row.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-[rgba(0,106,101,0.05)] py-2 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
                >
                  Adjust Procurement Orders
                </button>
              </section>

              <section className="relative overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-sm">
                <div
                  className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full opacity-10 blur-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                  }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-manrope)] text-base font-normal text-[#191c1e]">
                    Aura Sync Finance
                  </h3>
                  <span className="rounded-full bg-[#6063ee] px-2 py-0.5 text-[10px] font-semibold text-white">
                    Live
                  </span>
                </div>
                <div className="relative mt-6 space-y-6">
                  <div>
                    <div className="mb-1 flex items-end justify-between">
                      <span className="text-base text-[#6c7a78]">NET REVENUE</span>
                      <span className="text-lg font-semibold text-[#191c1e]">$1.24M</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eceef0]">
                      <div className="h-full w-[78%] rounded-full bg-[#0fb9b1]" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-end justify-between">
                      <span className="text-base text-[#6c7a78]">PROFIT MARGIN</span>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined notranslate text-sm text-[#22c55e]">
                          trending_up
                        </span>
                        <span className="text-lg font-semibold text-[#191c1e]">32.4%</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#eceef0]">
                      <div className="h-full w-[32%] rounded-full bg-[#4648d4]" />
                    </div>
                  </div>
                </div>
                <p className="relative mt-6 text-[10px] leading-relaxed text-[#6c7a78]">
                  Consolidated view across East Side, West Side, and Main Branch locations.
                </p>
              </section>
            </div>

            {/* Top Medications */}
            <section className="overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#eceef0] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-[family-name:var(--font-manrope)] text-base font-normal text-[#191c1e]">
                  Top Medications by Volume &amp; Value
                </h3>
                <Link
                  href="#"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#006a65] hover:underline"
                >
                  View Full Report
                  <span className="material-symbols-outlined notranslate text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="bg-[#f2f4f6]">
                      <th className="px-6 py-4 text-base font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                        Medication
                      </th>
                      <th className="px-6 py-4 text-base font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                        Category
                      </th>
                      <th className="px-6 py-4 text-base font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                        Volume
                        <span className="block font-normal normal-case tracking-normal text-[#94a3b8]">
                          (Units)
                        </span>
                      </th>
                      <th className="px-6 py-4 text-right text-base font-semibold uppercase tracking-[0.1em] text-[#6c7a78]">
                        Value
                        <span className="block font-normal normal-case tracking-normal text-[#94a3b8]">
                          ($)
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_MEDS.map((row, idx) => (
                      <tr
                        key={row.name}
                        className={idx > 0 ? "border-t border-[#eceef0]" : ""}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-[rgba(15,185,177,0.1)]">
                              <span className="material-symbols-outlined notranslate text-lg text-[#0fb9b1]">
                                {row.icon}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#191c1e]">{row.name}</p>
                              {row.nameLines?.map((line) => (
                                <p key={line} className="text-sm font-semibold text-[#191c1e]">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-[#6c7a78]">{row.category}</td>
                        <td className="px-6 py-5 text-xs font-medium text-[#191c1e]">{row.volume}</td>
                        <td className="px-6 py-5 text-right text-xs font-semibold text-[#191c1e]">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Sidebar: AI Feed + Network Health */}
          <aside className="flex flex-col gap-6 lg:col-span-3">
            <div className="relative overflow-hidden rounded-xl bg-[#0f172a] p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]">
              <div
                className="pointer-events-none absolute right-0 top-0 size-16 opacity-30"
                style={{
                  background: "radial-gradient(circle, rgba(15,185,177,0.4) 0%, transparent 70%)",
                }}
                aria-hidden
              />
              <div className="relative flex items-start gap-2">
                <span className="material-symbols-outlined notranslate text-xl text-[#94a3b8]">
                  auto_awesome
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-manrope)] text-base text-white">
                    AI Insights Feed
                  </h3>
                  <p className="text-xs text-[#94a3b8]">Real-time clinical intelligence</p>
                </div>
              </div>

              <div className="relative mt-7 space-y-6">
                {AI_FEED.map((item) => (
                  <div
                    key={item.title}
                    className={`relative border-l-2 pl-6 ${item.accent}`}
                  >
                    <span
                      className={`absolute -left-[7px] top-0 size-3 rounded-full border-4 border-[#0f172a] ${item.dot}`}
                      aria-hidden
                    />
                    <p className={`text-xs font-semibold ${item.titleClass}`}>{item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#cbd5e1]">{item.body}</p>
                    <p className="mt-2 text-[9px] text-[#64748b]">{item.time}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="relative mt-6 w-full rounded-lg border border-[#334155] py-3 text-xs font-semibold text-white transition hover:bg-white/5"
              >
                Generate Custom Insight
              </button>
            </div>

            <div className="rounded-xl bg-[#f2f4f6] p-6">
              <h4 className="text-base font-normal uppercase tracking-[0.1em] text-[#6c7a78]">
                Network Health
              </h4>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="text-xl font-semibold text-[#191c1e]">14</span>
                  <span className="text-[9px] uppercase text-[#6c7a78]">Active Nodes</span>
                </div>
                <div className="h-8 w-px bg-[rgba(187,201,199,0.3)]" aria-hidden />
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="text-xl font-semibold text-[#191c1e]">99.9%</span>
                  <span className="text-[9px] uppercase text-[#6c7a78]">Uptime</span>
                </div>
              </div>
              <div
                className="mt-4 flex h-24 items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] bg-gradient-to-br from-[#e2e8f0] to-[#f1f5f9] text-[10px] text-[#64748b]"
                aria-hidden
              >
                <span className="material-symbols-outlined notranslate mr-2 text-2xl opacity-50">
                  hub
                </span>
                Network topology
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sync toast — matches Figma ghost notification */}
      {showSyncToast && (
        <div className="pointer-events-auto fixed bottom-6 right-4 z-50 flex max-w-sm items-center gap-4 rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-4 shadow-2xl sm:right-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(96,99,238,0.2)]">
            <span className="material-symbols-outlined notranslate text-[#4648d4]">sync</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#191c1e]">Sync Complete</p>
            <p className="text-[10px] text-[#6c7a78]">
              Inventory data synchronized across all nodes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSyncToast(false)}
            className="shrink-0 rounded-lg p-1 text-[#94a3b8] hover:bg-slate-100"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined notranslate text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
