"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminError, AdminSection, AdminTable } from "@/components/admin/admin-primitives";
import { count, date, humanize, money, statusClass } from "@/components/admin/format";
import { useAdminOrganizationsQuery } from "@/lib/queries/admin";
import { ROUTES } from "@/lib/routes";

const STATUSES = ["", "active", "trial", "suspended", "archived"];
const PLANS = ["", "free", "basic", "pro", "enterprise"];
const SORTS: Array<{ value: string; label: string }> = [
  { value: "created_desc", label: "Newest" },
  { value: "created_asc", label: "Oldest" },
  { value: "name", label: "Name" },
  { value: "gmv", label: "Sales volume" },
  { value: "users", label: "Team size" },
];

export function AdminCompaniesContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Filter and page state lives in the URL, matching the tenant tables. It makes
  // a filtered view linkable — which is most of the point of a support console.
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const sort = searchParams.get("sort") ?? "created_desc";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20),
  );

  const companies = useAdminOrganizationsQuery({ q, status, plan, sort, page, pageSize });

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Any filter change invalidates the current page number — otherwise a search
    // that returns three results while you sit on page 4 renders an empty table.
    if (key !== "page") {
      next.delete("page");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const pagination = companies.data?.pagination ?? {
    page,
    page_size: pageSize,
    total_items: 0,
    total_pages: 1,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
          Companies
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          Every store on AuraStores. Open one to edit it, change its plan, or suspend it.
        </p>
      </header>

      <AdminSection
        title={`${count(pagination.total_items)} companies`}
        subtitle="Search by name, slug or email"
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search companies…"
            className="rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-[var(--app-input-focus-bg)]"
          />
          <Select
            value={status}
            onChange={(v) => setParam("status", v)}
            options={STATUSES.map((s) => ({ value: s, label: s ? humanize(s) : "Any status" }))}
          />
          <Select
            value={plan}
            onChange={(v) => setParam("plan", v)}
            options={PLANS.map((p) => ({ value: p, label: p ? humanize(p) : "Any plan" }))}
          />
          <Select value={sort} onChange={(v) => setParam("sort", v)} options={SORTS} />
        </div>

        {companies.isError ? (
          <AdminError error={companies.error} onRetry={() => void companies.refetch()} />
        ) : companies.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--app-surface-muted)]" />
            ))}
          </div>
        ) : (
          <>
            <AdminTable
              rows={companies.data.items}
              getKey={(org) => org.id}
              empty="No companies match those filters."
              minWidth={900}
              // The whole card is the tap target on a phone — hunting for a link in
              // a dense row with a thumb is not the same job as clicking one.
              renderCard={(org) => (
                <Link href={ROUTES.admin.company(org.id)} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--app-text)]">
                        {org.display_name}
                      </p>
                      <p className="truncate text-[11px] text-[var(--app-text-faint)]">
                        {org.primary_email}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="material-symbols-outlined notranslate shrink-0 text-lg text-[var(--app-text-faint)]"
                    >
                      chevron_right
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(org.status)}`}
                    >
                      {humanize(org.status)}
                    </span>
                    <span className="rounded-full bg-[var(--app-surface-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-text-muted)]">
                      {humanize(org.plan_code)}
                    </span>
                    {org.deletion_scheduled_at ? (
                      <span className="rounded-full bg-[#fdf3f3] px-2 py-0.5 text-[10px] font-bold text-[#7d2a2a]">
                        Deleting
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--app-border-ui)] pt-3 text-center">
                    <CardStat label="Team" value={count(org.users)} />
                    <CardStat label="Branches" value={count(org.branches)} />
                    <CardStat label="GMV 30d" value={money(org.gmv_cents_30d)} />
                  </div>
                </Link>
              )}
              columns={[
                {
                  key: "company",
                  header: "Company",
                  cell: (org) => (
                    <>
                      <Link
                        href={ROUTES.admin.company(org.id)}
                        className="font-semibold text-[var(--app-text)] hover:text-[var(--app-link-teal)]"
                      >
                        {org.display_name}
                      </Link>
                      <p className="text-[11px] text-[var(--app-text-faint)]">{org.primary_email}</p>
                    </>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (org) => (
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(org.status)}`}
                      >
                        {humanize(org.status)}
                      </span>
                      {org.deletion_scheduled_at ? (
                        <span className="rounded-full bg-[#fdf3f3] px-2 py-0.5 text-[10px] font-bold text-[#7d2a2a]">
                          Deleting
                        </span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: "plan",
                  header: "Plan",
                  cell: (org) => (
                    <>
                      <span className="text-[var(--app-text)]">{humanize(org.plan_code)}</span>
                      <p className="text-[11px] text-[var(--app-text-faint)]">
                        {humanize(org.subscription_status)}
                      </p>
                    </>
                  ),
                },
                {
                  key: "team",
                  header: "Team",
                  align: "right",
                  cell: (org) => (
                    <span className="tabular-nums text-[var(--app-text-muted)]">
                      {count(org.users)}
                    </span>
                  ),
                },
                {
                  key: "branches",
                  header: "Branches",
                  align: "right",
                  cell: (org) => (
                    <span className="tabular-nums text-[var(--app-text-muted)]">
                      {count(org.branches)}
                    </span>
                  ),
                },
                {
                  key: "gmv",
                  header: "GMV (30d)",
                  align: "right",
                  cell: (org) => (
                    <span className="tabular-nums font-semibold">{money(org.gmv_cents_30d)}</span>
                  ),
                },
                {
                  key: "joined",
                  header: "Joined",
                  align: "right",
                  cell: (org) => (
                    <span className="text-[var(--app-text-muted)]">{date(org.created_at)}</span>
                  ),
                },
              ]}
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-[var(--app-text-muted)]">
                Page {pagination.page} of {pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setParam("page", String(pagination.page - 1))}
                  className="rounded-lg border border-[var(--app-border-ui)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setParam("page", String(pagination.page + 1))}
                  className="rounded-lg border border-[var(--app-border-ui)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </AdminSection>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A compact stat for the mobile company card. */
function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--app-text-faint)]">
        {label}
      </p>
      <p className="truncate text-xs font-bold tabular-nums text-[var(--app-text)]">{value}</p>
    </div>
  );
}
