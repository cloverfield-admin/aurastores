import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import type { UserPreferences } from "@/lib/db/schema";
import type { SubscriptionPlanFeatures } from "@/lib/db/schema/billing.schema";
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
  entitlements: SubscriptionPlanFeatures;
  subscription: {
    planCode: "free" | "basic" | "pro" | "enterprise";
    planName: string;
    interval: "monthly" | "quarterly" | "yearly";
    status: "active" | "past_due" | "canceled" | "pending_payment" | "trialing";
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    scheduledPlanCode: "free" | "basic" | "pro" | "enterprise" | null;
    introPaidTrialEligible: boolean;
  } | null;
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
  /** Paid plan pre-selected from marketing (`?plan=`); stored on the organization until intro trial is granted. */
  selectedPlanCode?: "basic" | "pro" | "enterprise";
};

export interface AuthRepository {
  findByAuthUserId(authUserId: string): Promise<AuthContext | null>;
  createRegisteredUser(params: RegisteredUserParams): Promise<AuthContext>;
  updateLastLoginAt(authUserId: string): Promise<void>;
  syncEmailVerifiedFromAuth(authUserId: string, isEmailVerified: boolean): Promise<void>;
  getPostAuthRedirect(authUserId: string): Promise<string>;
  updateUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>;
  updateUserFullName(userId: string, fullName: string): Promise<void>;
  setUserAvatarStorageKey(userId: string, storageKey: string): Promise<void>;
}
