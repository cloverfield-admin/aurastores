import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branchOperatingHours, branchStaffAssignments, branches } from "@/lib/db/schema";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type {
  BranchDetail,
  BranchesRepository,
  CreatedBranch,
} from "@/lib/repositories/branches/branches.repository";
import { branchCodeFromName } from "@/lib/utils/slug";
import type { CreateOrganizationBranchInput, UpdateOrganizationBranchInput } from "@/lib/validation/branches";
import { assertBranchAllowedForContext } from "@/lib/rbac/branch-access";

const ALWAYS_OPEN_HOURS = [
  { dayOfWeek: 0, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 1, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 2, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 3, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 4, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 5, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
  { dayOfWeek: 6, opensAt: "00:00:00", closesAt: "23:59:00", isClosed: false },
] as const;

function toDbTime(hhMm: string): string {
  return `${hhMm}:00`;
}

function toInputTime(value: string | null | undefined): string | null {
  if (value == null || value === "") {
    return null;
  }
  const s = String(value);
  const match = /^(\d{2}):(\d{2})/.exec(s);
  return match ? `${match[1]}:${match[2]}` : null;
}

function hoursRowsForBranchInput(input: CreateOrganizationBranchInput) {
  if (input.hoursMode === "24-7") {
    return [...ALWAYS_OPEN_HOURS];
  }
  const weekly = input.weeklyHours;
  if (!weekly || weekly.length !== 7) {
    throw new Error("Custom hours require a full weekly schedule.");
  }
  return [...weekly]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((row) => ({
      dayOfWeek: row.dayOfWeek,
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : toDbTime(row.opensAt as string),
      closesAt: row.isClosed ? null : toDbTime(row.closesAt as string),
    }));
}

export class BranchesRepositoryImpl implements BranchesRepository {
  async createOrganizationBranch(context: AuthContext, input: CreateOrganizationBranchInput): Promise<CreatedBranch> {
    const orgId = context.organization.id;
    return db.transaction(async (tx) => {
      const [{ value: branchCount }] = await tx
        .select({ value: count() })
        .from(branches)
        .where(eq(branches.organizationId, orgId));

      assertWithinLimit({
        kind: "branches",
        current: branchCount,
        limit: context.entitlements.limits.branches,
      });

      const branchCode = branchCodeFromName(input.name);

      const [created] = await tx
        .insert(branches)
        .values({
          organizationId: orgId,
          code: branchCode,
          name: input.name,
          type: "retail",
          status: "draft",
          isPrimary: false,
          addressLine1: input.addressLine1,
          country: "ZM",
          latitude: input.latitude != null && input.longitude != null ? input.latitude : null,
          longitude: input.latitude != null && input.longitude != null ? input.longitude : null,
          professionalStaffCount: input.professionalStaffCount,
          updatedAt: new Date(),
        })
        .returning({ id: branches.id, name: branches.name });

      if (!created) {
        throw new Error("Branch could not be created.");
      }

      await tx.insert(branchOperatingHours).values(
        hoursRowsForBranchInput(input).map((hours) => ({
          branchId: created.id,
          dayOfWeek: hours.dayOfWeek,
          opensAt: hours.opensAt,
          closesAt: hours.closesAt,
          isClosed: hours.isClosed,
        })),
      );

      await tx.insert(branchStaffAssignments).values({
        branchId: created.id,
        userId: context.user.id,
        role: context.membership.role,
        status: "active",
        isLead: context.membership.role === "owner",
        assignedAt: new Date(),
      });

      return created;
    });
  }

  async getBranchById(context: AuthContext, branchId: string): Promise<BranchDetail | null> {
    assertBranchAllowedForContext(context, branchId);

    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.organizationId, context.organization.id)),
    });
    if (!branch) {
      return null;
    }

    const hours = await db.query.branchOperatingHours.findMany({
      where: eq(branchOperatingHours.branchId, branch.id),
      orderBy: (h, { asc }) => [asc(h.dayOfWeek)],
    });

    return {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      type: branch.type,
      status: branch.status,
      isPrimary: branch.isPrimary,
      addressLine1: branch.addressLine1,
      latitude: branch.latitude ?? null,
      longitude: branch.longitude ?? null,
      professionalStaffCount: branch.professionalStaffCount,
      operatingHours: hours.map((h) => ({
        dayOfWeek: Number(h.dayOfWeek),
        isClosed: Boolean(h.isClosed),
        opensAt: toInputTime(h.opensAt),
        closesAt: toInputTime(h.closesAt),
      })),
    };
  }

  async updateBranchById(
    context: AuthContext,
    branchId: string,
    input: UpdateOrganizationBranchInput,
  ): Promise<BranchDetail> {
    assertBranchAllowedForContext(context, branchId);

    return db.transaction(async (tx) => {
      const existing = await tx.query.branches.findFirst({
        where: and(eq(branches.id, branchId), eq(branches.organizationId, context.organization.id)),
      });
      if (!existing) {
        throw new Error("Branch not found.");
      }

      const [updated] = await tx
        .update(branches)
        .set({
          name: input.name,
          type: input.type,
          status: input.status,
          addressLine1: input.addressLine1,
          latitude: input.latitude != null && input.longitude != null ? input.latitude : null,
          longitude: input.latitude != null && input.longitude != null ? input.longitude : null,
          professionalStaffCount: input.professionalStaffCount,
          updatedAt: new Date(),
        })
        .where(and(eq(branches.id, branchId), eq(branches.organizationId, context.organization.id)))
        .returning();

      if (!updated) {
        throw new Error("Branch update failed.");
      }

      await tx.delete(branchOperatingHours).where(eq(branchOperatingHours.branchId, branchId));
      await tx.insert(branchOperatingHours).values(
        hoursRowsForBranchInput({
          name: input.name,
          professionalStaffCount: input.professionalStaffCount,
          addressLine1: input.addressLine1,
          latitude: input.latitude,
          longitude: input.longitude,
          hoursMode: input.hoursMode,
          weeklyHours: input.weeklyHours,
        }).map((hours) => ({
          branchId,
          dayOfWeek: hours.dayOfWeek,
          opensAt: hours.opensAt,
          closesAt: hours.closesAt,
          isClosed: hours.isClosed,
        })),
      );

      const hours = await tx.query.branchOperatingHours.findMany({
        where: eq(branchOperatingHours.branchId, branchId),
        orderBy: (h, { asc }) => [asc(h.dayOfWeek)],
      });

      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        type: updated.type,
        status: updated.status,
        isPrimary: updated.isPrimary,
        addressLine1: updated.addressLine1,
        latitude: updated.latitude ?? null,
        longitude: updated.longitude ?? null,
        professionalStaffCount: updated.professionalStaffCount,
        operatingHours: hours.map((h) => ({
          dayOfWeek: Number(h.dayOfWeek),
          isClosed: Boolean(h.isClosed),
          opensAt: toInputTime(h.opensAt),
          closesAt: toInputTime(h.closesAt),
        })),
      };
    });
  }
}

export const branchesRepository: BranchesRepository = new BranchesRepositoryImpl();

