"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useAppMeQuery,
  useDeleteStaffCredentialMutation,
  useUpdateStaffMemberMutation,
  useUploadStaffCredentialsMutation,
  type StaffMemberCredentialDto,
  type StaffMemberDetailDto,
} from "@/lib/queries/staff";
import { useStockBranchesQuery } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";
import { defaultCapabilitiesForAppRole } from "@/lib/rbac/capabilities";
import {
  getStaffAddDraft,
  type StaffAddDraft,
  type StaffAddDraftAppRole,
  setStaffAddDraft,
} from "@/lib/staff-add-draft";
import type { AddStaffByEmailPayload, UpdateStaffMemberPayload } from "@/lib/validation/staff";

const STEP_DEFS = [
  { id: "01", title: "Basic Info", desc: "Name, branch, and staff identification." },
  { id: "02", title: "Role Assignment", desc: "System permissions and level." },
  { id: "03", title: "Contact Details", desc: "Verified communication channels." },
  { id: "04", title: "Credentials", desc: "Licenses and legal certifications." },
] as const;

type StepVariant = "filled" | "outline" | "inactive";

function stepPresentation(index: number, activeIndex: number): { variant: StepVariant; isCurrent: boolean } {
  if (index < activeIndex) return { variant: "filled", isCurrent: false };
  if (index === activeIndex) return { variant: "outline", isCurrent: true };
  return { variant: "inactive", isCurrent: false };
}

export type StaffFormAppRole = AddStaffByEmailPayload["appRole"];

const APP_ROLE_OPTIONS: { value: StaffFormAppRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "cashier", label: "Cashier" },
  { value: "analyst", label: "Analyst" },
];

