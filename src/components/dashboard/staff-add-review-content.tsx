"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useAddStaffMemberMutation } from "@/lib/queries/staff";
import { useStockBranchesQuery } from "@/lib/queries/stock";
import {
  clearStaffAddDraft,
  getStaffAddDraft,
  type StaffAddDraft,
} from "@/lib/staff-add-draft";
import type { AddStaffByEmailPayload } from "@/lib/validation/staff";
import { ROUTES } from "@/lib/routes";

const ACCESS_LABELS: Record<string, string> = {
  inventory: "Inventory Access",
  financial: "Financial Reports",
  patient: "Patient Records",
  settings: "System Settings",
};

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]";
const valueClass = "text-base font-semibold text-[#334155]";

function mapProfessionalRole(role: string): AddStaffByEmailPayload["appRole"] {
  const r = role.toLowerCase();
  if (r.includes("pharmacist")) {
    return "pharmacist";
  }
  if (r.includes("technician")) {
    return "cashier";
  }
  if (r.includes("intern")) {
    return "analyst";
  }
  return "pharmacist";
}

function emptyDraft(): StaffAddDraft {
  return {
    fullName: "",
    staffId: "",
    department: "",
    professionalRole: "Pharmacist",
    accessLevels: {
      inventory: true,
      financial: false,
      patient: true,
      settings: false,
    },
    email: "",
    phone: "",
    files: [],
  };
}

