"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { ROUTES } from "@/lib/routes";
import { DASHBOARD_ASSETS } from "./dashboard-assets";

export function NetworkOverviewContent() {
  const { withLoading, notify } = useAuraFeedback();

  return (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl sm:tracking-[-0.025em]">
              Network Overview
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#3c4948]">
              Real-time clinical and operational pulse across all active branches.
            </p>
          </div>
          <Link
            href={ROUTES.dashboard.onboarding.pharmacyDetails}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-3 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(99,102,241,0.2),0_4px_6px_-4px_rgba(99,102,241,0.2)] transition hover:opacity-95"
          >
            <span className="material-symbols-outlined notranslate text-[22px]">add</span>
            Add New Branch
          </Link>
        </div>

        {/* KPI row */}
        <div className="grid gap-6 md:grid-cols-3">
          <article className="relative rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex size-[42px] items-center justify-center rounded-xl bg-[rgba(96,99,238,0.08)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#6063ee]">
                  payments
                </span>
              </div>
              <span className="rounded-full bg-[rgba(96,99,238,0.1)] px-2 py-1 text-xs text-[#6063ee]">
                +12.4% vs LW
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[#3c4948]">
              Network Revenue
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">
              ZMW 142,850.40
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#e6e8ea]">
              <div
                className="h-full w-[78%] rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              />
            </div>
          </article>

          <article className="relative rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex size-[42px] items-center justify-center rounded-xl bg-[rgba(186,26,26,0.06)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#ba1a1a]">
                  inventory_2
                </span>
              </div>
              <span className="rounded-full bg-[rgba(255,218,214,0.2)] px-2 py-1 text-xs text-[#ba1a1a]">
                48 Low Stock
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[#3c4948]">
              Stock Integrity
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">
              94.2%
            </p>
            <div className="mt-4 flex gap-1">
              <div className="h-1.5 flex-1 rounded-full bg-[#0fb9b1]" />
              <div className="h-1.5 flex-1 rounded-full bg-[#0fb9b1]" />
              <div className="h-1.5 flex-1 rounded-full bg-[#0fb9b1]" />
              <div className="h-1.5 flex-1 rounded-full bg-[rgba(15,185,177,0.2)]" />
            </div>
          </article>

          <article className="relative rounded-xl border border-[rgba(187,201,199,0.15)] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex h-9 w-12 items-center justify-center rounded-xl bg-[rgba(0,106,101,0.08)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#006a65]">
                  groups
                </span>
              </div>
              <span className="rounded-full bg-[rgba(0,106,101,0.1)] px-2 py-1 text-xs text-[#006a65]">
                18 Active Now
              </span>
            </div>
            <p className="mt-4 text-base font-normal uppercase tracking-[0.1em] text-[#3c4948]">
              Staff Deployment
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">
              24 / 28
            </p>
            <div className="mt-4 flex -space-x-2">
              {[
                DASHBOARD_ASSETS.staffA,
                DASHBOARD_ASSETS.staffB,
                DASHBOARD_ASSETS.staffC,
              ].map((src) => (
                <div
                  key={src}
                  className="relative size-8 shrink-0 overflow-hidden rounded-full border-2 border-white"
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="32px" />
                </div>
              ))}
              <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#e6e8ea] text-[10px] font-semibold text-[#191c1e]">
                +15
              </div>
            </div>
          </article>
        </div>

        {/* Branch cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          <BranchLocationCard
            name="Main Branch"
            mapSrc={DASHBOARD_ASSETS.mapMain}
            status="online"
            onManageLogistics={withLoading}
            notify={notify}
            rows={[
              { label: "Daily Rx Volume", value: "412 Units" },
              { label: "Current Lead Pharmacist", valueLines: ["Dr. Sarah", "Chen"] },
              { label: "Wait Time Avg.", value: "8 mins", valueTone: "teal" as const },
            ]}
          />
          <BranchLocationCard
            name="East Side"
            mapSrc={DASHBOARD_ASSETS.mapEast}
            status="online"
            onManageLogistics={withLoading}
            notify={notify}
            rows={[
              { label: "Daily Rx Volume", value: "285 Units" },
              { label: "Current Lead Pharmacist", valueLines: ["Dr. James", "Miller"] },
              { label: "Wait Time Avg.", value: "14 mins", valueTone: "teal" as const },
            ]}
          />
          <BranchLocationCard
            name="Warehouse"
            mapSrc={DASHBOARD_ASSETS.mapWarehouse}
            status="offline"
            onManageLogistics={withLoading}
            notify={notify}
            rows={[
              { labelLines: ["Inventory", "Throughput"], valueLines: ["1,200", "Units"] },
              { label: "Floor Supervisor", value: "Marcus Reid" },
              { label: "Restock Efficiency", value: "98.2%", valueTone: "indigo" as const },
            ]}
          />
        </div>

        {/* Activity stream */}
        <section className="rounded-2xl border border-[rgba(187,201,199,0.15)] bg-[#f2f4f6] p-6 sm:p-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-bold text-[#191c1e]">
              Network Activity Stream
            </h2>
            <button
              type="button"
              className="rounded-lg border border-[rgba(187,201,199,0.2)] bg-white p-2 text-[#64748b] hover:bg-slate-50"
              aria-label="Filter activity"
            >
              <span className="material-symbols-outlined notranslate text-lg">filter_list</span>
            </button>
          </div>

          <div className="relative pl-8">
            <div
              className="absolute bottom-2 left-[15px] top-2 w-0.5 rounded-full bg-gradient-to-b from-[#0fb9b1] via-[#6366f1] to-[#cbd5e1] opacity-30"
              aria-hidden
            />
            <ul className="space-y-8">
              <ActivityRow
                dotClass="bg-[#006a65]"
                iconWrapClass="bg-[rgba(15,185,177,0.1)]"
                icon="local_shipping"
                title="Bulk Restock Complete"
                description="Warehouse dispatched 500 units of Insulin to Main Branch."
                time="14:20 PM"
                meta="Completed"
                metaClass="text-[#006a65]"
              />
              <ActivityRow
                dotClass="bg-[#4648d4]"
                iconWrapClass="bg-[rgba(96,99,238,0.1)]"
                icon="trending_up"
                title="Revenue Peak Detected"
                description="East Side surpassed daily target by 15% in last hour."
                time="12:45 PM"
                meta="Insight"
                metaClass="text-[#4648d4]"
              />
              <ActivityRow
                dimmed
                dotClass="bg-[#cbd5e1]"
                iconWrapClass="bg-[#f1f5f9]"
                icon="schedule"
                title="Shift Change"
                description="Main Branch handover from Dr. Chen to Dr. Al-Sayed."
                time="08:00 AM"
                meta="Scheduled"
                metaClass="text-[#94a3b8]"
              />
            </ul>
          </div>
        </section>

        {/* Footer strip */}
        <footer className="flex flex-col gap-4 border-t border-[#f1f5f9] pt-6 text-[11px] uppercase tracking-[0.1em] text-[#94a3b8] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-[#cbd5e1]">AuraPharma v2.4.0</span>
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
          </div>
          <p className="text-right sm:text-left">© 2024 AuraPharma v2.4.0 Clinical Intelligence</p>
        </footer>
      </div>
    </div>
  );
}

type BranchRow = {
  label?: string;
  labelLines?: string[];
  value?: string;
  valueLines?: string[];
  valueTone?: "teal" | "indigo";
};

function BranchLocationCard({
  name,
  mapSrc,
  status,
  onManageLogistics,
  notify,
  rows,
}: {
  name: string;
  mapSrc: string;
  status: "online" | "offline";
  onManageLogistics: (key: string, message: string, task: () => Promise<unknown>) => Promise<unknown>;
  notify: (input: {
    variant?: "success" | "error" | "info" | "warning";
    title: string;
    description?: string;
  }) => void;
  rows: BranchRow[];
}) {
  const online = status === "online";
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[rgba(187,201,199,0.15)] bg-white shadow-sm">
      <div className="relative h-32 overflow-hidden bg-[#f1f5f9]">
        <Image
          src={mapSrc}
          alt=""
          fill
          className="object-cover object-[center_35%]"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            background:
              "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
          }}
        />
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-sm">
            <span
              className={`size-1.5 rounded-full ${online ? "bg-[#006a65]" : "bg-[#94a3b8]"}`}
            />
            <span className={online ? "text-[#006a65]" : "text-[#3c4948]"}>
              {online ? "ONLINE" : "OFFLINE (Syncing)"}
            </span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
            {name}
          </h3>
          <span className="material-symbols-outlined notranslate text-lg text-[#64748b]">
            open_in_new
          </span>
        </div>
        <dl className="space-y-3 text-base">
          {rows.map((row, i) => {
            const key = `${row.label ?? row.labelLines?.join()}-${i}`;
            const dt =
              row.labelLines?.length ? (
                <>
                  {row.labelLines.map((line, j) => (
                    <span key={j} className="block leading-snug">
                      {line}
                    </span>
                  ))}
                </>
              ) : (
                row.label
              );
            const ddClass =
              row.valueTone === "teal"
                ? "text-[#006a65]"
                : row.valueTone === "indigo"
                  ? "text-[#4648d4]"
                  : "text-[#191c1e]";
            const dd =
              row.valueLines?.length ? (
                <>
                  {row.valueLines.map((line, j) => (
                    <span key={j} className="block leading-snug">
                      {line}
                    </span>
                  ))}
                </>
              ) : (
                row.value
              );
            return (
              <div key={key} className="flex items-start justify-between gap-4">
                <dt className="text-[#3c4948]">{dt}</dt>
                <dd className={`text-right font-semibold ${ddClass}`}>{dd}</dd>
              </div>
            );
          })}
        </dl>
        <button
          type="button"
          onClick={async () => {
            await onManageLogistics(
              `dashboard-manage-logistics-${name.toLowerCase().replace(/\s/g, "-")}`,
              `Loading logistics for ${name}...`,
              async () => {
                // TODO: implement logistics management
                await new Promise((r) => setTimeout(r, 500));
                notify({
                  variant: "info",
                  title: "Manage Logistics",
                  description: `Logistics view for ${name} coming soon.`,
                });
              },
            );
          }}
          className="mt-auto w-full rounded-lg bg-[#f2f4f6] py-2 text-center text-base font-semibold text-[#006a65] transition hover:bg-[#e8eaed]"
        >
          Manage Logistics
        </button>
      </div>
    </article>
  );
}

function ActivityRow({
  dotClass,
  iconWrapClass,
  icon,
  title,
  description,
  time,
  meta,
  metaClass,
  dimmed,
}: {
  dotClass: string;
  iconWrapClass: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  meta: string;
  metaClass: string;
  dimmed?: boolean;
}) {
  return (
    <li className={`relative ${dimmed ? "opacity-60" : ""}`}>
      <span
        className={`absolute -left-[25px] top-2 size-4 rounded-full border-2 border-white shadow-[0_0_0_4px_#f2f4f6,0_1px_2px_rgba(0,0,0,0.05)] ${dotClass}`}
        aria-hidden
      />
      <div className="flex flex-col gap-3 rounded-xl border border-[rgba(187,201,199,0.05)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
          >
            <span className="material-symbols-outlined notranslate text-xl text-[#191c1e]">
              {icon}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#191c1e]">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#3c4948]">{description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right sm:pl-4">
          <p className="text-[10px] font-normal uppercase tracking-wider text-[#3c4948]">
            {time}
          </p>
          <p className={`mt-0.5 text-xs font-semibold ${metaClass}`}>{meta}</p>
        </div>
      </div>
    </li>
  );
}
