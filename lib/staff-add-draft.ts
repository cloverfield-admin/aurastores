export const STAFF_ADD_DRAFT_KEY = "staff-add-draft";

export type StaffAddDraftFile = {
  id: string;
  name: string;
  subtitle: string;
  icon: "description" | "badge";
};

export type StaffAddDraft = {
  fullName: string;
  staffId: string;
  department: string;
  professionalRole: string;
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
    return JSON.parse(raw) as StaffAddDraft;
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