const ACCESS_LEVEL_DEFS = [
  { id: "stock", label: "Stock & inventory" },
  { id: "sales", label: "Sales & checkout" },
  { id: "insights", label: "Insights & analytics" },
  { id: "catalog", label: "Product categories" },
  { id: "staff", label: "Staff & directory" },
  { id: "pay", label: "Payments" },
  { id: "organization", label: "Organization management" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Session drafts may still use legacy `settings` before `organization` was introduced. */
function migrateAccessLevelsRecord(raw: Record<string, boolean>): Record<string, boolean> {
  const next = { ...raw };
  if ("settings" in next && !("organization" in next)) {
    next.organization = Boolean(next.settings);
    delete next.settings;
  }
  return next;
}

function defaultAccessForRole(role: StaffFormAppRole): Record<string, boolean> {
  return { ...defaultCapabilitiesForAppRole(role) };
}

function filterBranchesForMe<T extends { id: string }>(
  branches: T[],
  allowedBranchIds: string[] | null | undefined,
): T[] {
  if (allowedBranchIds == null) {
    return branches;
  }
  const allowed = new Set(allowedBranchIds);
  return branches.filter((b) => allowed.has(b.id));
}

function credentialToDisplayFile(c: StaffMemberCredentialDto): UploadedFile {
  const lower = c.fileName.toLowerCase();
  const icon: UploadedFile["icon"] = lower.endsWith(".pdf") ? "description" : "badge";
  return {
    id: c.id,
    name: c.fileName,
    subtitle: `${c.mimeType} · ${new Date(c.createdAt).toLocaleString()}`,
    icon,
  };
}

type UploadedFile = {
  id: string;
  name: string;
  subtitle: string;
  icon: "description" | "badge";
};

export type StaffMemberFormProps =
  | { variant: "add" }
  | { variant: "edit"; membershipId: string; initialMember: StaffMemberDetailDto };

export function StaffMemberForm(props: StaffMemberFormProps) {
  const variant = props.variant;
  const membershipId = variant === "edit" ? props.membershipId : undefined;
  const initialMember = variant === "edit" ? props.initialMember : undefined;
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const branchesQuery = useStockBranchesQuery(undefined, true);
  const meQuery = useAppMeQuery();
  const updateMutation = useUpdateStaffMemberMutation();
  const uploadMutation = useUploadStaffCredentialsMutation();
  const deleteMutation = useDeleteStaffCredentialMutation();

  const [draftHydrated, setDraftHydrated] = useState(() => variant === "edit");
  const [fullName, setFullName] = useState(
    () => (variant === "edit" ? props.initialMember.fullName : ""),
  );
  const [branchIds, setBranchIds] = useState<string[]>(() =>
    variant === "edit" ? props.initialMember.branchIds : [],
  );
  const [appRole, setAppRole] = useState<StaffFormAppRole>(() =>
    variant === "edit" ? (props.initialMember.appRole as StaffFormAppRole) : "pharmacist",
  );
  const [accessLevels, setAccessLevels] = useState<Record<string, boolean>>(() =>
    variant === "edit"
      ? migrateAccessLevelsRecord({ ...(props.initialMember.capabilities as Record<string, boolean>) })
      : defaultAccessForRole("pharmacist"),
  );
  const [email, setEmail] = useState(() => (variant === "edit" ? props.initialMember.email : ""));
  const [phone, setPhone] = useState(() =>
    variant === "edit" ? props.initialMember.phone ?? "" : "",
  );
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const stepSectionRefs = useRef<(HTMLElement | null)[]>([]);
  const intersectionRatios = useRef<number[]>([0, 0, 0, 0]);
  const credentialFileInputRef = useRef<HTMLInputElement>(null);
  const addPhonePrefilledFromMe = useRef(false);

  const branchesList = useMemo(() => {
    const raw = branchesQuery.data?.branches ?? [];
    if (variant === "edit") {
      return filterBranchesForMe(raw, meQuery.data?.allowedBranchIds);
    }
    return raw;
  }, [variant, branchesQuery.data?.branches, meQuery.data?.allowedBranchIds]);

  const displayFiles = useMemo(() => {
    if (variant === "edit" && initialMember) {
      return initialMember.credentials.map(credentialToDisplayFile);
    }
    return files;
  }, [variant, initialMember, files]);

  const setStepSectionRef = useCallback((index: number) => (el: HTMLElement | null) => {
    stepSectionRefs.current[index] = el;
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const nodes = STEP_DEFS.map((_, i) => stepSectionRefs.current[i]).filter(
      (n): n is HTMLElement => n != null,
    );
    if (nodes.length !== STEP_DEFS.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = nodes.indexOf(entry.target as HTMLElement);
          if (idx >= 0) {
            intersectionRatios.current[idx] = entry.intersectionRatio;
          }
        }
        const ratios = intersectionRatios.current;
        let bestIdx = 0;
        let best = ratios[0] ?? 0;
        for (let i = 1; i < ratios.length; i++) {
          if ((ratios[i] ?? 0) > best) {
            best = ratios[i] ?? 0;
            bestIdx = i;
          }
        }
        if (best > 0) {
          setActiveStepIndex(bestIdx);
        }
      },
      {
        root: null,
        rootMargin: "-14% 0px -32% 0px",
        threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.65, 0.8, 1],
      },
    );

    intersectionRatios.current = [0, 0, 0, 0];
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
      intersectionRatios.current = [0, 0, 0, 0];
    };
  }, [draftHydrated]);

  const scrollToStep = useCallback((index: number) => {
    stepSectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const stepItems = useMemo(
    () =>
      STEP_DEFS.map((step, index) => ({
        ...step,
        ...stepPresentation(index, activeStepIndex),
      })),
    [activeStepIndex],
  );

  const isFormValid = useMemo(() => {
    if (!fullName.trim()) return false;
    if (branchIds.length === 0) return false;
    if (variant === "add") {
      const emailTrim = email.trim();
      if (!emailTrim || !EMAIL_RE.test(emailTrim)) return false;
    }
    const phoneTrim = phone.trim();
    if (!phoneTrim || phoneTrim.length > 32) return false;
    if (appRole === "pharmacist" && displayFiles.length === 0) return false;
    return true;
  }, [fullName, branchIds, variant, email, phone, appRole, displayFiles.length]);

  useEffect(() => {
    if (variant !== "add") return;
    const stored = getStaffAddDraft();
    queueMicrotask(() => {
      if (stored) {
        setFullName(stored.fullName);
        setBranchIds(stored.branchIds);
        setAppRole(stored.appRole as StaffFormAppRole);
        setAccessLevels(migrateAccessLevelsRecord(stored.accessLevels));
        setEmail(stored.email);
        setPhone(stored.phone);
        setFiles(stored.files);
      }
      setDraftHydrated(true);
    });
  }, [variant]);

  useEffect(() => {
    if (variant !== "add" || !draftHydrated || addPhonePrefilledFromMe.current) return;
    const stored = getStaffAddDraft();
    if (stored?.phone?.trim()) {
      addPhonePrefilledFromMe.current = true;
      return;
    }
    const mePhone = meQuery.data?.phone?.trim();
    if (!mePhone) return;
    setPhone((curr) => {
      if (curr.trim()) {
        addPhonePrefilledFromMe.current = true;
        return curr;
      }
      addPhonePrefilledFromMe.current = true;
      return mePhone;
    });
  }, [variant, draftHydrated, meQuery.data?.phone]);

  useEffect(() => {
    if (variant !== "edit") return;
    const m = props.initialMember;
    setFullName(m.fullName);
    setPhone(m.phone ?? "");
    setBranchIds(m.branchIds);
    setAppRole(m.appRole as StaffFormAppRole);
    setAccessLevels({ ...m.capabilities });
    setEmail(m.email);
  }, [variant, membershipId]);

  useEffect(() => {
    if (variant !== "add" || !draftHydrated) return;
    const list = branchesQuery.data?.branches ?? [];
    if (!list.length || branchIds.length > 0) return;
    const primary = list.find((b) => b.isPrimary) ?? list[0];
    if (primary) {
      queueMicrotask(() => {
        setBranchIds([primary.id]);
      });
    }
  }, [variant, draftHydrated, branchesQuery.data?.branches, branchIds.length]);

  const toggleAccess = useCallback((id: string) => {
    setAccessLevels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const removeFile = useCallback(
    async (id: string) => {
      if (variant === "edit" && membershipId) {
        await withLoading(`staff-cred-del-${id}`, "Removing…", async () => {
          try {
            await deleteMutation.mutateAsync({ membershipId, documentId: id });
            notify({ variant: "success", title: "Removed", description: "Credential was deleted." });
          } catch (e) {
            notify({
              variant: "error",
              title: "Delete failed",
              description: e instanceof Error ? e.message : "Could not delete.",
            });
            throw e;
          }
        });
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [variant, membershipId, deleteMutation, notify, withLoading],
  );

  const handleCredentialFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list?.length) return;
      if (variant === "edit" && membershipId) {
        const toUpload = Array.from(list);
        event.target.value = "";
        await withLoading("staff-cred-up", "Uploading…", async () => {
          try {
            await uploadMutation.mutateAsync({ membershipId, files: toUpload });
            notify({ variant: "success", title: "Uploaded", description: "Credential files were added." });
          } catch (e) {
            notify({
              variant: "error",
              title: "Upload failed",
              description: e instanceof Error ? e.message : "Upload failed.",
            });
            throw e;
          }
        });
        return;
      }
      const added: UploadedFile[] = [];
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        const lower = f.name.toLowerCase();
        const icon: UploadedFile["icon"] = lower.endsWith(".pdf") ? "description" : "badge";
        added.push({
          id: `${Date.now()}-${i}-${f.name}`,
          name: f.name,
          subtitle: `${f.type || "Document"} • ${(f.size / (1024 * 1024)).toFixed(1)} MB`,
          icon,
        });
      }
      setFiles((prev) => [...prev, ...added]);
      event.target.value = "";
    },
    [variant, membershipId, uploadMutation, notify, withLoading],
  );

  const handleDiscard = () => {
    router.push(ROUTES.dashboard.staff);
  };

  const toggleBranch = useCallback((id: string) => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }, []);

  const handleAppRoleChange = useCallback((next: StaffFormAppRole) => {
    setAppRole(next);
    setAccessLevels(defaultAccessForRole(next));
  }, []);

  const handleSaveAndReview = () => {
    if (!fullName.trim()) {
      notify({
        variant: "error",
        title: "Required field missing",
        description: "Please enter the full name.",
      });
      return;
    }
    if (branchIds.length === 0) {
      notify({
        variant: "error",
        title: "Branch required",
        description: "Select at least one branch.",
      });
      return;
    }
    const emailTrim = email.trim();
    if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
      notify({
        variant: "error",
        title: "Required field missing",
        description: "Please enter a valid email address.",
      });
      scrollToStep(2);
      return;
    }
    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      notify({
        variant: "error",
        title: "Required field missing",
        description: "Please enter a phone number.",
      });
      scrollToStep(2);
      return;
    }
    if (phoneTrim.length > 32) {
      notify({
        variant: "error",
        title: "Phone too long",
        description: "Use at most 32 characters for the phone number.",
      });
      scrollToStep(2);
      return;
    }
    if (appRole === "pharmacist" && files.length === 0) {
      notify({
        variant: "error",
        title: "Credentials required",
        description: "Pharmacists must upload at least one license or credential file before continuing.",
      });
      scrollToStep(3);
      return;
    }

    const draft: StaffAddDraft = {
      fullName,
      branchIds,
      appRole: appRole as StaffAddDraftAppRole,
      accessLevels,
      email: emailTrim,
      phone: phoneTrim,
      files: [...files],
    };
    setStaffAddDraft(draft);
    router.push(ROUTES.dashboard.staffAddReview);
  };

  const handleSaveEdit = async () => {
    if (variant !== "edit" || !membershipId) return;
    const payload: UpdateStaffMemberPayload = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      jobTitle: null,
      appRole,
      branchIds,
      capabilities: accessLevels,
    };
    await withLoading("staff-edit-save", "Saving changes...", async () => {
      try {
        await updateMutation.mutateAsync({ membershipId, payload });
        notify({ variant: "success", title: "Saved", description: "Staff profile was updated." });
        router.push(ROUTES.dashboard.staff);
      } catch (e) {
        notify({
          variant: "error",
          title: "Save failed",
          description: e instanceof Error ? e.message : "Could not save.",
        });
        throw e;
      }
    });
  };

  const credentialBusy =
    variant === "edit" &&
    (isLoading("staff-cred-up") || uploadMutation.isPending || deleteMutation.isPending);

  const primaryButton =
    variant === "add" ? (
      <button
        type="button"
        onClick={handleSaveAndReview}
        disabled={!isFormValid}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
        }}
      >
        <span className="material-symbols-outlined notranslate text-lg">save</span>
        Save & Review
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void handleSaveEdit()}
        disabled={!isFormValid || isLoading("staff-edit-save") || updateMutation.isPending || credentialBusy}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
        }}
      >
        <span className="material-symbols-outlined notranslate text-lg">save</span>
        Save changes
      </button>
    );

  const deleteCredentialDisabled =
    variant === "edit" && appRole === "pharmacist" && displayFiles.length <= 1;

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
              {variant === "add" ? "Add New Staff Member" : "Edit Staff Member"}
            </h1>
            <p className="text-base text-[#3c4948]">
              {variant === "add"
                ? "Onboard a new professional to the AuraPharma clinical network."
                : "Update profile, role, branches, and credentials. Email cannot be changed."}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-xl bg-[#e6e8ea] px-6 py-3 text-base font-semibold text-[#3c4948] transition hover:bg-[#d1d5db]"
            >
              {variant === "add" ? "Discard" : "Cancel"}
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
                {stepItems.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    aria-label={`Scroll to ${step.title}`}
                    onClick={() => scrollToStep(index)}
                    className={`w-full rounded-lg p-2 text-left transition hover:bg-black/[0.03] ${
                      step.variant === "inactive" ? "opacity-55" : ""
                    }`}
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
                        {step.variant === "filled" ? (
                          <span className="material-symbols-outlined notranslate text-base leading-none">
                            check
                          </span>
                        ) : (
                          step.id
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-base font-bold ${
                            step.isCurrent ? "text-[#006a65]" : "text-[#191c1e]"
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="mt-1 text-xs leading-4 text-[#3c4948]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </button>
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
                {variant === "add"
                  ? "Adding a staff member will trigger an automated background verification check. Please ensure all ID numbers match official records."
                  : "Changes to access and credentials take effect after you save. Removing files deletes them from secure storage."}
              </p>
            </div>
          </aside>

          {/* Main form - 9 cols */}
          <div className="flex flex-col gap-8 lg:col-span-9">
            {/* Basic Information */}
            <section
              ref={setStepSectionRef(0)}
              className="scroll-mt-8 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            >
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  person_add
                </span>
                Basic Information
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Full Name <span className="font-normal normal-case text-[#64748b]">(required)</span>
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
                  {variant === "add" ? (
                    <div className="rounded-lg border border-[rgba(0,106,101,0.12)] bg-[#f8fafc] px-4 py-3.5 text-base text-[#475569]">
                      Assigned automatically when you add this member (e.g. AP-00001).
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[rgba(0,106,101,0.12)] bg-[#f2f4f6] px-4 py-3.5 text-base font-medium text-[#191c1e]">
                      {initialMember?.staffEmployeeCode ?? "—"}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Branch
                  </label>
                  {branchesQuery.isPending ? (
                    <p className="text-sm text-[#64748b]">Loading branches…</p>
                  ) : branchesQuery.isError || !branchesList.length ? (
                    <p className="text-sm text-[#64748b]">No branches available. Add a branch before inviting staff.</p>
                  ) : (
                    <div className="grid gap-2 rounded-lg border border-[rgba(187,201,199,0.25)] bg-[#f2f4f6] p-4 sm:grid-cols-2">
                      {branchesList.map((b) => (
                        <label
                          key={b.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/80 px-3 py-2.5 shadow-sm"
                        >
                          <input
                            type="checkbox"
                            checked={branchIds.includes(b.id)}
                            onChange={() => toggleBranch(b.id)}
                            className="size-4 shrink-0 rounded border-[#cbd5e1] text-[#006a65] accent-[#006a65]"
                          />
                          <span className="text-sm font-medium text-[#191c1e]">
                            {b.name}
                            {b.isPrimary ? (
                              <span className="ml-2 text-xs font-normal text-[#64748b]">(Primary)</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Role & Permission Assignment */}
            <section
              ref={setStepSectionRef(1)}
              className="scroll-mt-8 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            >
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  shield
                </span>
                Role & Permission Assignment
              </h2>
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Role
                  </label>
                  <select
                    value={appRole}
                    onChange={(e) => handleAppRoleChange(e.target.value as StaffFormAppRole)}
                    disabled={credentialBusy}
                    className="w-full appearance-none rounded-lg border-0 bg-[#f2f4f6] px-4 py-3 text-base text-[#191c1e] outline-none focus:ring-2 focus:ring-[#006a65]/20 [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] [background-position:right_0.75rem_center] [background-repeat:no-repeat] [background-size:1.25rem] pr-12 disabled:opacity-50"
                  >
                    {APP_ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    System access (preset)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCESS_LEVEL_DEFS.map((item) => (
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
            <section
              ref={setStepSectionRef(2)}
              className="scroll-mt-8 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            >
              <h2 className="mb-6 flex items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  contact_page
                </span>
                Contact Details
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Email Address <span className="font-normal normal-case text-[#64748b]">(required)</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[#64748b]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      readOnly={variant === "edit"}
                      disabled={variant === "edit"}
                      placeholder="s.jenkins@aurapharma.com"
                      className={`w-full rounded-lg border-0 bg-[#f2f4f6] py-3.5 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-[#006a65]/20 ${
                        variant === "edit"
                          ? "cursor-not-allowed text-[#64748b] opacity-90"
                          : "text-[#191c1e] placeholder:text-[#6b7280]"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold uppercase tracking-[0.1em] text-[#3c4948]">
                    Phone Number <span className="font-normal normal-case text-[#64748b]">(required)</span>
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
            <section
              ref={setStepSectionRef(3)}
              className="scroll-mt-8 rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
            >
              <h2 className="mb-6 flex flex-wrap items-center gap-3 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  fact_check
                </span>
                Credential Upload
                {appRole === "pharmacist" ? (
                  <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#b45309]">
                    Required
                  </span>
                ) : null}
              </h2>
              <input
                ref={credentialFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                multiple
                className="sr-only"
                onChange={handleCredentialFiles}
              />
              <div className="rounded-xl border-2 border-dashed border-[rgba(187,201,199,0.3)] bg-[rgba(242,244,246,0.5)] p-10">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-3xl text-[#006a65]">
                      cloud_upload
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-[#191c1e]">
                    Upload professional licenses
                  </p>
                  <p className="mt-2 text-sm text-[#3c4948]">
                    <button
                      type="button"
                      disabled={credentialBusy}
                      onClick={() => credentialFileInputRef.current?.click()}
                      className="font-medium text-[#006a65] underline underline-offset-2 hover:text-[#00504c] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Browse files
                    </button>
                    <span className="text-[#94a3b8]"> · PDF, PNG, JPG</span>
                  </p>
                  <p className="mt-4 text-xs text-[#3c4948] opacity-60">
                    Max 10MB per file (multiple files allowed)
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
                {displayFiles.map((file) => (
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
                      disabled={credentialBusy || deleteCredentialDisabled}
                      title={
                        deleteCredentialDisabled
                          ? "Pharmacists must keep at least one credential, or change role first."
                          : undefined
                      }
                      onClick={() => void removeFile(file.id)}
                      className="rounded-lg p-2 text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#475569] disabled:cursor-not-allowed disabled:opacity-40"
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
                  {appRole === "pharmacist" && displayFiles.length === 0
                    ? variant === "add"
                      ? "Pharmacist role requires at least one credential upload before review."
                      : "Pharmacist role requires at least one credential on file before you can save."
                    : variant === "add"
                      ? "Review each step, then save to continue to confirmation."
                      : "Review each step, then save changes to update this team member."}
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
