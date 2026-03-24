"use client";

import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { DASHBOARD_ASSETS } from "./dashboard-assets";

type Role = "pharmacist" | "technician" | "intern";
type LicenseStatus = "verified" | "expiring_soon" | "pending";

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  staffId: string;
  role: Role;
  branch: string;
  licenseStatus: LicenseStatus;
  avatar: string;
};

const MOCK_STAFF: StaffMember[] = [
  {
    id: "1",
    firstName: "Sarah",
    lastName: "Khensur",
    staffId: "RX-9021",
    role: "pharmacist",
    branch: "Main Branch",
    licenseStatus: "verified",
    avatar: DASHBOARD_ASSETS.staffAvatar1,
  },
  {
    id: "2",
    firstName: "Marcus",
    lastName: "Bell",
    staffId: "TX-4412",
    role: "technician",
    branch: "East Side",
    licenseStatus: "expiring_soon",
    avatar: DASHBOARD_ASSETS.staffAvatar2,
  },
  {
    id: "3",
    firstName: "Jenny",
    lastName: "Lee",
    staffId: "IN-2109",
    role: "intern",
    branch: "Main Branch",
    licenseStatus: "pending",
    avatar: DASHBOARD_ASSETS.staffAvatar3,
  },
  {
    id: "4",
    firstName: "David",
    lastName: "Rivera",
    staffId: "RX-1156",
    role: "pharmacist",
    branch: "North Branch",
    licenseStatus: "verified",
    avatar: DASHBOARD_ASSETS.staffAvatar4,
  },
];

const ROLE_STYLES: Record<Role, string> = {
  pharmacist: "bg-[#f0fdfa] text-[#0f766e]",
  technician: "bg-[#eef2ff] text-[#4338ca]",
  intern: "bg-[#f1f5f9] text-[#334155]",
};

const LICENSE_STYLES: Record<LicenseStatus, { bg: string; text: string; icon: string }> = {
  verified: { bg: "", text: "text-[#059669]", icon: "check_circle" },
  expiring_soon: { bg: "", text: "text-[#9a461c]", icon: "warning" },
  pending: { bg: "", text: "text-[#94a3b8]", icon: "more_horiz" },
};

const COVERAGE_ITEMS = [
  { branch: "Main Branch", status: "Optimal", statusColor: "text-[#059669]", barWidth: "92%", barColor: "bg-[#10b981]" },
  { branch: "East Side", status: "Peak Demand", statusColor: "text-[#9a461c]", barWidth: "100%", barColor: "bg-[#f28a5b]" },
  { branch: "North Branch", status: "Well Staffed", statusColor: "text-[#4f46e5]", barWidth: "78%", barColor: "bg-[#6366f1]" },
];

const PENDING_TASKS = [
  { title: "License Verification", subtitle: "Dr. Helena Troy • Pharmacist", icon: "shield", iconBg: "bg-[#ffdad6]", iconColor: "text-[#ba1a1a]" },
  { title: "Onboarding Docs", subtitle: "James Wilson • Intern", icon: "description", iconBg: "bg-[#6ff7ee]", iconColor: "text-[#0d9488]" },
];

