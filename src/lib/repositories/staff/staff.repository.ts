import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { MembershipCapabilities } from "@/lib/rbac/capabilities";

export type StaffDirectoryMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  membershipStatus: string;
  jobTitle: string | null;
  staffEmployeeCode: string | null;
  branchName: string | null;
};

export type StaffAppRole = "owner" | "admin" | "manager" | "pharmacist" | "cashier" | "analyst";

export type AddStaffByEmailInput = {
  email: string;
  fullName: string;
  phone: string | null;
  jobTitle: string | null;
  appRole: StaffAppRole;
  branchIds: string[];
  /** Partial overrides; merged with role defaults server-side. */
  capabilities?: Partial<MembershipCapabilities>;
};

/** Discriminator stored in `compliance_documents.metadata` for staff uploads. */
export const STAFF_CREDENTIAL_METADATA_KIND = "staff_credential" as const;

export type StaffCredentialRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: Date;
};

export type StaffMemberForEdit = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  jobTitle: string | null;
  appRole: StaffAppRole;
  membershipStatus: string;
  staffEmployeeCode: string | null;
  capabilities: MembershipCapabilities;
  branchIds: string[];
  credentials: StaffCredentialRecord[];
};

/** Update payload (no email — identity email is immutable here). */
export type UpdateStaffMemberInput = {
  fullName: string;
  phone: string | null;
  jobTitle: string | null;
  appRole: StaffAppRole;
  branchIds: string[];
  capabilities?: Partial<MembershipCapabilities>;
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
  addMemberByEmail(
    context: AuthContext,
    input: AddStaffByEmailInput,
  ): Promise<{ membershipId: string; staffEmployeeCode: string | null }>;

  isEmailActiveMemberOfOrg(organizationId: string, emailLower: string): Promise<boolean>;

  createStaffInvitation(context: AuthContext, input: AddStaffByEmailInput): Promise<string>;

  deleteStaffInvitation(id: string): Promise<void>;

  acceptStaffInvitationFromAuth(params: {
    authUserId: string;
    emailNormalized: string;
    invitationIdFromMetadata: string | null | undefined;
  }): Promise<"provisioned" | "skipped">;

  activateInvitedMembershipsForStaff(authUserId: string): Promise<void>;

  getMemberForEdit(context: AuthContext, membershipId: string): Promise<StaffMemberForEdit | null>;

  updateMember(
    context: AuthContext,
    membershipId: string,
    input: UpdateStaffMemberInput,
    finalBranchIds: string[],
  ): Promise<void>;

  listStaffCredentials(organizationId: string, membershipId: string): Promise<StaffCredentialRecord[]>;

  countStaffCredentials(organizationId: string, membershipId: string): Promise<number>;

  findStaffCredentialDocument(
    organizationId: string,
    membershipId: string,
    documentId: string,
  ): Promise<{ id: string; storageKey: string } | null>;

  insertStaffCredential(params: {
    organizationId: string;
    staffUserId: string;
    membershipId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<string>;

  deleteStaffCredentialDocument(
    documentId: string,
    organizationId: string,
    membershipId: string,
  ): Promise<void>;
}
