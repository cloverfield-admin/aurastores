"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useAppMeQuery,
  useDeleteStaffCredentialMutation,
  useStaffMemberQuery,
  useUpdateStaffMemberMutation,
  useUploadStaffCredentialsMutation,
  type StaffMemberDetailDto,
} from "@/lib/queries/staff";
import { useStockBranchesQuery } from "@/lib/queries/stock";
import { ROUTES } from "@/lib/routes";
import type { UpdateStaffMemberPayload } from "@/lib/validation/staff";

const APP_ROLE_OPTIONS: { value: UpdateStaffMemberPayload["appRole"]; label: string }[] = [
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
  { id: "settings", label: "Settings & organization" },
] as const;

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

type EditStaffFormProps = {
  membershipId: string;
  initial: StaffMemberDetailDto;
};

function EditStaffForm({ membershipId, initial }: EditStaffFormProps) {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const updateMutation = useUpdateStaffMemberMutation();
  const uploadMutation = useUploadStaffCredentialsMutation();
  const deleteMutation = useDeleteStaffCredentialMutation();
  const credentialInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [jobTitle, setJobTitle] = useState(initial.jobTitle ?? "");
  const [appRole, setAppRole] = useState<UpdateStaffMemberPayload["appRole"]>(
    initial.appRole as UpdateStaffMemberPayload["appRole"],
  );
  const [branchIds, setBranchIds] = useState<string[]>(initial.branchIds);
  const [accessLevels, setAccessLevels] = useState<Record<string, boolean>>(() => ({
    ...initial.capabilities,
  }));

  const branchesQuery = useStockBranchesQuery(undefined, true);
  const meQuery = useAppMeQuery();
  const branchOptions = useMemo(() => {
    const raw = branchesQuery.data?.branches ?? [];
    return filterBranchesForMe(raw, meQuery.data?.allowedBranchIds);
  }, [branchesQuery.data?.branches, meQuery.data?.allowedBranchIds]);

  const credentials = initial.credentials;

  const isFormValid = useMemo(() => {
    if (!fullName.trim()) return false;
    if (branchIds.length === 0) return false;
    const phoneTrim = phone.trim();
    if (!phoneTrim || phoneTrim.length > 32) return false;
    if (appRole === "pharmacist" && credentials.length === 0) return false;
    return true;
  }, [fullName, branchIds.length, phone, appRole, credentials.length]);

  const toggleBranch = useCallback((id: string) => {
    setBranchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }, []);

  const toggleAccess = useCallback((id: string) => {
    setAccessLevels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleAppRoleChange = useCallback((next: UpdateStaffMemberPayload["appRole"]) => {
    setAppRole(next);
  }, []);

  const handleSave = async () => {
    if (!isFormValid) return;
    const payload: UpdateStaffMemberPayload = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      jobTitle: jobTitle.trim() || null,
      appRole,
      branchIds,
      capabilities: accessLevels,
    };
    await withLoading("dashboard-edit-staff", "Saving changes...", async () => {
      try {
        await updateMutation.mutateAsync({ membershipId, payload });
        notify({ variant: "success", title: "Saved", description: "Staff profile was updated." });
        router.push(ROUTES.dashboard.staff);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not save.";
        notify({ variant: "error", title: "Save failed", description: message });
        throw e;
      }
    });
  };

  const handleCredentialFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list?.length) return;
    const files = Array.from(list);
    event.target.value = "";
    await withLoading("dashboard-edit-staff-upload", "Uploading…", async () => {
      try {
        await uploadMutation.mutateAsync({ membershipId, files });
        notify({ variant: "success", title: "Uploaded", description: "Credential files were added." });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        notify({ variant: "error", title: "Upload failed", description: message });
        throw e;
      }
    });
  };

  const handleDeleteCredential = async (documentId: string) => {
    await withLoading(`dashboard-edit-staff-del-${documentId}`, "Removing…", async () => {
      try {
        await deleteMutation.mutateAsync({ membershipId, documentId });
        notify({ variant: "success", title: "Removed", description: "Credential file was deleted." });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not delete.";
        notify({ variant: "error", title: "Delete failed", description: message });
        throw e;
      }
    });
  };

  const busy =
    isLoading("dashboard-edit-staff") ||
    isLoading("dashboard-edit-staff-upload") ||
    updateMutation.isPending ||
    uploadMutation.isPending ||
    deleteMutation.isPending;

  const canDeleteCredential =
    appRole !== "pharmacist" || credentials.length > 1;

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[960px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Link
              href={ROUTES.dashboard.staff}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#006a65] hover:text-[#00504c]"
            >
              <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
              Back to Staff Directory
            </Link>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e]">
              Edit staff member
            </h1>
            <p className="text-sm text-[#64748b]">Email cannot be changed. Update role, branches, and credentials.</p>
          </div>
        </div>

        <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm">
          <h2 className="mb-6 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">
            Basic information
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#334155]">
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={busy}
                className="rounded-lg border border-[#e2e8f0] px-3 py-2 font-normal text-[#0f172a] outline-none focus:border-[#006a65]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#334155]">
              Email (read-only)
              <input
                value={initial.email}
                readOnly
                disabled
                className="cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 font-normal text-[#64748b]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#334155]">
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
                maxLength={32}
                className="rounded-lg border border-[#e2e8f0] px-3 py-2 font-normal text-[#0f172a] outline-none focus:border-[#006a65]"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-[#334155]">
              Job title
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={busy}
                maxLength={128}
                className="rounded-lg border border-[#e2e8f0] px-3 py-2 font-normal text-[#0f172a] outline-none focus:border-[#006a65]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm">
          <h2 className="mb-6 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">Branches</h2>
          {branchOptions.length === 0 ? (
            <p className="text-sm text-[#64748b]">Loading branches…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {branchOptions.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#f1f5f9] px-4 py-3 hover:bg-[#fafafa]">
                    <input
                      type="checkbox"
                      checked={branchIds.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      disabled={busy}
                      className="size-4 rounded border-[#cbd5e1] text-[#006a65] accent-[#006a65]"
                    />
                    <span className="text-sm font-medium text-[#334155]">{b.name}</span>
                    {b.isPrimary ? (
                      <span className="rounded-full bg-[#f0fdfa] px-2 py-0.5 text-xs font-semibold text-[#0f766e]">
                        Primary
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm">
          <h2 className="mb-6 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">App role</h2>
          <select
            value={appRole}
            onChange={(e) => handleAppRoleChange(e.target.value as UpdateStaffMemberPayload["appRole"])}
            disabled={busy}
            className="w-full max-w-md rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm font-medium text-[#0f172a] outline-none focus:border-[#006a65] sm:w-auto"
          >
            {APP_ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm">
          <h2 className="mb-6 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">Access</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ACCESS_LEVEL_DEFS.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#f1f5f9] px-4 py-3 hover:bg-[#fafafa]">
                  <input
                    type="checkbox"
                    checked={Boolean(accessLevels[d.id])}
                    onChange={() => toggleAccess(d.id)}
                    disabled={busy}
                    className="size-4 rounded border-[#cbd5e1] text-[#006a65] accent-[#006a65]"
                  />
                  <span className="text-sm font-medium text-[#334155]">{d.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">Credentials</h2>
            {appRole === "pharmacist" ? (
              <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#b45309]">
                Required
              </span>
            ) : null}
          </div>
          <input
            ref={credentialInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            multiple
            className="sr-only"
            onChange={handleCredentialFiles}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => credentialInputRef.current?.click()}
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#006a65] px-4 py-2 text-sm font-semibold text-[#006a65] transition hover:bg-[#f0fdfa] disabled:opacity-50"
          >
            <span className="material-symbols-outlined notranslate text-base">upload</span>
            Add files
          </button>
          {credentials.length === 0 ? (
            <p className="text-sm text-[#64748b]">No credential files on file.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {credentials.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#334155]">{c.fileName}</p>
                    <p className="text-xs text-[#64748b]">
                      {c.mimeType} · {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !canDeleteCredential}
                    title={
                      !canDeleteCredential
                        ? "Pharmacists must keep at least one credential, or change role first."
                        : "Delete file"
                    }
                    onClick={() => void handleDeleteCredential(c.id)}
                    className="shrink-0 rounded-lg p-2 text-[#b91c1c] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined notranslate text-base">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex justify-end gap-4">
          <Link
            href={ROUTES.dashboard.staff}
            className="rounded-xl bg-[#e6e8ea] px-6 py-3 text-base font-semibold text-[#3c4948] transition hover:bg-[#d1d5db]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!isFormValid || busy}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-base font-semibold text-white shadow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(70, 72, 212) 100%)",
            }}
          >
            <span className="material-symbols-outlined notranslate text-lg">save</span>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditStaffContent() {
  const params = useParams();
  const membershipId = typeof params.membershipId === "string" ? params.membershipId : undefined;
  const memberQuery = useStaffMemberQuery(membershipId);

  if (!membershipId) {
    return (
      <div className="px-4 py-16 text-center text-sm text-[#64748b]">Invalid staff link.</div>
    );
  }

  if (memberQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-[#64748b]">Loading staff member…</p>
      </div>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-red-600">Could not load this staff member.</p>
        <Link href={ROUTES.dashboard.staff} className="mt-4 inline-block text-sm font-semibold text-[#006a65]">
          Back to directory
        </Link>
      </div>
    );
  }

  const data = memberQuery.data;
  return (
    <EditStaffForm key={memberQuery.dataUpdatedAt} membershipId={membershipId} initial={data} />
  );
}
