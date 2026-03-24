"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  getStaffAddDraft,
  type StaffAddDraft,
  setStaffAddDraft,
} from "@/lib/staff-add-draft";
import { ROUTES } from "@/lib/routes";

const STEPS = [
  {
    id: "01",
    title: "Basic Info",
    desc: "Name, role, and internal identification.",
    active: true,
    variant: "filled" as const,
  },
  {
    id: "02",
    title: "Role Assignment",
    desc: "System permissions and level.",
    active: true,
    variant: "outline" as const,
  },
  {
    id: "03",
    title: "Contact Details",
    desc: "Verified communication channels.",
    active: false,
    variant: "inactive" as const,
  },
  {
    id: "04",
    title: "Credentials",
    desc: "Licenses and legal certifications.",
    active: false,
    variant: "inactive" as const,
  },
] as const;

const ROLE_OPTIONS = ["Pharmacist", "Technician", "Intern"] as const;

const ACCESS_LEVELS = [
  { id: "inventory", label: "Inventory Access", checked: true },
  { id: "financial", label: "Financial Reports", checked: false },
  { id: "patient", label: "Patient Records", checked: true },
  { id: "settings", label: "System Settings", checked: false },
] as const;

type UploadedFile = {
  id: string;
  name: string;
  subtitle: string;
  icon: "description" | "badge";
};

