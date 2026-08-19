import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchStaffAssignments,
  branches,
  organizationMemberships,
  organizationOnboarding,
  organizations,
  organizationSubscriptions,
  subscriptionPlanFeatures,
  subscriptionPlans,
  users,
} from "@/lib/db/schema";
import {
  AccountStatusError,
  accountDisabledUrl,
  accountStatusBlock,
  isAccountStatusError,
} from "@/lib/auth/account-status";
import { introPaidTrialEligibleForSnapshot } from "@/lib/billing/intro-trial";
import { withPublicPlanSalesLimitFallback } from "@/lib/billing/plan-feature-defaults";
import { ROUTES } from "@/lib/routes";
import { uniqueSlug } from "@/lib/utils/slug";
import { DEFAULT_USER_PREFERENCES } from "@/lib/validation/me";
import type { UserPreferences } from "@/lib/db/schema";
import type {
  AuthContext,
  AuthRepository,
  BillingMembership,
  RegisteredUserParams,
} from "@/lib/repositories/auth/auth.repository";
import type { SubscriptionPlanCode } from "@/lib/repositories/billing/billing.repository";
import { billingRepository } from "@/lib/repositories/billing/billing.repository.impl";
import { capabilitiesFromPlan, intersectCapabilities } from "@/lib/billing/entitlements";
import { resolveAllowedBranchIdsFromAssignments } from "@/lib/rbac/branch-access";
import { canManageSubscription } from "@/lib/rbac/subscription-access";
import {
  fullCapabilities,
  isOrgWideBranchRole,
  normalizeStoredCapabilities,
} from "@/lib/rbac/capabilities";

async function findDefaultMembership(userId: string) {
  return db.query.organizationMemberships.findFirst({
    where: and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.isDefault, true)),
  });
}

async function selectAllowedBranchIdsForUser(userId: string, organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ branchId: branchStaffAssignments.branchId })
    .from(branchStaffAssignments)
    .innerJoin(branches, eq(branches.id, branchStaffAssignments.branchId))
    .where(
      and(
        eq(branchStaffAssignments.userId, userId),
        eq(branches.organizationId, organizationId),
        eq(branchStaffAssignments.status, "active"),
        isNull(branchStaffAssignments.unassignedAt),
      ),
    );
  return [...new Set(rows.map((r) => r.branchId))];
}

function buildAuthContextSlice(
  membership: typeof organizationMemberships.$inferSelect,
  allowedBranchIds: string[] | null,
): Pick<AuthContext, "capabilities" | "allowedBranchIds"> {
  return {
    capabilities: normalizeStoredCapabilities(membership.capabilities, membership.role),
    allowedBranchIds,
  };
}

function normalizeAuthSubscriptionStatus(
  status: string,
): NonNullable<AuthContext["subscription"]>["status"] {
  if (
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "pending_payment" ||
    status === "trialing"
  ) {
    return status;
  }
  return "active";
}

async function loadSubscriptionSlice(
  organizationId: string,
  paidIntroTrialStartedAt: Date | null | undefined,
): Promise<Pick<AuthContext, "entitlements" | "subscription">> {
  await billingRepository.ensureIntroTrialReconciled(organizationId);

  const base = await db
    .select({
      planId: subscriptionPlans.id,
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
      interval: organizationSubscriptions.interval,
      status: organizationSubscriptions.status,
      currentPeriodStart: organizationSubscriptions.currentPeriodStart,
      currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
      scheduledPlanId: organizationSubscriptions.scheduledPlanId,
      entitlements: subscriptionPlanFeatures.features,
    })
    .from(organizationSubscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, organizationSubscriptions.planId))
    .innerJoin(subscriptionPlanFeatures, eq(subscriptionPlanFeatures.planId, subscriptionPlans.id))
    .where(eq(organizationSubscriptions.organizationId, organizationId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!base) {
    // If backfill hasn't run yet (or tests), fall back to free plan entitlements if present.
    const free = await db
      .select({
        planCode: subscriptionPlans.code,
        entitlements: subscriptionPlanFeatures.features,
      })
      .from(subscriptionPlans)
      .innerJoin(subscriptionPlanFeatures, eq(subscriptionPlanFeatures.planId, subscriptionPlans.id))
      .where(eq(subscriptionPlans.code, "free"))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    const rawEntitlements =
      free?.entitlements ??
      ({
        capabilities: {
          stock: true,
          sales: true,
          catalog: true,
          insights: true,
          pay: false,
          staff: false,
          expenses: false,
          organization: true,
        },
        limits: {
          products: 10,
          salesTransactions: 10,
          categories: 10,
          staffUsers: 1,
          branches: 1,
        },
      } as const);

    return {
      entitlements: withPublicPlanSalesLimitFallback("free", rawEntitlements),
      subscription: null,
    };
  }

  const planCode = base.planCode as SubscriptionPlanCode;
  const subStatus = normalizeAuthSubscriptionStatus(base.status);

  const scheduledPlanId =
    typeof base.scheduledPlanId === "string" && base.scheduledPlanId.trim().length > 0
      ? base.scheduledPlanId
      : null;
  const scheduledPlan = scheduledPlanId
    ? await db.query.subscriptionPlans.findFirst({ where: eq(subscriptionPlans.id, scheduledPlanId) })
    : null;

  return {
    entitlements: withPublicPlanSalesLimitFallback(planCode, base.entitlements),
    subscription: {
      planCode,
      planName: base.planName,
      interval: base.interval,
      status: subStatus,
      currentPeriodStart: base.currentPeriodStart,
      currentPeriodEnd: base.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: base.cancelAtPeriodEnd,
      scheduledPlanCode: scheduledPlan?.code ?? null,
      introPaidTrialEligible: introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt,
        planCode,
        status: subStatus,
      }),
    },
  };
}

