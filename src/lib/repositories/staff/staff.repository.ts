import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type StaffDirectoryMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  membershipStatus: string;
  jobTitle: string | null;
  branchName: string | null;
};

export type AddStaffByEmailInput = {
  email: string;
  fullName: string;
  phone: string | null;
  jobTitle: string | null;
  appRole: "owner" | "admin" | "manager" | "pharmacist" | "cashier" | "analyst";
  branchId: string | null;
};

export interface StaffRepository {
  listDirectory(context: AuthContext): Promise<StaffDirectoryMember[]>;
  /** Typeahead search; returns up to `limit` rows matching name or email (case-insensitive). */
  searchDirectory(context: AuthContext, query: string, limit: number): Promise<StaffDirectoryMember[]>;
  addMemberByEmail(context: AuthContext, input: AddStaffByEmailInput): Promise<{ membershipId: string }>;
}