export function StaffAddReviewContent() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const addStaffMutation = useAddStaffMemberMutation();
  const branchesQuery = useStockBranchesQuery(undefined, true);
  const primaryBranchId =
    branchesQuery.data?.branches.find((b) => b.isPrimary)?.id ??
    branchesQuery.data?.branches[0]?.id ??
    null;
  const [draft, setDraft] = useState<StaffAddDraft | null>(null);
  const [certified, setCertified] = useState(false);
  const isBusy = isLoading("dashboard-add-staff") || addStaffMutation.isPending;

  useEffect(() => {
    const stored = getStaffAddDraft();
    setDraft(stored ?? emptyDraft());
  }, []);

  const handleBackToEdit = () => {
    router.push(ROUTES.dashboard.staffAdd);
  };

  const handleSaveToDb = async () => {
    if (!draft?.fullName.trim()) {
      notify({
        variant: "error",
        title: "Missing data",
        description: "Please go back and complete the form.",
      });
      return;
    }
    if (!certified) {
      notify({
        variant: "error",
        title: "Certification required",
        description: "Please confirm that all information is accurate.",
      });
      return;
    }

    await withLoading("dashboard-add-staff", "Adding staff member...", async () => {
      try {
        await addStaffMutation.mutateAsync({
          email: draft.email.trim(),
          fullName: draft.fullName.trim(),
          phone: draft.phone.trim() ? draft.phone.trim() : null,
          jobTitle: draft.department.trim() ? draft.department.trim() : null,
          appRole: mapProfessionalRole(draft.professionalRole),
          branchId: primaryBranchId,
        });
        clearStaffAddDraft();
        notify({
          variant: "success",
          title: "Staff member added",
          description: `${draft.fullName} has been added to the staff directory.`,
        });
        router.push(ROUTES.dashboard.staff);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not add staff member.";
        notify({
          variant: "error",
          title: "Could not add staff",
          description: message,
        });
        throw err;
      }
    });
  };

  const accessGranted = draft
    ? Object.entries(draft.accessLevels)
        .filter(([, v]) => v)
        .map(([k]) => ACCESS_LABELS[k] ?? k)
        .join(", ") || "None"
    : "—";

  if (draft === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#64748b]">Loading review...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px]">
        {/* Page header */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Link
              href={ROUTES.dashboard.staff}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#006a65] hover:text-[#00504c]"
            >
              <span className="material-symbols-outlined notranslate text-lg">
                arrow_back
              </span>
              Back to Staff Directory
            </Link>
            <h1 className="font-[family-name:var(--font-manrope)] text-[36px] font-extrabold leading-10 tracking-[-0.9px] text-[#191c1e]">
              Review New Staff Member
            </h1>
            <p className="text-base text-[#3c4948]">
              Confirm the details below before adding this professional to the
              directory.
            </p>
          </div>
          <Link
            href={ROUTES.dashboard.staffAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[#e6e8ea] px-6 py-3 text-base font-semibold text-[#3c4948] transition hover:bg-[#d1d5db]"
          >
            <span className="material-symbols-outlined notranslate text-lg">
              edit
            </span>
            Edit Details
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Basic Information */}
          <div className="flex flex-col gap-6 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
                  <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                    person_add
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#1e293b]">
                  Basic Information
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.staffAdd}
                className="inline-flex items-center gap-2 rounded-lg bg-[rgba(0,106,101,0.05)] px-3 py-1.5 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
              >
                <span className="material-symbols-outlined notranslate text-sm">
                  edit
                </span>
                EDIT
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="space-y-1">
                <p className={labelClass}>Full Name</p>
                <p className={valueClass}>{draft.fullName || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className={labelClass}>Staff ID Number</p>
                <p className={valueClass}>{draft.staffId || "Not provided"}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className={labelClass}>Department</p>
                <p className={valueClass}>{draft.department || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="flex flex-col gap-6 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm lg:col-span-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
                  <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                    shield
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#1e293b]">
                  Role & Permissions
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.staffAdd}
                className="inline-flex items-center gap-2 rounded-lg bg-[rgba(0,106,101,0.05)] px-3 py-1.5 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
              >
                <span className="material-symbols-outlined notranslate text-sm">
                  edit
                </span>
                EDIT
              </Link>
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <p className={labelClass}>Professional Role</p>
                <p className={valueClass}>{draft.professionalRole}</p>
              </div>
              <div className="space-y-1">
                <p className={labelClass}>System Access Level</p>
                <p className="text-sm font-medium text-[#334155] leading-relaxed">
                  {accessGranted}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-6 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm lg:col-span-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
                  <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                    contact_page
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#1e293b]">
                  Contact Details
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.staffAdd}
                className="inline-flex items-center gap-2 rounded-lg bg-[rgba(0,106,101,0.05)] px-3 py-1.5 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
              >
                <span className="material-symbols-outlined notranslate text-sm">
                  edit
                </span>
                EDIT
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="space-y-1">
                <p className={labelClass}>Email Address</p>
                <p className={valueClass}>{draft.email || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className={labelClass}>Phone Number</p>
                <p className={valueClass}>{draft.phone || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="flex flex-col gap-6 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm lg:col-span-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
                  <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                    fact_check
                  </span>
                </div>
                <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#1e293b]">
                  Credentials
                </h2>
              </div>
              <Link
                href={ROUTES.dashboard.staffAdd}
                className="inline-flex items-center gap-2 rounded-lg bg-[rgba(0,106,101,0.05)] px-3 py-1.5 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
              >
                <span className="material-symbols-outlined notranslate text-sm">
                  edit
                </span>
                EDIT
              </Link>
            </div>
            {draft.files.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {draft.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#e2e8f0]">
                        <span className="material-symbols-outlined notranslate text-[#006a65]">
                          {file.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#334155]">
                          {file.name}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {file.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined notranslate shrink-0 text-[#006a65]">
                      check_circle
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#64748b]">No credentials uploaded</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className={`mt-10 flex flex-col gap-8 transition ${isBusy ? "opacity-75" : ""}`}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={certified}
              onChange={(e) => setCertified(e.target.checked)}
              disabled={isBusy}
              className="mt-1 size-4 shrink-0 rounded border-[#cbd5e1] text-[#006a65] accent-[#006a65]"
            />
            <span className="text-sm leading-relaxed text-[#64748b]">
              I certify that all provided information is accurate to the best of
              my knowledge.
            </span>
          </label>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBackToEdit}
              disabled={isBusy}
              className="px-8 py-4 text-center text-base font-semibold text-[#475569] transition hover:text-[#1e293b] disabled:opacity-60"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={!certified || isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background:
                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
              }}
            >
              <span className="material-symbols-outlined notranslate text-lg">
                save
              </span>
              {isBusy ? "Adding..." : "Save & Add Staff"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
