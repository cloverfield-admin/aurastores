"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import {
  useOrganizationOverviewQuery,
  usePatchOrganizationSettingsMutation,
} from "@/lib/queries/organization";
import { useAppMeQuery } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";
import { hasCapability } from "@/lib/rbac/capabilities";
import { isOrganizationOwnerOrAdmin } from "@/lib/membership-display";

/** Serializable org fields passed from the server page (avoids client flash). */
export type OrganizationPageSnapshot = {
  displayName: string;
  legalName: string | null;
  status: string;
  primaryEmail: string;
  primaryPhone: string | null;
  slug: string;
  hqAddressLine1: string | null;
  hqAddressLine2: string | null;
  hqCity: string | null;
  hqState: string | null;
  hqPostalCode: string | null;
  hqCountry: string;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function hqSummary(org: OrganizationPageSnapshot): string | null {
  const parts = [
    org.hqAddressLine1,
    org.hqAddressLine2,
    [org.hqCity, org.hqState].filter(Boolean).join(", "),
    org.hqPostalCode,
    org.hqCountry && org.hqCountry !== "US" ? org.hqCountry : null,
  ]
    .flatMap((p) => (p ? [p.trim()] : []))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

type QuickLink = {
  label: string;
  description: string;
  href: string;
  icon: string;
};

type OrgTabId = "overview" | "branches" | "tax" | "subscriptions";

const TAB_LABELS: Record<OrgTabId, string> = {
  overview: "Overview",
  branches: "Branches",
  tax: "Tax",
  subscriptions: "Subscriptions",
};

export function OrganizationManagementContent({ organization }: { organization: OrganizationPageSnapshot }) {
  const workspace = useDashboardWorkspaceAccess();
  const canManageOrg = hasCapability(workspace.capabilities, "organization");
  const locked = !canManageOrg;
  const meQuery = useAppMeQuery();
  const branchesQuery = useOrganizationOverviewQuery({ enabled: canManageOrg });
  const [branchSearch, setBranchSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OrgTabId>("overview");
  const patchSettings = usePatchOrganizationSettingsMutation();
  const [taxRateDraftPct, setTaxRateDraftPct] = useState<string>("");
  const [taxRateError, setTaxRateError] = useState<string | null>(null);

  const canStaff = hasCapability(workspace.capabilities, "staff");
  const canStock = hasCapability(workspace.capabilities, "stock");
  const canSales = hasCapability(workspace.capabilities, "sales");
  const canPay = hasCapability(workspace.capabilities, "pay");
  const canInsights = hasCapability(workspace.capabilities, "insights");
  const canCatalog = hasCapability(workspace.capabilities, "catalog");

  const quickLinks = useMemo((): QuickLink[] => {
    const links: QuickLink[] = [
      {
        label: "Add branch",
        description: "Onboard a new pharmacy location",
        href: ROUTES.dashboard.onboarding.pharmacyDetails,
        icon: "add_business",
      },
    ];
    if (canStaff) {
      links.push({
        label: "Staff",
        description: "Directory, roles, and invites",
        href: ROUTES.dashboard.staff,
        icon: "groups",
      });
      links.push({
        label: "Invite staff",
        description: "Add a team member",
        href: ROUTES.dashboard.staffAdd,
        icon: "person_add",
      });
    }
    if (canStock) {
      links.push({
        label: "Stock",
        description: "Inventory by branch",
        href: ROUTES.dashboard.stock,
        icon: "inventory_2",
      });
    }
    if (canSales) {
      links.push({
        label: "Sales",
        description: "Transactions by branch",
        href: ROUTES.dashboard.sales,
        icon: "trending_up",
      });
    }
    if (canPay) {
      links.push({
        label: "Aura Pay",
        description: "Payments workspace",
        href: ROUTES.dashboard.pay,
        icon: "payments",
      });
    }
    if (canInsights) {
      links.push({
        label: "Network overview",
        description: "Cross-branch metrics",
        href: ROUTES.dashboard.insights,
        icon: "insights",
      });
    }
    if (canCatalog) {
      links.push({
        label: "Product categories",
        description: "Catalog structure",
        href: ROUTES.dashboard.productCategories,
        icon: "category",
      });
    }
    return links;
  }, [canStaff, canStock, canSales, canPay, canInsights, canCatalog]);

  const branches = useMemo(() => branchesQuery.data?.branches ?? [], [branchesQuery.data?.branches]);
  const salesTax = branchesQuery.data?.salesTax ?? { enabled: false, rateBps: 0 };
  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.leadPharmacistName ?? "").toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q),
    );
  }, [branches, branchSearch]);

  const hq = hqSummary(organization);

  const taxRatePercent = (salesTax.rateBps / 100).toFixed(2).replace(/\.00$/, "");
  const effectiveTaxDraft = taxRateDraftPct !== "" ? taxRateDraftPct : taxRatePercent;

  const content = (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl sm:tracking-[-0.025em]">
              Organization
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--app-text-muted)] sm:text-base">
              {organization.displayName}
              {organization.legalName && organization.legalName !== organization.displayName
                ? ` · ${organization.legalName}`
                : null}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-text-faint)]">
              <span className="rounded-full bg-[var(--app-surface-subtle)] px-2 py-0.5 font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
                {formatLabel(organization.status)}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="break-all">Slug: {organization.slug}</span>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm">
          {(Object.keys(TAB_LABELS) as OrgTabId[]).map((id) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[var(--app-input-bg)] text-[var(--app-text)]"
                    : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" ? (
          <>
            <section className="grid gap-6 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0 sm:col-span-2">
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                  Contact &amp; HQ
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                      Email
                    </dt>
                    <dd className="mt-0.5 break-all font-medium text-[var(--app-text)]">
                      {organization.primaryEmail}
                    </dd>
                  </div>
                  {organization.primaryPhone ? (
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                        Phone
                      </dt>
                      <dd className="mt-0.5 font-medium text-[var(--app-text)]">{organization.primaryPhone}</dd>
                    </div>
                  ) : null}
                  {hq ? (
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                        Headquarters
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-[var(--app-text-secondary)]">{hq}</dd>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--app-text-muted)]">
                      No HQ address on file. You can extend this page later to edit organization profile.
                    </p>
                  )}
                </dl>
              </div>
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                  Sales tax
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--app-text)]">
                  {salesTax.enabled ? `${taxRatePercent}% enabled` : "Disabled"}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("tax")}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[var(--app-brand)]"
                >
                  Manage
                  <span className="material-symbols-outlined notranslate text-sm">arrow_forward</span>
                </button>
              </div>
            </section>

            <section>
              <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                Quick links
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm transition hover:border-[var(--app-brand)]/30 hover:bg-[#fafafa]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined notranslate shrink-0 text-2xl text-[var(--app-brand)]">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--app-text)]">{item.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">{item.description}</p>
                      </div>
                    </div>
                    <span className="mt-2 text-xs font-semibold text-[var(--app-link-teal)] group-hover:underline">
                      Open
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "branches" ? (
          <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                  Branches
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Locations you can access in this workspace ({branches.length} total).
                </p>
              </div>
              <label className="block w-full sm:max-w-xs">
                <span className="sr-only">Search branches</span>
                <input
                  type="search"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Search by name, lead, or status…"
                  className="w-full rounded-xl border-0 bg-[var(--app-input-bg)] px-4 py-2.5 text-sm text-[var(--app-text)] outline-none ring-1 ring-transparent focus:ring-2 focus:ring-[var(--app-brand)]/20"
                />
              </label>
            </div>

            {branchesQuery.isPending ? (
              <p className="text-sm text-[var(--app-text-muted)]">Loading branches…</p>
            ) : branchesQuery.isError ? (
              branchesQuery.error instanceof Error && branchesQuery.error.message === "Forbidden" ? (
                <MissingCapabilityNotice capability="organization" variant="inline" className="max-w-md" />
              ) : (
                <p className="text-sm text-red-600">
                  Could not load branches. {branchesQuery.error instanceof Error ? branchesQuery.error.message : ""}
                </p>
              )
            ) : branches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--app-border-ui)] bg-[#fafbfc] p-8 text-center text-sm text-[var(--app-text-muted)]">
                No branches yet.{" "}
                <Link
                  href={ROUTES.dashboard.onboarding.pharmacyDetails}
                  className="font-semibold text-[var(--app-link-teal)] underline"
                >
                  Add your first branch
                </Link>
                .
              </div>
            ) : (
              <>
                <div className="space-y-4 md:hidden">
                  {filteredBranches.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-[family-name:var(--font-manrope)] text-base font-bold text-[var(--app-text)]">
                          {b.name}
                        </h3>
                        {b.isPrimary ? (
                          <span className="shrink-0 rounded-full bg-[rgba(0,106,101,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--app-brand)]">
                            Primary
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                        Status: <span className="font-medium text-[var(--app-text)]">{formatLabel(b.status)}</span>
                      </p>
                      <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                        Lead:{" "}
                        <span className="font-medium text-[var(--app-text)]">{b.leadPharmacistName ?? "—"}</span>
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--app-surface-subtle)] pt-4">
                        {canStock ? (
                          <Link
                            href={`${ROUTES.dashboard.stock}?branch=${encodeURIComponent(b.id)}`}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--app-input-bg)] px-3 py-2 text-xs font-semibold text-[var(--app-brand)]"
                          >
                            Stock
                          </Link>
                        ) : null}
                        {canSales ? (
                          <Link
                            href={`${ROUTES.dashboard.sales}?branch=${encodeURIComponent(b.id)}`}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--app-input-bg)] px-3 py-2 text-xs font-semibold text-[var(--app-brand)]"
                          >
                            Sales
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {filteredBranches.length === 0 && branches.length > 0 ? (
                    <p className="text-center text-sm text-[var(--app-text-muted)]">No branches match your search.</p>
                  ) : null}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:block">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[var(--app-surface-subtle)] bg-[var(--app-input-bg)]">
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                          Name
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                          Primary
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                          Status
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                          Lead pharmacist
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
                          Open
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBranches.map((b) => (
                        <tr key={b.id} className="border-b border-[#f8fafc] last:border-0">
                          <td className="px-4 py-4 text-sm font-semibold text-[var(--app-text)]">{b.name}</td>
                          <td className="px-4 py-4 text-sm text-[var(--app-text-muted)]">{b.isPrimary ? "Yes" : "—"}</td>
                          <td className="px-4 py-4 text-sm text-[var(--app-text-muted)]">{formatLabel(b.status)}</td>
                          <td className="px-4 py-4 text-sm text-[var(--app-text)]">{b.leadPharmacistName ?? "—"}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canStock ? (
                                <Link
                                  href={`${ROUTES.dashboard.stock}?branch=${encodeURIComponent(b.id)}`}
                                  className="rounded-lg bg-[var(--app-input-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-brand)] hover:bg-[var(--app-surface-muted)]"
                                >
                                  Stock
                                </Link>
                              ) : null}
                              {canSales ? (
                                <Link
                                  href={`${ROUTES.dashboard.sales}?branch=${encodeURIComponent(b.id)}`}
                                  className="rounded-lg bg-[var(--app-input-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--app-brand)] hover:bg-[var(--app-surface-muted)]"
                                >
                                  Sales
                                </Link>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredBranches.length === 0 && branches.length > 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-[var(--app-text-muted)]">
                      No branches match your search.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === "tax" ? (
          <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
                  Sales tax
                </h2>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  When enabled, tax is applied to each sale line subtotal at checkout.
                </p>
              </div>
              {patchSettings.isError ? (
                <p className="text-sm text-red-600">
                  {patchSettings.error instanceof Error ? patchSettings.error.message : "Could not save settings."}
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4 sm:col-span-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--app-text)]">Apply tax to sales</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">Enabled sales will record tax fields.</p>
                </div>
                <input
                  type="checkbox"
                  checked={salesTax.enabled}
                  onChange={(e) => {
                    void patchSettings.mutateAsync({
                      salesTaxEnabled: e.target.checked,
                      salesTaxRateBps: e.target.checked ? salesTax.rateBps : 0,
                    });
                  }}
                  className="h-5 w-5 accent-[var(--app-brand)]"
                />
              </label>

              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                  Tax rate
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={!salesTax.enabled || patchSettings.isPending}
                    value={effectiveTaxDraft}
                    onChange={(e) => {
                      setTaxRateDraftPct(e.target.value);
                      setTaxRateError(null);
                    }}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        setTaxRateError("Enter a tax rate (0–100).");
                        return;
                      }

                      const pct = Number.parseFloat(raw);
                      if (!Number.isFinite(pct)) {
                        setTaxRateError("Tax rate must be a number.");
                        return;
                      }
                      if (pct < 0 || pct > 100) {
                        setTaxRateError("Tax rate must be between 0 and 100.");
                        return;
                      }

                      const nextBps = Math.round(pct * 100);
                      void patchSettings.mutateAsync({
                        salesTaxEnabled: true,
                        salesTaxRateBps: nextBps,
                      });
                      setTaxRateDraftPct("");
                    }}
                    className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none disabled:opacity-60"
                  />
                  <span className="text-sm font-semibold text-[var(--app-text-muted)]">%</span>
                </div>
                {taxRateError ? (
                  <p className="mt-2 text-xs font-semibold text-[#ba1a1a]">{taxRateError}</p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--app-text-muted)]">Enter a number from 0 to 100.</p>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "subscriptions" ? (
          <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
              Subscriptions
            </h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              Manage your plan, invoices, and billing details.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4 lg:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                  Current plan
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
                    {meQuery.isLoading
                      ? "Loading…"
                      : (meQuery.data?.subscription?.planCode ?? "free").toUpperCase()}
                  </p>
                  <span className="rounded-full bg-[var(--app-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--app-text-muted)]">
                    {meQuery.data?.subscription?.interval ?? "monthly"}
                  </span>
                  <span className="rounded-full bg-[#f0fdfa] px-2 py-1 text-[11px] font-semibold text-[var(--app-link-teal)]">
                    {meQuery.data?.subscription?.status ?? "active"}
                  </span>
                </div>
                {meQuery.data?.subscription?.scheduledPlanCode ? (
                  <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                    Scheduled change:{" "}
                    <span className="font-semibold text-[var(--app-text)]">
                      {meQuery.data.subscription.scheduledPlanCode.toUpperCase()}
                    </span>
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-[var(--app-text-muted)]">
                  Upgrade anytime to unlock more limits and modules.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {isOrganizationOwnerOrAdmin(workspace.membershipRole) ? (
                    <Link
                      href={ROUTES.billingPortal}
                      prefetch={false}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                    >
                      <span className="material-symbols-outlined notranslate text-base">upgrade</span>
                      View plans
                    </Link>
                  ) : null}
                  <Link
                    href={ROUTES.billingPortal}
                    prefetch={false}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-input-bg)]"
                  >
                    <span className="material-symbols-outlined notranslate text-base">credit_card</span>
                    Open billing portal
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                  Plan limits
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--app-text-muted)]">Products</span>
                    <span className="font-semibold text-[var(--app-text)]">
                      {meQuery.data?.usage?.products ?? "—"} / {meQuery.data?.entitlements?.limits?.products ?? "∞"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--app-text-muted)]">Categories</span>
                    <span className="font-semibold text-[var(--app-text)]">
                      {meQuery.data?.usage?.categories ?? "—"} / {meQuery.data?.entitlements?.limits?.categories ?? "∞"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--app-text-muted)]">Sales</span>
                    <span className="font-semibold text-[var(--app-text)]">
                      {meQuery.data?.usage?.salesTransactions ?? "—"} /{" "}
                      {meQuery.data?.entitlements?.limits?.salesTransactions ?? "∞"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="organization">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        <MissingCapabilityNotice capability="organization" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}
