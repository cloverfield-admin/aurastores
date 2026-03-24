"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useStockBranchesQuery } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";
import { DASHBOARD_ASSETS } from "./dashboard-assets";

const BRANCH_TABS = ["Main Branch", "East Side", "Warehouse"] as const;

const MODULE_NAV: { label: string; icon: string; href: string }[] = [
  { label: "Aura Stock", icon: "inventory_2", href: ROUTES.dashboard.stock },
  { label: "Aura Sales", icon: "trending_up", href: ROUTES.dashboard.sales },
  { label: "Aura Pay", icon: "payments", href: ROUTES.dashboard.pay },
  { label: "Aura Insights", icon: "insights", href: ROUTES.dashboard.insights },
  { label: "Staff", icon: "groups", href: ROUTES.dashboard.staff },
];

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const [localSearch, setLocalSearch] = useState("");
  const [defaultBranchTab, setDefaultBranchTab] = useState<(typeof BRANCH_TABS)[number]>("Main Branch");

  const isStock = pathname === ROUTES.dashboard.stock || pathname.startsWith(`${ROUTES.dashboard.stock}/`);
  const isSales = pathname === ROUTES.dashboard.sales || pathname.startsWith(`${ROUTES.dashboard.sales}/`);
  const isInsights =
    pathname === ROUTES.dashboard.insights || pathname.startsWith(`${ROUTES.dashboard.insights}/`);
  const isSettings = pathname === ROUTES.settings;
  const isStaff = pathname === ROUTES.dashboard.staff || pathname.startsWith(`${ROUTES.dashboard.staff}/`);
  const isStaffAdd = pathname === ROUTES.dashboard.staffAdd;
  const searchPlaceholder = isStock
    ? "Search inventory..."
    : isSales
      ? "Search sales ID, patient, or drug..."
      : isInsights
        ? "Search insights..."
        : isStaff
          ? "Search pharmacy network..."
          : "Search clinical data...";
  const topActionLabel = isStock ? "Aura Sync" : "Branch Toggle";
  const topActionIcon = isStock ? "sync" : "shuffle";
  const topActionVariant = isStock ? "outline" : "primary";
  const stockBranchId = isStock ? searchParams.get("branch") ?? undefined : undefined;
  const salesBranchId = isSales ? searchParams.get("branch") ?? undefined : undefined;
  const insightsBranchId = isInsights ? searchParams.get("branch") ?? undefined : undefined;
  const staffBranchId = isStaff ? searchParams.get("branch") ?? undefined : undefined;
  const sectionBranchId = isStock ? stockBranchId : isSales ? salesBranchId : isInsights ? insightsBranchId : isStaff ? staffBranchId : undefined;
  const branchesQuery = useStockBranchesQuery(sectionBranchId, isStock || isSales || isInsights || isStaff);
  const sectionBranchTabs = branchesQuery.data?.branches ?? [];
  const activeSectionBranchId = branchesQuery.data?.branch.id ?? sectionBranchId;

  const SALES_TABS = ["Overview", "Analytics", "Reports"] as const;
  const [salesTab, setSalesTab] = useState<(typeof SALES_TABS)[number]>("Overview");

  const preservedBranch = searchParams.get("branch") ?? undefined;

  function updateStockBranch(branchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function updateSalesBranch(branchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function updateInsightsBranch(branchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function updateStaffBranch(branchId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  function navHref(base: string) {
    return preservedBranch ? `${base}?branch=${preservedBranch}` : base;
  }

  return (
    <div className="aura-landing min-h-dvh bg-[#f7f9fb] text-[#191c1e]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-64 flex-col justify-between border-r border-[#f1f5f9] bg-[#f8fafc] p-4">
        <div>
          <Link href={ROUTES.dashboard.main} className="flex items-center gap-3 px-2 pb-8 pt-2">
            <div
              className="flex size-10 items-center justify-center rounded-xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
            >
              <span className="material-symbols-outlined notranslate text-xl text-white">
                local_pharmacy
              </span>
            </div>
            <div>
              <p className="bg-gradient-to-r from-[#14b8a6] to-[#6366f1] bg-clip-text font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-transparent">
                AuraPharma
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[-0.05em] text-[#64748b]">
                Clinical Intelligence
              </p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1" aria-label="Product modules">
            {MODULE_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const href =
                item.href === ROUTES.dashboard.stock ||
                item.href === ROUTES.dashboard.sales ||
                item.href === ROUTES.dashboard.insights ||
                item.href === ROUTES.dashboard.staff
                  ? navHref(item.href)
                  : item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white text-[#0d9488] shadow-sm"
                      : "text-[#64748b] hover:bg-slate-100/80"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined notranslate text-xl ${active ? "text-[#0d9488]" : ""}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-[rgba(226,232,240,0.5)] pt-4">
          <nav className="flex flex-col gap-1" aria-label="Account">
            <Link
              href={ROUTES.settings}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isSettings
                  ? "bg-white text-[#0d9488] shadow-sm"
                  : "text-[#64748b] hover:bg-slate-100/80"
              }`}
            >
              <span
                className={`material-symbols-outlined notranslate text-xl ${isSettings ? "text-[#0d9488]" : ""}`}
              >
                settings
              </span>
              Settings
            </Link>
            <Link
              href={ROUTES.features}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748b] hover:bg-slate-100/80"
            >
              <span className="material-symbols-outlined notranslate text-xl">support_agent</span>
              Support
            </Link>
          </nav>
          <Link
            href={ROUTES.settings}
            className="mt-3 block rounded-xl bg-[#f1f5f9] p-3 transition hover:bg-[#e2e8f0]"
          >
            <div className="flex items-center gap-3">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-[#cbd5e1]">
                <Image
                  src={DASHBOARD_ASSETS.sidebarProfile}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-manrope)] text-xs font-bold text-[#191c1e]">
                  Pharmacy Manager
                </p>
                <p className="text-[10px] font-medium text-[#64748b]">Admin Access</p>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-[#f1f5f9] bg-white/80 shadow-[0_1px_2px_0_rgba(226,232,240,0.5)] backdrop-blur-md lg:left-64">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {isSettings ? (
              <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[#0f172a] sm:text-lg">
                Profile & Settings
              </h1>
            ) : isStaffAdd ? (
              <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[#0f172a] sm:text-lg">
                Add New Staff
              </h1>
            ) : isStaff ? (
              <>
                <label className="relative hidden w-full min-w-0 sm:block sm:w-64">
                  <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#94a3b8]">
                    search
                  </span>
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="w-full rounded-full border-0 bg-[#f2f4f6] py-2 pl-10 pr-4 text-sm text-[#191c1e] placeholder:text-[#94a3b8] outline-none ring-1 ring-transparent focus:ring-[#14b8a6]/25"
                  />
                </label>
                <nav className="flex flex-wrap items-center gap-6" aria-label="Branch filter">
                  {(sectionBranchTabs.length > 0 ? sectionBranchTabs : BRANCH_TABS).map((tab) => {
                    const tabId = typeof tab === "string" ? tab : tab.id;
                    const tabLabel = typeof tab === "string" ? tab : tab.name;
                    const active = tabId === activeSectionBranchId;
                    return (
                      <button
                        key={tabId}
                        type="button"
                        onClick={() => updateStaffBranch(tabId)}
                        className={`pb-1.5 pt-1 font-[family-name:var(--font-manrope)] text-sm ${
                          active
                            ? "border-b-2 border-[#14b8a6] font-semibold text-[#0d9488]"
                            : "font-normal text-[#64748b] hover:text-[#0f172a]"
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </nav>
              </>
            ) : isInsights ? (
              <>
                <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[#0f172a] sm:text-lg">
                  Pharmacy Network Dashboard
                </h1>
                <nav
                  className="flex flex-wrap items-center gap-6"
                  aria-label="Branch filter"
                >
                  {(sectionBranchTabs.length > 0 ? sectionBranchTabs : BRANCH_TABS).map((tab) => {
                    const tabId = typeof tab === "string" ? tab : tab.id;
                    const tabLabel = typeof tab === "string" ? tab : tab.name;
                    const active = tabId === activeSectionBranchId;
                    return (
                      <button
                        key={tabId}
                        type="button"
                        onClick={() => updateInsightsBranch(tabId)}
                        className={`pb-1.5 pt-1 text-sm ${
                          active
                            ? "border-b-2 border-[#0fb9b1] font-medium text-[#0fb9b1]"
                            : "font-normal text-[#475569] hover:text-[#0f172a]"
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </nav>
              </>
            ) : isSales ? (
              <>
                <nav
                  className="flex flex-wrap items-center gap-6"
                  aria-label="Active branch context"
                >
                  {(sectionBranchTabs.length > 0 ? sectionBranchTabs : BRANCH_TABS).map((tab) => {
                    const tabId = typeof tab === "string" ? tab : tab.id;
                    const tabLabel = typeof tab === "string" ? tab : tab.name;
                    const active = tabId === activeSectionBranchId;
                    return (
                      <button
                        key={tabId}
                        type="button"
                        onClick={() => updateSalesBranch(tabId)}
                        className={`pb-1.5 pt-1 font-[family-name:var(--font-manrope)] text-sm ${
                          active
                            ? "border-b-2 border-[#14b8a6] font-semibold text-[#0d9488]"
                            : "font-normal text-[#64748b] hover:text-[#0f172a]"
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </nav>
                <nav className="flex items-center gap-6" aria-label="Sales sections">
                  {SALES_TABS.map((tab) => {
                    const active = tab === salesTab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSalesTab(tab)}
                        className={`pb-1.5 pt-1 font-[family-name:var(--font-manrope)] text-sm ${
                          active
                            ? "border-b-2 border-[#14b8a6] font-semibold text-[#0d9488]"
                            : "font-normal text-[#64748b] hover:text-[#0f172a]"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </nav>
              </>
            ) : (
              <>
                {!isStock && !isSettings ? (
                  <label className="relative block w-full sm:w-64">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#94a3b8]">
                      search
                    </span>
                    <input
                      type="search"
                      placeholder={searchPlaceholder}
                      value={localSearch}
                      onChange={(event) => {
                        setLocalSearch(event.target.value);
                      }}
                      className="w-full rounded-full border-0 bg-[#f2f4f6] py-2 pl-10 pr-4 text-sm text-[#191c1e] placeholder:text-[#94a3b8] outline-none ring-1 ring-transparent focus:ring-[#14b8a6]/25"
                    />
                  </label>
                ) : null}
                <nav
                  className="flex flex-wrap items-center gap-6"
                  aria-label="Active branch context"
                >
                  {(isStock && sectionBranchTabs.length > 0 ? sectionBranchTabs : BRANCH_TABS).map((tab) => {
                    const tabId = typeof tab === "string" ? tab : tab.id;
                    const tabLabel = typeof tab === "string" ? tab : tab.name;
                    const isActive = isStock
                      ? tabId === activeSectionBranchId
                      : tabLabel === defaultBranchTab;

                    return (
                      <button
                        key={tabId}
                        type="button"
                        onClick={() => {
                          if (isStock) {
                            updateStockBranch(tabId);
                            return;
                          }

                          setDefaultBranchTab(tabLabel as (typeof BRANCH_TABS)[number]);
                        }}
                        className={`pb-1.5 pt-1 font-[family-name:var(--font-manrope)] text-sm ${
                          isActive
                            ? "border-b-2 border-[#14b8a6] font-semibold text-[#0d9488]"
                            : "font-normal text-[#64748b] hover:text-[#0f172a]"
                        }`}
                      >
                        {tabLabel}
                      </button>
                    );
                  })}
                </nav>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-transparent pt-2 sm:border-t-0 sm:pt-0">
            {isInsights && (
              <>
                <label className="relative hidden w-full min-w-0 sm:block sm:w-64">
                  <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#94a3b8]">
                    search
                  </span>
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="w-full rounded-full border-0 bg-[#e0e3e5] py-2 pl-10 pr-4 text-sm text-[#191c1e] placeholder:text-[#6b7280] outline-none"
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg p-2 text-[#64748b] hover:bg-slate-100"
                  aria-label="Calendar"
                >
                  <span className="material-symbols-outlined notranslate text-xl">calendar_today</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await withLoading(
                      "dashboard-export-report",
                      "Preparing report export...",
                      async () => {
                        // TODO: implement export
                        await new Promise((r) => setTimeout(r, 600));
                        notify({
                          variant: "success",
                          title: "Report exported",
                          description: "Your report has been downloaded.",
                        });
                      },
                    );
                  }}
                  className="inline-flex items-center rounded-lg bg-[#0fb9b1] px-4 py-2 text-xs font-semibold text-[#004340] transition hover:opacity-95"
                >
                  Export Report
                </button>
              </>
            )}
            {!isSales && !isInsights && !isSettings && !isStaff && !isStaffAdd && (
              <button
                type="button"
                onClick={async () => {
                  await withLoading(
                    "dashboard-aura-sync",
                    "Syncing inventory across branches...",
                    async () => {
                      // TODO: implement Aura Sync
                      await new Promise((r) => setTimeout(r, 800));
                      notify({
                        variant: "success",
                        title: "Sync complete",
                        description: "All branches are up to date.",
                      });
                    },
                  );
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 font-[family-name:var(--font-manrope)] text-sm ${
                  topActionVariant === "primary"
                    ? "bg-[#0fb9b1] font-bold text-[#004340]"
                    : "bg-[#f2f4f6] font-medium text-[#191c1e]"
                }`}
              >
                <span className="material-symbols-outlined notranslate text-lg">{topActionIcon}</span>
                {topActionLabel}
              </button>
            )}
            {isSales && (
              <label className="relative hidden w-64 sm:block">
                <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#94a3b8]">
                  search
                </span>
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="w-full rounded-full border-0 bg-[#f2f4f6] py-2 pl-10 pr-4 text-sm text-[#191c1e] placeholder:text-[#94a3b8] outline-none"
                />
              </label>
            )}
            <div className="flex items-center gap-2 border-l border-[#f1f5f9] pl-4">
              <button
                type="button"
                className="rounded-lg p-1.5 text-[#64748b] hover:bg-slate-100"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined notranslate text-xl">
                  notifications
                </span>
              </button>
              <Link
                href={ROUTES.settings}
                className="relative block size-8 overflow-hidden rounded-full shadow-[0_0_0_2px_rgba(20,184,166,0.2)] transition hover:opacity-90"
                aria-label="Profile and settings"
              >
                <Image
                  src={DASHBOARD_ASSETS.topUserAvatar}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="lg:pl-64">
        <div className="pt-32 sm:pt-24">{children}</div>
      </div>
    </div>
  );
}
