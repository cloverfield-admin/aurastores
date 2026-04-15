import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchStaffAssignments,
  branches,
  complianceDocuments,
  organizationMemberships,
  organizationOnboarding,
  organizations,
  organizationSubscriptions,
  subscriptionPlanFeatures,
  subscriptionPlans,
  users,
} from "@/lib/db/schema";
import { ROUTES } from "@/lib/routes";
import { uniqueSlug } from "@/lib/utils/slug";
import { DEFAULT_USER_PREFERENCES } from "@/lib/validation/me";
import type { UserPreferences } from "@/lib/db/schema";
import type { AuthContext, AuthRepository, RegisteredUserParams } from "@/lib/repositories/auth/auth.repository";
import { capabilitiesFromPlan, intersectCapabilities } from "@/lib/billing/entitlements";
import { resolveAllowedBranchIdsFromAssignments } from "@/lib/rbac/branch-access";
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

async function loadSubscriptionSlice(
  organizationId: string,
): Promise<Pick<AuthContext, "entitlements" | "subscription">> {
  const base = await db
    .select({
      planId: subscriptionPlans.id,
      planCode: subscriptionPlans.code,
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

    return {
      entitlements:
        free?.entitlements ??
        ({
          capabilities: {
            stock: true,
            sales: true,
            catalog: true,
            insights: false,
            pay: false,
            staff: false,
            organization: true,
          },
          limits: {
            products: 20,
            salesTransactions: 50,
            categories: 20,
            staffUsers: 1,
            branches: 1,
          },
        } as const),
      subscription: null,
    };
  }

  const scheduledPlanId =
    typeof base.scheduledPlanId === "string" && base.scheduledPlanId.trim().length > 0
      ? base.scheduledPlanId
      : null;
  const scheduledPlan = scheduledPlanId
    ? await db.query.subscriptionPlans.findFirst({ where: eq(subscriptionPlans.id, scheduledPlanId) })
    : null;

  return {
    entitlements: base.entitlements,
    subscription: {
      planCode: base.planCode,
      interval: base.interval,
      status: base.status,
      currentPeriodStart: base.currentPeriodStart,
      currentPeriodEnd: base.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: base.cancelAtPeriodEnd,
      scheduledPlanCode: scheduledPlan?.code ?? null,
    },
  };
}

async function hasCompletedRequiredOnboarding(context: AuthContext) {
  if (context.onboarding?.status === "approved" || context.onboarding?.status === "in_review") {
    return true;
  }

  if (context.organization.status === "active") {
    return true;
  }

  if (!context.onboarding?.mainBranchId) {
    return false;
  }

  if (context.onboarding.currentStep !== "review" || context.onboarding.furthestStepIndex < 3) {
    return false;
  }

  const [documentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(complianceDocuments)
    .where(eq(complianceDocuments.organizationId, context.organization.id));

  return (documentCount?.count ?? 0) >= 2;
}

export class AuthRepositoryImpl implements AuthRepository {
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

    const subscriptionSlice = await loadSubscriptionSlice(organization.id);
    const planCapabilities = capabilitiesFromPlan(subscriptionSlice.entitlements);
    const baseContext = {
      user,
      membership,
      organization,
      onboarding: onboarding ?? null,
      ...buildAuthContextSlice(membership, allowedBranchIds),
      ...subscriptionSlice,
    } satisfies Omit<AuthContext, "capabilities"> & { capabilities: AuthContext["capabilities"] };

    const isBypassRole = membership.role === "aurapharma_admin";
    const effectiveCapabilities = isBypassRole
      ? fullCapabilities()
      : intersectCapabilities(baseContext.capabilities, planCapabilities);

    return {
      ...baseContext,
      capabilities: effectiveCapabilities,
    };
  }

  async createRegisteredUser(params: RegisteredUserParams): Promise<AuthContext> {
    const existing = await this.findByAuthUserId(params.authUserId);
    if (existing) {
      return existing;
    }

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
          slug: uniqueSlug(params.pharmacyName),
          displayName: params.pharmacyName,
          legalName: params.pharmacyName,
          primaryEmail: params.email,
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
        ...buildAuthContextSlice(membership, []),
        entitlements: {
          capabilities: {
            stock: true,
            sales: true,
            catalog: true,
            insights: false,
            pay: false,
            staff: false,
            organization: true,
          },
          limits: {
            products: 20,
            salesTransactions: 50,
            categories: 20,
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
    const context = await this.findByAuthUserId(authUserId);
    if (!context) {
      return "/auth/sign-in";
    }

    if (context.membership.status === "invited") {
      const nextDash = encodeURIComponent(ROUTES.dashboard.main);
      return `${ROUTES.auth.updatePassword}?staffInvite=1&next=${nextDash}`;
    }

    return (await hasCompletedRequiredOnboarding(context))
      ? "/dashboard"
      : "/dashboard/onboarding";
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