// `hasCompletedRequiredOnboarding` used to gate the post-auth redirect between
// /dashboard and /dashboard/onboarding. Both are closed — the web app is the
// platform console and onboarding happens in the mobile app — so the whole
// branch, and the helper, are gone. See getPostAuthRedirect below.

export class AuthRepositoryImpl implements AuthRepository {
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const row = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.role, "aurastores_admin"),
        eq(organizationMemberships.status, "active"),
      ),
      columns: { id: true },
    });
    return Boolean(row);
  }

  async findBillingMembership(userId: string): Promise<BillingMembership | null> {
    // Owner first, so someone who is both sees (and gets) the higher role.
    const rows = await db
      .select({
        role: organizationMemberships.role,
        organizationId: organizations.id,
        organizationName: organizations.displayName,
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
      .where(
        and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.status, "active"),
          inArray(organizationMemberships.role, ["owner", "manager"]),
        ),
      )
      .orderBy(sql`case when ${organizationMemberships.role} = 'owner' then 0 else 1 end`)
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      role: row.role === "owner" ? "owner" : "manager",
      organizationId: row.organizationId,
      organizationName: row.organizationName,
    };
  }

  async findByAuthUserId(authUserId: string): Promise<AuthContext | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUserId),
    });

    if (!user) {
      return null;
    }

    const membership =
      (await findDefaultMembership(user.id)) ??
      (await db.query.organizationMemberships.findFirst({
        where: eq(organizationMemberships.userId, user.id),
      }));

    if (!membership) {
      return null;
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.organizationId),
    });

    if (!organization) {
      return null;
    }

    const isPlatformAdmin = await this.isPlatformAdmin(user.id);

    // Mirrors assertAccountUsable in the engine — same conditions, same order,
    // same codes. Without this, the admin console's disable/suspend controls
    // would be cosmetic on the web: nothing else here reads these columns.
    const blocked = accountStatusBlock({
      userStatus: user.status,
      organizationStatus: organization.status,
      membershipStatus: membership.status,
      isPlatformAdmin,
    });
    if (blocked) {
      throw new AccountStatusError(blocked);
    }

    const onboarding = await db.query.organizationOnboarding.findFirst({
      where: eq(organizationOnboarding.organizationId, organization.id),
    });

    const assignmentIds = await selectAllowedBranchIdsForUser(user.id, membership.organizationId);
    let allowedBranchIds: string[] | null;
    if (assignmentIds.length > 0) {
      allowedBranchIds = resolveAllowedBranchIdsFromAssignments(assignmentIds);
    } else if (isOrgWideBranchRole(membership.role)) {
      // Legacy / pre-migration: no `branch_staff_assignments` rows but owner/admin should see all branches.
      allowedBranchIds = null;
    } else if (membership.status === "removed" || membership.status === "suspended") {
      allowedBranchIds = [];
    } else {
      const orgBranchRows = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.organizationId, membership.organizationId));
      // Single-location orgs: members without explicit rows still need a branch scope for the UI/API.
      allowedBranchIds = orgBranchRows.length === 1 ? [orgBranchRows[0]!.id] : [];
    }

    const subscriptionSlice = await loadSubscriptionSlice(organization.id, organization.paidIntroTrialStartedAt);
    const planCapabilities = capabilitiesFromPlan(subscriptionSlice.entitlements);
    const baseContext = {
      user,
      membership,
      organization,
      onboarding: onboarding ?? null,
      isPlatformAdmin,
      ...buildAuthContextSlice(membership, allowedBranchIds),
      ...subscriptionSlice,
    } satisfies Omit<AuthContext, "capabilities"> & { capabilities: AuthContext["capabilities"] };

    // Keyed on the ACTIVE membership, not isPlatformAdmin: an admin who also owns
    // a personal store must not silently unlock every paid capability inside it.
    const isBypassRole = membership.role === "aurastores_admin";
    const effectiveCapabilities = isBypassRole
      ? fullCapabilities()
      : intersectCapabilities(baseContext.capabilities, planCapabilities);

    return {
      ...baseContext,
      capabilities: effectiveCapabilities,
      isPlatformAdmin,
    };
  }

  async createRegisteredUser(params: RegisteredUserParams): Promise<AuthContext> {
    const existing = await this.findByAuthUserId(params.authUserId);
    if (existing) {
      return existing;
    }

    // The mobile flow omits the business name at sign-up (collected during
    // onboarding), so provision the org with a safe placeholder that
    // onboarding overwrites. `uniqueSlug` keeps slugs distinct across
    // placeholder-named orgs.
    const businessName = params.businessName?.trim() || "My store";

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id: params.authUserId,
          email: params.email,
          fullName: params.fullName,
          isEmailVerified: params.isEmailVerified,
        })
        .returning();

      const [organization] = await tx
        .insert(organizations)
        .values({
          slug: uniqueSlug(businessName),
          displayName: businessName,
          legalName: businessName,
          primaryEmail: params.email,
          hqCountry: "ZM",
          storeVertical: params.storeVertical ?? "pharmacy",
          signupSelectedPlanCode: params.selectedPlanCode ?? null,
        })
        .returning();

      const freePlan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.code, "free"),
      });
      if (freePlan) {
        await tx.insert(organizationSubscriptions).values({
          organizationId: organization.id,
          planId: freePlan.id,
          interval: "monthly",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          scheduledPlanId: null,
          updatedAt: new Date(),
          createdAt: new Date(),
        });
      }

      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
          isDefault: true,
          joinedAt: new Date(),
          status: "active",
          capabilities: fullCapabilities(),
        })
        .returning();

      const [onboarding] = await tx
        .insert(organizationOnboarding)
        .values({
          organizationId: organization.id,
          ownerUserId: user.id,
          currentStep: "identity",
          furthestStepIndex: 0,
          status: "draft",
        })
        .returning();

      return {
        user,
        membership,
        organization,
        onboarding,
        // A brand-new signup owns the org it just created; the platform-admin
        // membership is only ever granted out-of-band.
        isPlatformAdmin: false,
        ...buildAuthContextSlice(membership, []),
        entitlements: {
          capabilities: {
            stock: true,
            sales: true,
            catalog: true,
            insights: true,
            pay: false,
            staff: false,
            expenses: false,
            organization: true,
          },
          limits: {
            products: 10,
            salesTransactions: 10,
            categories: 10,
            staffUsers: 1,
            branches: 1,
          },
        },
        subscription: null,
      };
    });
  }

  async updateLastLoginAt(authUserId: string) {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUserId));
  }

  async syncEmailVerifiedFromAuth(authUserId: string, isEmailVerified: boolean) {
    await db
      .update(users)
      .set({
        isEmailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUserId));
  }

  async getPostAuthRedirect(authUserId: string) {
    let context: AuthContext | null;
    try {
      context = await this.findByAuthUserId(authUserId);
    } catch (error) {
      // A disabled/suspended account authenticates fine — the block happens when
      // resolving its context. Sending them to /dashboard would just bounce.
      if (isAccountStatusError(error)) {
        return accountDisabledUrl(error.code);
      }
      throw error;
    }
    if (!context) {
      return ROUTES.auth.signIn;
    }

    // The web app is the PLATFORM CONSOLE. Store owners and staff run their
    // business from the mobile app, and /dashboard is closed to everyone.
    if (context.isPlatformAdmin) {
      return ROUTES.admin.root;
    }
    // The one exception: whoever can manage the org's plan gets the subscription
    // page, which is the only tenant-facing surface on the web. Everyone else still
    // hits the explanation page.
    if (canManageSubscription(context.membership.role)) {
      return ROUTES.organization.subscription;
    }
    return ROUTES.auth.webAdminOnly;
  }

  async updateUserFullName(userId: string, fullName: string): Promise<void> {
    const trimmed = fullName.trim();
    await db
      .update(users)
      .set({
        fullName: trimmed,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!existing) {
      throw new Error("User not found.");
    }
    const current: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...(existing.preferences ?? {}),
    };
    const next: UserPreferences = { ...current, ...patch };
    await db
      .update(users)
      .set({
        preferences: next,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return next;
  }

  async setUserAvatarStorageKey(userId: string, storageKey: string): Promise<void> {
    await db
      .update(users)
      .set({
        avatarStorageKey: storageKey,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export const authRepository: AuthRepository = new AuthRepositoryImpl();
