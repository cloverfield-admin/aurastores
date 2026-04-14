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

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type StaffDirectorySummary = {
  total: number;
  active: number;
  invited: number;
  other: number;
};

export interface StaffRepository {
  listDirectory(
    context: AuthContext,
    options?: { q?: string; page?: number; pageSize?: number },
  ): Promise<{ members: StaffDirectoryMember[]; pagination: Pagination; summary: StaffDirectorySummary }>;
  /** Typeahead search; returns up to `limit` rows matching name or email (case-insensitive). */
  searchDirectory(context: AuthContext, query: string, limit: number): Promise<StaffDirectoryMember[]>;
  addMemberByEmail(context: AuthContext, input: AddStaffByEmailInput): Promise<{ membershipId: string }>;
}
