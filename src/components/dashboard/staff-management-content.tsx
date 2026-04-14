"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { useStaffDirectoryQuery } from "@/lib/queries/staff";
import { ROUTES } from "@/lib/routes";

type LicenseStatus = "verified" | "expiring_soon" | "pending";

const ROLE_STYLES: Record<string, string> = {
  pharmacist: "bg-[#f0fdfa] text-[#0f766e]",
  cashier: "bg-[#eef2ff] text-[#4338ca]",
  analyst: "bg-[#f1f5f9] text-[#334155]",
  manager: "bg-[#fef3c7] text-[#b45309]",
  admin: "bg-[#ede9fe] text-[#5b21b6]",
  owner: "bg-[#fce7f3] text-[#9d174d]",
};

const LICENSE_STYLES: Record<LicenseStatus, { bg: string; text: string; icon: string }> = {
  verified: { bg: "", text: "text-[#059669]", icon: "check_circle" },
  expiring_soon: { bg: "", text: "text-[#9a461c]", icon: "warning" },
  pending: { bg: "", text: "text-[#94a3b8]", icon: "more_horiz" },
};

function membershipStatusToLicense(status: string): LicenseStatus {
  if (status === "active") {
    return "verified";
  }
  if (status === "invited") {
    return "pending";
  }
  return "expiring_soon";
}

function formatAppRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StaffManagementContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openActionsMenuId, setOpenActionsMenuId] = useState<string | null>(null);
  const urlQ = searchParams.get("q")?.trim() ?? "";
  const firstMatchRef = useRef<HTMLTableRowElement>(null);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));

  function replaceParams(next: URLSearchParams) {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const staffQuery = useStaffDirectoryQuery({ q: urlQ, page, pageSize });
  const members = useMemo(() => staffQuery.data?.members ?? [], [staffQuery.data]);
  const pagination = staffQuery.data?.pagination ?? {
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };
  const summary = staffQuery.data?.summary ?? {
    total: 0,
    active: 0,
    invited: 0,
    other: 0,
  };

  const total = summary.total;
  const active = summary.active;
  const invited = summary.invited;
  const other = summary.other;

  useEffect(() => {
    if (urlQ && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [urlQ, members.length]);

  return (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#191c1e]">
              Staff Management
            </h1>
            <p className="text-sm text-[#64748b]">
              Monitor, verify, and coordinate your clinical workforce across the network.
            </p>
          </div>
          <Link
            href={ROUTES.dashboard.staffAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(20,184,166,0.2),0px_4px_6px_-4px_rgba(20,184,166,0.2)] transition hover:opacity-95"
            style={{
              background: "linear-gradient(137deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
            }}
          >
            <span className="material-symbols-outlined notranslate text-lg">add</span>
            Add New Staff
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#f0fdfa]">
                <span className="material-symbols-outlined notranslate text-lg text-[#0d9488]">groups</span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">
              {staffQuery.isPending ? "—" : total}
            </p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Team members</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#eef2ff]">
                <span className="material-symbols-outlined notranslate text-lg text-[#4f46e5]">check_circle</span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">
              {staffQuery.isPending ? "—" : active}
            </p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Active memberships</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#ecfdf5]">
                <span className="material-symbols-outlined notranslate text-lg text-[#059669]">mail</span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">
              {staffQuery.isPending ? "—" : invited}
            </p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Invited (pending join)</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#f1f5f9]">
                <span className="material-symbols-outlined notranslate text-lg text-[#64748b]">pause_circle</span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">
              {staffQuery.isPending ? "—" : other}
            </p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Suspended / other</p>
          </article>
        </div>

        {/* Main layout: table + sidebar */}
        <div className="grid min-w-0 gap-8 lg:grid-cols-3">
          {/* Staff Directory table - 2 cols */}
          <div className="min-w-0 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between border-b border-[#f8fafc] px-6 py-5">
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                  Staff Directory
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                    aria-label="Filter"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">filter_list</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                    aria-label="Download"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">download</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="bg-[#f2f4f6]">
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Staff ID
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        License
                      </th>
                      <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffQuery.isPending ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#64748b]">
                          Loading directory…
                        </td>
                      </tr>
                    ) : staffQuery.isError ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-red-600">
                          Could not load staff. Try refreshing the page.
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-[#64748b]">
                          No team members yet. Use{" "}
                          <Link href={ROUTES.dashboard.staffAdd} className="font-semibold text-[#0d9488] underline">
                            Add New Staff
                          </Link>{" "}
                          once they have an AuraPharma account.
                        </td>
                      </tr>
                    ) : (
                      members.map((member, rowIndex) => {
                        const licenseStatus = membershipStatusToLicense(member.membershipStatus);
                        const licenseStyle = LICENSE_STYLES[licenseStatus];
                        const roleClass = ROLE_STYLES[member.role] ?? "bg-[#f1f5f9] text-[#334155]";
                        return (
                          <tr
                            key={member.membershipId}
                            ref={urlQ && rowIndex === 0 ? firstMatchRef : undefined}
                            className="border-t border-[#f8fafc] transition hover:bg-[#fafafa]"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <AuraAvatar
                                  name={member.fullName}
                                  decorative
                                  className="size-9 shrink-0 rounded-full ring-2 ring-white text-xs"
                                />
                                <div>
                                  <p className="text-sm font-semibold leading-5 text-[#191c1e]">
                                    {member.fullName}
                                  </p>
                                  <p className="truncate text-xs text-[#94a3b8]">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-[#475569]">
                              {member.staffEmployeeCode ?? "—"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${roleClass}`}
                              >
                                {formatAppRole(member.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`material-symbols-outlined notranslate text-sm ${licenseStyle.text}`}
                                >
                                  {licenseStyle.icon}
                                </span>
                                <span className={`text-xs font-semibold ${licenseStyle.text}`}>
                                  {licenseStatus === "verified"
                                    ? "Active"
                                    : licenseStatus === "expiring_soon"
                                      ? "Suspended"
                                      : "Invited"}
                                </span>
                              </div>
                            </td>
                            <td className="relative px-6 py-4 text-right">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                                aria-label="Actions"
                                aria-expanded={openActionsMenuId === member.membershipId}
                                onClick={() =>
                                  setOpenActionsMenuId((id) =>
                                    id === member.membershipId ? null : member.membershipId,
                                  )
                                }
                              >
                                <span className="material-symbols-outlined notranslate text-base">
                                  more_vert
                                </span>
                              </button>
                              {openActionsMenuId === member.membershipId ? (
                                <>
                                  <button
                                    type="button"
                                    className="fixed inset-0 z-10 cursor-default bg-transparent"
                                    aria-label="Close menu"
                                    onClick={() => setOpenActionsMenuId(null)}
                                  />
                                  <div className="absolute right-4 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg">
                                    <Link
                                      href={ROUTES.dashboard.staffEdit(member.membershipId)}
                                      className="block px-4 py-2.5 text-left text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                                      onClick={() => setOpenActionsMenuId(null)}
                                    >
                                      Edit member
                                    </Link>
                                  </div>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[#f8fafc] px-6 py-4">
                <p className="text-xs font-medium text-[#64748b]">
                  {staffQuery.isPending
                    ? "Loading…"
                    : `Showing page ${pagination.page.toLocaleString()} of ${pagination.totalPages.toLocaleString()} • ${pagination.totalItems.toLocaleString()} total`}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748b]">
                Rows
                <select
                  value={pageSize}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("pageSize", String(Number.isFinite(next) ? next : 10));
                    params.set("page", "1");
                    replaceParams(params);
                  }}
                  className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-xs font-semibold text-[#0f172a]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || staffQuery.isFetching}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(Math.max(1, pagination.page - 1)));
                    replaceParams(params);
                  }}
                  className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined notranslate text-lg">chevron_left</span>
                </button>
                <span className="inline-flex min-w-14 items-center justify-center gap-1 rounded border border-[#006a65] bg-white px-3 py-1 text-xs font-semibold text-[#006a65]">
                  {staffQuery.isFetching ? (
                    <span className="material-symbols-outlined notranslate animate-spin text-sm">
                      progress_activity
                    </span>
                  ) : null}
                  {pagination.page}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || staffQuery.isFetching}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                    replaceParams(params);
                  }}
                  className="flex size-8 items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined notranslate text-lg">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                Scheduling & coverage
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
                Shift coverage, heatmaps, and license tasks will appear here when scheduling and
                compliance workflows are connected to live data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