export function StaffManagementContent() {
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
                <span className="material-symbols-outlined notranslate text-lg text-[#0d9488]">medication</span>
              </div>
              <span className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-[0.6px] text-[#0d9488] bg-[#f0fdfa]">
                Active
              </span>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">42</p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Total Pharmacists</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#eef2ff]">
                <span className="material-symbols-outlined notranslate text-lg text-[#4f46e5]">science</span>
              </div>
              <span className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-[0.6px] text-[#4f46e5] bg-[#eef2ff]">
                On-Duty
              </span>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">118</p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Active Technicians</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#ecfdf5]">
                <span className="material-symbols-outlined notranslate text-lg text-[#059669]">monitoring</span>
              </div>
              <span className="flex items-center gap-1 rounded text-xs font-semibold text-[#059669]">
                <span className="material-symbols-outlined notranslate text-sm">trending_up</span>
                4%
              </span>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">88%</p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Staffing Efficiency</p>
          </article>
          <article className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#ffdad6]">
                <span className="material-symbols-outlined notranslate text-lg text-[#ba1a1a]">shield</span>
              </div>
              <span className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-[0.6px] text-[#ba1a1a] bg-[#ffdad6]">
                Urgent
              </span>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[#191c1e]">07</p>
            <p className="mt-2 text-sm font-medium text-[#64748b]">Pending Verifications</p>
          </article>
        </div>

        {/* Main layout: table + sidebar */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Staff Directory table - 2 cols */}
          <div className="lg:col-span-2">
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f2f4f6]">
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
                        Branch
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
                    {MOCK_STAFF.map((member) => {
                      const licenseStyle = LICENSE_STYLES[member.licenseStatus];
                      return (
                        <tr
                          key={member.id}
                          className="border-t border-[#f8fafc] transition hover:bg-[#fafafa]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative size-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white">
                                <Image
                                  src={member.avatar}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#191c1e] leading-5">
                                  {member.firstName} {member.lastName}
                                </p>
                                <p className="text-xs text-[#94a3b8]">ID: #{member.staffId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${ROLE_STYLES[member.role]}`}
                            >
                              {member.role === "pharmacist"
                                ? "Pharmacist"
                                : member.role === "technician"
                                  ? "Technician"
                                  : "Intern"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-[#191c1e]">
                            {member.branch}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`material-symbols-outlined notranslate text-sm ${licenseStyle.text}`}>
                                {licenseStyle.icon}
                              </span>
                              <span className={`text-xs font-semibold ${licenseStyle.text}`}>
                                {member.licenseStatus === "verified"
                                  ? "Verified"
                                  : member.licenseStatus === "expiring_soon"
                                    ? "Expiring Soon"
                                    : "Pending"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-[#64748b] hover:bg-[#f1f5f9]"
                              aria-label="Actions"
                            >
                              <span className="material-symbols-outlined notranslate text-base">
                                more_vert
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[#f8fafc] px-6 py-4">
                <p className="text-xs font-medium text-[#64748b]">
                  Showing 1-4 of 160 staff members
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    className="text-xs font-medium text-[#64748b] hover:text-[#191c1e]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-[#64748b] hover:text-[#191c1e]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar - Coverage Heatmap + Pending Tasks */}
          <div className="flex flex-col gap-6">
            {/* Coverage Heatmap */}
            <div className="relative overflow-hidden rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <div
                className="absolute -right-24 -top-24 size-48 rounded-full opacity-10 blur-[32px]"
                style={{
                  background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              />
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                Coverage Heatmap
              </h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.6px] text-[#94a3b8]">
                Weekly Performance
              </p>
              <div className="relative mt-5 space-y-4 pb-7">
                {COVERAGE_ITEMS.map((item) => (
                  <div key={item.branch} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#191c1e]">{item.branch}</span>
                      <span className={`text-xs font-semibold ${item.statusColor}`}>{item.status}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f1f5f9]">
                      <div
                        className={`h-full rounded-full ${item.barColor}`}
                        style={{ width: item.barWidth }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-[#f2f4f6] p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-sm text-[#0d9488]">
                    auto_awesome
                  </span>
                  <span className="text-xs font-semibold text-[#191c1e]">Aura Insight</span>
                </div>
                <p className="mt-2 text-[11px] leading-[18px] text-[#64748b]">
                  Branch coverage is 12% lower on Tuesdays. Recommend re-allocating 2 technicians
                  from Main to East Side for the morning shift.
                </p>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                Pending Tasks
              </h3>
              <div className="mt-4 space-y-4">
                {PENDING_TASKS.map((task) => (
                  <div
                    key={task.title}
                    className="flex items-start gap-3 rounded-lg p-3 transition hover:bg-[#f8fafc]"
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${task.iconBg}`}
                    >
                      <span className={`material-symbols-outlined notranslate text-sm ${task.iconColor}`}>
                        {task.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#191c1e]">{task.title}</p>
                      <p className="mt-0.5 text-xs text-[#94a3b8]">{task.subtitle}</p>
                    </div>
                    <span className="material-symbols-outlined notranslate text-sm text-[#94a3b8]">
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 w-full py-2 text-xs font-semibold uppercase tracking-[1.2px] text-[#0d9488] hover:text-[#0f766e]"
              >
                View all tasks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
