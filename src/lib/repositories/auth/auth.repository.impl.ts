import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchStaffAssignments,
  branches,
  complianceDocuments,
  organizationMemberships,
  organizationOnboarding,
  organizations,
  users,
} from "@/lib/db/schema";
import { ROUTES } from "@/lib/routes";
import { uniqueSlug } from "@/lib/utils/slug";
import { DEFAULT_USER_PREFERENCES } from "@/lib/validation/me";
import type { UserPreferences } from "@/lib/db/schema";
import type { AuthContext, AuthRepository, RegisteredUserParams } from "@/lib/repositories/auth/auth.repository";
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

    return {
      user,
      membership,
      organization,
      onboarding: onboarding ?? null,
      ...buildAuthContextSlice(membership, allowedBranchIds),
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
