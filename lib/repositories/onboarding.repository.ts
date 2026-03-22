import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchOperatingHours,
  branches,
  complianceDocuments,
  organizationOnboarding,
  organizations,
} from "@/lib/db/schema";
import { authRepository } from "@/lib/repositories/auth.repository";
import { branchCodeFromName } from "@/lib/utils/slug";
import type { IdentityInput, PharmacyDetailsInput } from "@/lib/validation/onboarding";

type PersistedDocument = {
  documentType:
    | "pharmacy_operation_license"
    | "pharmacist_in_charge_certificate";
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

const CUSTOM_HOURS = [
  { dayOfWeek: 1, opensAt: "08:00:00", closesAt: "20:00:00", isClosed: false },
  { dayOfWeek: 2, opensAt: "08:00:00", closesAt: "20:00:00", isClosed: false },
  { dayOfWeek: 3, opensAt: "08:00:00", closesAt: "20:00:00", isClosed: false },
  { dayOfWeek: 4, opensAt: "08:00:00", closesAt: "20:00:00", isClosed: false },
  { dayOfWeek: 5, opensAt: "08:00:00", closesAt: "20:00:00", isClosed: false },
  { dayOfWeek: 6, opensAt: "09:00:00", closesAt: "15:00:00", isClosed: false },
  { dayOfWeek: 0, opensAt: null, closesAt: null, isClosed: true },
] as const;

const ALWAYS_OPEN_HOURS = [
  { dayOfWeek: 0, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 1, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 2, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 3, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 4, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 5, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 6, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
] as const;

function inferHoursMode(
  hours: Array<typeof branchOperatingHours.$inferSelect>,
): "24-7" | "custom" {
  return hours.length === 7 && hours.every((entry) => !entry.isClosed && entry.opensAt === "00:00:00")
    ? "24-7"
    : "custom";
}

function hoursForMode(mode: PharmacyDetailsInput["hoursMode"]) {
  return mode === "24-7" ? ALWAYS_OPEN_HOURS : CUSTOM_HOURS;
}

export class OnboardingRepository {
  async getCurrent(authUserId: string) {
    const context = await authRepository.findByAuthUserId(authUserId);
    if (!context) {
      return null;
    }

    const primaryBranch =
      (context.onboarding?.mainBranchId
        ? await db.query.branches.findFirst({
            where: eq(branches.id, context.onboarding.mainBranchId),
          })
        : null) ??
      (await db.query.branches.findFirst({
        where: and(eq(branches.organizationId, context.organization.id), eq(branches.isPrimary, true)),
      }));

    const operatingHours = primaryBranch
      ? await db.query.branchOperatingHours.findMany({
          where: eq(branchOperatingHours.branchId, primaryBranch.id),
          orderBy: (hours, { asc }) => [asc(hours.dayOfWeek)],
        })
      : [];

    const documents = await db.query.complianceDocuments.findMany({
      where: eq(complianceDocuments.organizationId, context.organization.id),
      orderBy: (document, { desc: orderDesc }) => [orderDesc(document.createdAt)],
    });

    return {
      user: {
        id: context.user.id,
        email: context.user.email,
        fullName: context.user.fullName,
      },
      organization: {
        id: context.organization.id,
        displayName: context.organization.displayName,
        legalName: context.organization.legalName ?? "",
        taxId: context.organization.taxId ?? "",
        primaryEmail: context.organization.primaryEmail,
        primaryPhone: context.organization.primaryPhone ?? "",
        street: context.organization.hqAddressLine1 ?? "",
        city: context.organization.hqCity ?? "",
        state: context.organization.hqState ?? "",
        zip: context.organization.hqPostalCode ?? "",
      },
      onboarding: {
        status: context.onboarding?.status ?? "draft",
        currentStep: context.onboarding?.currentStep ?? "identity",
        furthestStepIndex: context.onboarding?.furthestStepIndex ?? 0,
      },
      mainBranch: primaryBranch
        ? {
            id: primaryBranch.id,
            branchName: primaryBranch.name,
            pharmacistCount: primaryBranch.licensedPharmacistCount,
            branchLocation: primaryBranch.addressLine1,
            hoursMode: inferHoursMode(operatingHours),
            operatingHours,
          }
        : null,
      documents: documents.map((document) => ({
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        status: document.status,
        createdAt: document.createdAt,
      })),
    };
  }

  async saveIdentity(authUserId: string, input: IdentityInput) {
    const context = await authRepository.findByAuthUserId(authUserId);
    if (!context) {
      throw new Error("User context not found.");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(organizations)
        .set({
          legalName: input.legalName,
          taxId: input.taxId,
          primaryPhone: input.phone,
          hqAddressLine1: input.street,
          hqCity: input.city,
          hqState: input.state,
          hqPostalCode: input.zip,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, context.organization.id));

      await tx
        .update(organizationOnboarding)
        .set({
          currentStep: "pharmacy_details",
          furthestStepIndex: sql`GREATEST(${organizationOnboarding.furthestStepIndex}, 1)`,
          updatedAt: new Date(),
        })
        .where(eq(organizationOnboarding.organizationId, context.organization.id));
    });

    return this.getCurrent(authUserId);
  }

  async savePharmacyDetails(authUserId: string, input: PharmacyDetailsInput) {
    const context = await authRepository.findByAuthUserId(authUserId);
    if (!context) {
      throw new Error("User context not found.");
    }

    await db.transaction(async (tx) => {
      const existingBranch =
        (context.onboarding?.mainBranchId
          ? await tx.query.branches.findFirst({
              where: eq(branches.id, context.onboarding.mainBranchId),
            })
          : null) ??
        (await tx.query.branches.findFirst({
          where: and(eq(branches.organizationId, context.organization.id), eq(branches.isPrimary, true)),
        }));

      const branchValues = {
        organizationId: context.organization.id,
        name: input.branchName,
        code: existingBranch?.code ?? branchCodeFromName(input.branchName),
        type: "main" as const,
        status: "draft" as const,
        isPrimary: true,
        addressLine1: input.branchLocation,
        licensedPharmacistCount: input.pharmacistCount,
        updatedAt: new Date(),
      };

      const branch = existingBranch
        ? (
            await tx
              .update(branches)
              .set(branchValues)
              .where(eq(branches.id, existingBranch.id))
              .returning()
          )[0]
        : (
            await tx
              .insert(branches)
              .values(branchValues)
              .returning()
          )[0];

      await tx.delete(branchOperatingHours).where(eq(branchOperatingHours.branchId, branch.id));

      await tx.insert(branchOperatingHours).values(
        hoursForMode(input.hoursMode).map((hours) => ({
          branchId: branch.id,
          dayOfWeek: hours.dayOfWeek,
          opensAt: hours.opensAt,
          closesAt: hours.closesAt,
          isClosed: hours.isClosed,
        })),
      );

      await tx
        .update(organizationOnboarding)
        .set({
          mainBranchId: branch.id,
          currentStep: "license",
          furthestStepIndex: sql`GREATEST(${organizationOnboarding.furthestStepIndex}, 2)`,
          updatedAt: new Date(),
        })
        .where(eq(organizationOnboarding.organizationId, context.organization.id));
    });

    return this.getCurrent(authUserId);
  }

  async saveComplianceDocuments(authUserId: string, docs: PersistedDocument[]) {
    const context = await authRepository.findByAuthUserId(authUserId);
    if (!context) {
      throw new Error("User context not found.");
    }

    await db.transaction(async (tx) => {
      if (docs.length > 0) {
        await tx.insert(complianceDocuments).values(
          docs.map((document) => ({
            organizationId: context.organization.id,
            branchId: context.onboarding?.mainBranchId ?? null,
            uploadedByUserId: context.user.id,
            documentType: document.documentType,
            status: "uploaded" as const,
            fileName: document.fileName,
            storageKey: document.storageKey,
            mimeType: document.mimeType,
            sizeBytes: document.sizeBytes,
          })),
        );
      }

      await tx
        .update(organizationOnboarding)
        .set({
          currentStep: "review",
          furthestStepIndex: sql`GREATEST(${organizationOnboarding.furthestStepIndex}, 3)`,
          updatedAt: new Date(),
        })
        .where(eq(organizationOnboarding.organizationId, context.organization.id));
    });

    return this.getCurrent(authUserId);
  }

  async complete(authUserId: string) {
    const context = await authRepository.findByAuthUserId(authUserId);
    if (!context) {
      throw new Error("User context not found.");
    }

    const [documentCount, branch] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(complianceDocuments)
        .where(eq(complianceDocuments.organizationId, context.organization.id)),
      context.onboarding?.mainBranchId
        ? db.query.branches.findFirst({
            where: eq(branches.id, context.onboarding.mainBranchId),
          })
        : null,
    ]);

    if (!branch) {
      throw new Error("Complete branch setup before finishing onboarding.");
    }

    if ((documentCount[0]?.count ?? 0) < 2) {
      throw new Error("Upload the required compliance documents before finishing onboarding.");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(organizations)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, context.organization.id));

      await tx
        .update(branches)
        .set({
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(branches.id, branch.id));

      await tx
        .update(organizationOnboarding)
        .set({
          status: "approved",
          currentStep: "review",
          furthestStepIndex: 3,
          submittedAt: new Date(),
          reviewedAt: new Date(),
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizationOnboarding.organizationId, context.organization.id));
    });

    return this.getCurrent(authUserId);
  }
}

export const onboardingRepository = new OnboardingRepository();
