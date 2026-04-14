import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import {
  organizationMemberships,
  organizationOnboarding,
  organizations,
  users,
} from "@/lib/db/schema";

export type AuthContext = {
  user: typeof users.$inferSelect;
  membership: typeof organizationMemberships.$inferSelect;
  organization: typeof organizations.$inferSelect;
  onboarding: typeof organizationOnboarding.$inferSelect | null;
  capabilities: MembershipCapabilities;
  /**
   * Active `branch_staff_assignments` for this org (`[]` = no branches).
   * `null` means no SQL branch filter (legacy / tests only); resolved auth context
   * from `findByAuthUserId` uses a non-null array.
   */
  allowedBranchIds: string[] | null;
};

export type RegisteredUserParams = {
  authUserId: string;
  email: string;
  fullName: string;
  pharmacyName: string;
  isEmailVerified: boolean;
};

export interface AuthRepository {
  findByAuthUserId(authUserId: string): Promise<AuthContext | null>;
  createRegisteredUser(params: RegisteredUserParams): Promise<AuthContext>;
  updateLastLoginAt(authUserId: string): Promise<void>;
  syncEmailVerifiedFromAuth(authUserId: string, isEmailVerified: boolean): Promise<void>;
  getPostAuthRedirect(authUserId: string): Promise<string>;
}
