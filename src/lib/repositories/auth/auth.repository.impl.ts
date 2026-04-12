import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  complianceDocuments,
  organizationMemberships,
  organizationOnboarding,
  organizations,
  users,
} from "@/lib/db/schema";
import { uniqueSlug } from "@/lib/utils/slug";
import type { AuthContext, AuthRepository, RegisteredUserParams } from "@/lib/repositories/auth/auth.repository";

async function findDefaultMembership(userId: string) {
  return db.query.organizationMemberships.findFirst({
    where: and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.isDefault, true)),
  });
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

    return { user, membership, organization, onboarding: onboarding ?? null };
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

      return { user, membership, organization, onboarding };
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

    return (await hasCompletedRequiredOnboarding(context))
      ? "/dashboard"
      : "/dashboard/onboarding";
  }
}

export const authRepository: AuthRepository = new AuthRepositoryImpl();
