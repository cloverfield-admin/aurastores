"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AdminError, AdminSection, AdminTable } from "@/components/admin/admin-primitives";
import { useImpersonation } from "@/components/admin/impersonation-provider";
import { count, dateTime, money, moneyCompact } from "@/components/admin/format";
import { KpiCard, SkeletonCard } from "@/components/ui/kpi-card";
import { adminFetch } from "@/lib/api/engine";
import { adminKeys } from "@/lib/queries/admin";
import { ROUTES } from "@/lib/routes";

/**
 * Read-only "view as store".
 *
 * Every panel here is served by an ORDINARY TENANT endpoint — the same
 * `/api/v1/dashboard/insights/overview`, `/api/v1/stock` and `/api/v1/sales/recent`
 * the store's own dashboard calls. The only difference is the
 * `X-Aura-Impersonate-Org` header, which the engine honours for platform admins on
 * GETs and refuses on everything else. That is why this page needed no new
 * per-company read APIs, and why nothing on it can change the store's data.
 */

// Field names are the engine's, verified against internal/domain/{insights,stock}.
// They previously omitted the _30d / _sku suffixes, so every card below read
// undefined and rendered a hard zero.
type InsightsOverview = {
  kpis?: {
    revenue_cents_30d?: number;
    sales_count_30d?: number;
    units_sold_30d?: number;
  };
};

type StockDashboard = {
  metrics?: {
    total_stock_value_cents?: number;
    total_available_units?: number;
    total_batch_count?: number;
    low_stock_sku_count?: number;
  };
};

type RecentSale = {
  id: string;
  sale_number?: string;
  total_cents: number;
  created_at: string;
  served_by?: string | null;
};

export function AdminCompanyViewContent({ orgId }: { orgId: string }) {
  const { target } = useImpersonation();

  // Query keys are scoped by org id. Without that, switching from company A to
  // company B would render A's cached revenue under B's name — the easiest
  // data-leak bug to ship in this whole console.
  const insights = useQuery({
    queryKey: adminKeys.impersonated(orgId, "insights"),
    queryFn: () =>
      adminFetch<InsightsOverview>("/api/v1/dashboard/insights/overview", { impersonate: true }),
    enabled: Boolean(target),
  });

  const stock = useQuery({
    queryKey: adminKeys.impersonated(orgId, "stock"),
    queryFn: () => adminFetch<StockDashboard>("/api/v1/stock", { impersonate: true }),
    enabled: Boolean(target),
  });

  const recent = useQuery({
    queryKey: adminKeys.impersonated(orgId, "sales-recent"),
    queryFn: () => adminFetch<RecentSale[]>("/api/v1/sales/recent", { impersonate: true }),
    enabled: Boolean(target),
  });

  // Landing here directly (a bookmark, a refresh) means no impersonation session
  // was started, so there is no header to send and every read would silently
  // return the ADMIN's own store. Send them back rather than show wrong data.
  if (!target) {
    return (
      <div className="space-y-4">
        <AdminSection title="No store view is open" subtitle="Start one from the company page">
          <p className="text-sm text-[var(--app-text-muted)]">
            A store view has to be opened from the company itself so it can be recorded in the audit
            log.
          </p>
          <Link
            href={ROUTES.admin.company(orgId)}
            className="mt-4 inline-block rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            Go to the company
          </Link>
        </AdminSection>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link
          href={ROUTES.admin.company(orgId)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-link-teal)]"
        >
          <span aria-hidden className="material-symbols-outlined notranslate text-base">
            arrow_back
          </span>
          Back to {target.display_name}
        </Link>
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
          {target.display_name}
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          What this store sees on its own dashboard. Read-only — the engine refuses any write sent
          from this view.
        </p>
      </header>

      {insights.isError ? (
        <AdminError error={insights.error} onRetry={() => void insights.refetch()} />
      ) : insights.isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon="payments"
            label="Revenue (30d)"
            value={moneyCompact(insights.data.kpis?.revenue_cents_30d ?? 0)}
            sub={`${count(insights.data.kpis?.sales_count_30d ?? 0)} sales`}
          />
          <KpiCard
            icon="trending_up"
            label="Units sold (30d)"
            value={count(insights.data.kpis?.units_sold_30d ?? 0)}
            sub="Across every branch in scope"
          />
          <KpiCard
            icon="inventory_2"
            label="Stock value"
            value={moneyCompact(stock.data?.metrics?.total_stock_value_cents ?? 0)}
            sub={`${count(stock.data?.metrics?.total_batch_count ?? 0)} batches`}
          />
          <KpiCard
            icon="warning"
            label="Low stock"
            value={count(stock.data?.metrics?.low_stock_sku_count ?? 0)}
            sub="Products at or below their reorder level"
            tone={(stock.data?.metrics?.low_stock_sku_count ?? 0) > 0 ? "warn" : "default"}
          />
        </div>
      )}

      <AdminSection title="Recent sales" subtitle="The store's five most recent completed sales">
        {recent.isError ? (
          <AdminError error={recent.error} onRetry={() => void recent.refetch()} />
        ) : recent.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-[var(--app-surface-muted)]" />
            ))}
          </div>
        ) : (
          <AdminTable
            rows={recent.data ?? []}
            getKey={(sale) => sale.id}
            empty="No sales yet."
            minWidth={520}
            columns={[
              {
                key: "sale",
                header: "Sale",
                cell: (sale) => (
                  <span className="font-mono text-[11px] text-[var(--app-text-muted)]">
                    {sale.sale_number ?? sale.id.slice(0, 8)}
                  </span>
                ),
              },
              {
                key: "when",
                header: "When",
                cell: (sale) => (
                  <span className="text-[var(--app-text-muted)]">{dateTime(sale.created_at)}</span>
                ),
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                cell: (sale) => (
                  <span className="tabular-nums font-semibold">{money(sale.total_cents)}</span>
                ),
              },
            ]}
          />
        )}
      </AdminSection>
    </div>
  );
}