export function AddNewStaffContent() {
  const router = useRouter();
  const { withLoading, notify } = useAuraFeedback();
  const [fullName, setFullName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [professionalRole, setProfessionalRole] = useState<(typeof ROLE_OPTIONS)[number]>("Pharmacist");
  const [accessLevels, setAccessLevels] = useState<Record<string, boolean>>({
    inventory: true,
    financial: false,
    patient: true,
    settings: false,
  });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([
    { id: "1", name: "Medical_License_2024.pdf", subtitle: "Pharmacist Board Certification • 2.4 MB", icon: "description" },
    { id: "2", name: "ID_Verification_State.jpg", subtitle: "State Issued Identification • 1.1 MB", icon: "badge" },
  ]);

  useEffect(() => {
    const stored = getStaffAddDraft();
    if (stored) {
      setFullName(stored.fullName);
      setStaffId(stored.staffId);
      setDepartment(stored.department);
      setProfessionalRole(
        stored.professionalRole as (typeof ROLE_OPTIONS)[number],
      );
      setAccessLevels(stored.accessLevels);
      setEmail(stored.email);
      setPhone(stored.phone);
      setFiles(stored.files);
    }
  }, []);

  const toggleAccess = useCallback((id: string) => {
    setAccessLevels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDiscard = () => {
    router.push(ROUTES.dashboard.staff);
  };

  const handleSaveAndReview = () => {
    if (!fullName.trim()) {
      notify({
        variant: "error",
        title: "Required field missing",
        description: "Please enter the full name.",
      });
      return;
    }

    const draft: StaffAddDraft = {
      fullName,
      staffId,
      department,
      professionalRole,
      accessLevels,
      email,
      phone,
      files: [...files],
    };
    setStaffAddDraft(draft);
    router.push(ROUTES.dashboard.staffAddReview);
  };

  const primaryButton = (
    <button
      type="button"
      onClick={handleSaveAndReview}
      className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95"
      style={{
        background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
      }}
    >
      <span className="material-symbols-outlined notranslate text-lg">save</span>
      Save & Review
    </button>
  );

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
              <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
              Back to Staff Directory
            </Link>
            <h1 className="font-[family-name:var(--font-manrope)] text-[36px] font-extrabold leading-10 tracking-[-0.9px] text-[#191c1e]">
              Add New Staff Member
            </h1>
            <p className="text-base text-[#3c4948]">
              Onboard a new professional to the AuraPharma clinical network.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-xl bg-[#e6e8ea] px-6 py-3 text-base font-semibold text-[#3c4948] transition hover:bg-[#d1d5db]"
            >
              Discard
            </button>
            {primaryButton}
          </div>
        </div>

        {/* Form layout: sidebar + main */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Progress sidebar - 3 cols */}
          <aside className="flex flex-col gap-6 lg:col-span-3">
            <div className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-[#f2f4f6] p-6">
              <div className="space-y-6">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={step.variant === "inactive" ? "opacity-50" : ""}
                  >
                    <div className="flex gap-4">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          step.variant === "filled"
                            ? "text-white"
                            : step.variant === "outline"
                              ? "border-2 border-[#006a65] bg-white text-[#006a65]"
                              : "bg-[#e0e3e5] text-[#3c4948]"
                        }`}
                        style={
                          step.variant === "filled"
                            ? {
                                background:
                                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
                              }
                            : undefined
                        }
                      >
                        {step.id}
                      </div>
                      <div>
                        <p
                          className={`text-base font-bold ${
                            step.active ? "text-[#006a65]" : "text-[#191c1e]"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-[#3c4948]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                  shield
                </span>
                <p className="text-sm font-semibold text-[#006a65]">Security Notice</p>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#00504c] opacity-80">
                Adding a staff member will trigger an automated background verification
                check. Please ensure all ID numbers match official records.
              </p>
            </div>
          </aside>

          {/* Main form - 9 cols */}
          <div className="flex flex-col gap-8 lg:col-span-9">
            {/* Basic Information — Full Name, Staff ID, Department only */}
            <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  person_add
                </span>
                Basic Information
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    className="w-full rounded-lg border-0 bg-[#f2f4f6] px-4 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Staff ID Number
                  </label>
                  <input
                    type="text"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="PH-XXXXX-2024"
                    className="w-full rounded-lg border-0 bg-[#f2f4f6] px-4 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Inpatient Care / Retail"
                    className="w-full rounded-lg border-0 bg-[#f2f4f6] px-4 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                  />
                </div>
              </div>
            </section>

            {/* Role & Permission Assignment — NEW section */}
            <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  shield
                </span>
                Role & Permission Assignment
              </h2>
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Professional Role
                  </label>
                  <select
                    value={professionalRole}
                    onChange={(e) =>
                      setProfessionalRole(e.target.value as (typeof ROLE_OPTIONS)[number])
                    }
                    className="w-full appearance-none rounded-lg border-0 bg-[#f2f4f6] px-4 py-3 text-base text-[#191c1e] outline-none focus:ring-2 focus:ring-[#006a65]/20 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] [background-position:right_0.75rem_center] [background-repeat:no-repeat] [background-size:1.25rem] pr-12"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    System Access Level
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCESS_LEVELS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleAccess(item.id)}
                        className={`flex items-center gap-3 rounded-lg p-3 text-left transition ${
                          accessLevels[item.id]
                            ? "bg-[#f2f4f6] ring-1 ring-[#006a65]/30"
                            : "bg-[#f2f4f6] hover:bg-[#e2e8f0]"
                        }`}
                      >
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded ${
                            accessLevels[item.id] ? "bg-[#006a65] text-white" : "bg-white/50"
                          }`}
                        >
                          {accessLevels[item.id] && (
                            <span className="material-symbols-outlined notranslate text-sm">
                              check
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[#191c1e] leading-5">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Contact Details */}
            <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  contact_page
                </span>
                Contact Details
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#64748b]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="s.jenkins@aurapharma.com"
                      className="w-full rounded-lg border-0 bg-[#f2f4f6] py-3.5 pl-11 pr-4 text-base text-[#191c1e] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#64748b]">
                      phone
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-lg border-0 bg-[#f2f4f6] py-3.5 pl-11 pr-4 text-base text-[#191c1e] placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-[#006a65]/20"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Credential Upload */}
            <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  fact_check
                </span>
                Credential Upload
              </h2>
              <div className="rounded-xl border-2 border-dashed border-[rgba(187,201,199,0.3)] bg-[rgba(242,244,246,0.5)] p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-3xl text-[#006a65]">
                      cloud_upload
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-[#191c1e]">
                    Drop professional licenses here
                  </p>
                  <p className="mt-2 text-sm text-[#3c4948]">
                    or{" "}
                    <button
                      type="button"
                      className="font-medium text-[#006a65] underline underline-offset-2 hover:text-[#00504c]"
                    >
                      browse your files
                    </button>
                  </p>
                  <p className="mt-4 text-xs text-[#3c4948] opacity-60">
                    Accepted formats: PDF, PNG, JPG (Max 10MB per file)
                  </p>
                </div>
              </div>
              <div className="relative mt-6 space-y-4 pl-6">
                <div
                  className="absolute left-[23px] top-6 bottom-6 w-0.5 opacity-20"
                  style={{
                    background:
                      "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
                  }}
                />
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-lg bg-[#f2f4f6] p-4"
                  >
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-[#f7f9fb] bg-white shadow-sm">
                      <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                        {file.icon}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#191c1e]">{file.name}</p>
                      <p className="text-xs text-[#3c4948]">{file.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="rounded-lg p-2 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#475569]"
                      aria-label={`Remove ${file.name}`}
                    >
                      <span className="material-symbols-outlined notranslate text-lg">
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Final Actions bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-[#006a65]" />
                <p className="text-sm font-medium text-[#00504c]">
                  Ready for submission. All required fields have been validated.
                </p>
              </div>
              {primaryButton}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
