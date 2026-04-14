export const STAFF_ADD_DRAFT_KEY = "staff-add-draft";

export type StaffAddDraftFile = {
  id: string;
  name: string;
  subtitle: string;
  icon: "description" | "badge";
};

/** Subset of app roles exposed on the add-staff form. */
export type StaffAddDraftAppRole = "owner" | "admin" | "pharmacist" | "cashier";

export type StaffAddDraft = {
  fullName: string;
  branchIds: string[];
  appRole: StaffAddDraftAppRole;
  accessLevels: Record<string, boolean>;
  email: string;
  phone: string;
  files: StaffAddDraftFile[];
};

export function getStaffAddDraft(): StaffAddDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STAFF_ADD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if ("branchIds" in o && Array.isArray(o.branchIds)) {
      return parsed as StaffAddDraft;
    }
    sessionStorage.removeItem(STAFF_ADD_DRAFT_KEY);
    return null;
  } catch {
    return null;
  }
}

export function setStaffAddDraft(draft: StaffAddDraft): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STAFF_ADD_DRAFT_KEY, JSON.stringify(draft));
}

export function clearStaffAddDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STAFF_ADD_DRAFT_KEY);
}
