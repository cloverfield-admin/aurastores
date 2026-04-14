import { and, count, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchStaffAssignments,
  branches,
  organizationMemberships,
  users,
} from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type {
  AddStaffByEmailInput,
  StaffDirectoryMember,
  StaffDirectorySummary,
  StaffRepository,
} from "@/lib/repositories/staff/staff.repository";

export class StaffRepositoryImpl implements StaffRepository {
  async listDirectory(
    context: AuthContext,
    options?: { q?: string; page?: number; pageSize?: number },
  ): Promise<{
    members: StaffDirectoryMember[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
    summary: StaffDirectorySummary;
  }> {
    const q = options?.q?.trim() ?? "";
    const page = Math.max(1, Math.floor(options?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize ?? 10)));
    const offset = (page - 1) * pageSize;

    const baseWhere = and(
      eq(organizationMemberships.organizationId, context.organization.id),
      ne(organizationMemberships.status, "removed"),
      q ? or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`)) : sql`true`,
    );

    const [{ value: totalItems }] = await db
      .select({ value: count() })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere);

    const summaryRows = await db
      .select({
        status: organizationMemberships.status,
        count: count(),
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere)
      .groupBy(organizationMemberships.status);

    const summaryMap = new Map(summaryRows.map((row) => [row.status, row.count] as const));
    const active = summaryMap.get("active") ?? 0;
    const invited = summaryMap.get("invited") ?? 0;
    const total = totalItems;
    const other = Math.max(0, total - active - invited);

    const rows = await db
      .select({
        membershipId: organizationMemberships.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        role: organizationMemberships.role,
        membershipStatus: organizationMemberships.status,
        jobTitle: organizationMemberships.jobTitle,
        branchName: sql<string | null>`(
          SELECT b.name
          FROM branch_staff_assignments AS bsa
          INNER JOIN branches AS b ON b.id = bsa.branch_id
          WHERE bsa.user_id = ${organizationMemberships.userId}
            AND bsa.unassigned_at IS NULL
          LIMIT 1
        )`.as("branch_name"),
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere)
      .orderBy(users.fullName)
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);

    return {
      members: rows.map((row) => ({
        membershipId: row.membershipId,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        role: row.role,
        membershipStatus: row.membershipStatus,
        jobTitle: row.jobTitle,
        branchName: row.branchName,
      })),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        total,
        active,
        invited,
        other,
      },
    };
  }

  async searchDirectory(
    context: AuthContext,
    query: string,
    limit: number,
  ): Promise<StaffDirectoryMember[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }
    const pattern = `%${trimmed}%`;
    const rows = await db
      .select({
        membershipId: organizationMemberships.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        role: organizationMemberships.role,
        membershipStatus: organizationMemberships.status,
        jobTitle: organizationMemberships.jobTitle,
        branchName: sql<string | null>`(
          SELECT b.name
          FROM branch_staff_assignments AS bsa
          INNER JOIN branches AS b ON b.id = bsa.branch_id
          WHERE bsa.user_id = ${organizationMemberships.userId}
            AND bsa.unassigned_at IS NULL
          LIMIT 1
        )`.as("branch_name"),
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(
        and(
          eq(organizationMemberships.organizationId, context.organization.id),
          ne(organizationMemberships.status, "removed"),
          or(ilike(users.fullName, pattern), ilike(users.email, pattern)),
        ),
      )
      .orderBy(users.fullName)
      .limit(limit);

    return rows.map((row) => ({
      membershipId: row.membershipId,
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      membershipStatus: row.membershipStatus,
      jobTitle: row.jobTitle,
      branchName: row.branchName,
    }));
  }

  async addMemberByEmail(
    context: AuthContext,
    input: AddStaffByEmailInput,
  ): Promise<{ membershipId: string }> {
    const email = input.email.trim();
    if (!email) {
      throw new Error("Email is required.");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new Error(
        "No AuraPharma account exists for this email. The team member must register first, then you can add them.",
      );
    }

    const existing = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, context.organization.id),
        eq(organizationMemberships.userId, user.id),
      ),
    });

    if (existing && existing.status !== "removed") {
      throw new Error("This user is already a member of your organization.");
    }

    if (existing?.status === "removed") {
      await db
        .update(organizationMemberships)
        .set({
          status: "active",
          role: input.appRole,
          jobTitle: input.jobTitle,
          joinedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizationMemberships.id, existing.id));

      if (input.branchId) {
        await this.ensureBranchAssignment(context.organization.id, user.id, input.branchId);
      }

      return { membershipId: existing.id };
    }

    const [membership] = await db
      .insert(organizationMemberships)
      .values({
        organizationId: context.organization.id,
        userId: user.id,
        role: input.appRole,
        status: "active",
        jobTitle: input.jobTitle,
        isDefault: false,
        joinedAt: new Date(),
      })
      .returning({ id: organizationMemberships.id });

    if (!membership) {
      throw new Error("Could not create membership.");
    }

    if (input.branchId) {
      await this.ensureBranchAssignment(context.organization.id, user.id, input.branchId);
    }

    await db
      .update(users)
      .set({
        fullName: input.fullName.trim() || user.fullName,
        phone: input.phone?.trim() || user.phone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return { membershipId: membership.id };
  }

  private async ensureBranchAssignment(organizationId: string, userId: string, branchId: string) {
    const branch = await db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.organizationId, organizationId)),
    });
    if (!branch) {
      throw new Error("Branch not found.");
    }

    const open = await db.query.branchStaffAssignments.findFirst({
      where: and(
        eq(branchStaffAssignments.userId, userId),
        eq(branchStaffAssignments.branchId, branchId),
        isNull(branchStaffAssignments.unassignedAt),
      ),
    });

    if (open) {
      return;
    }

    await db.insert(branchStaffAssignments).values({
      branchId,
      userId,
      role: "pharmacist",
      status: "active",
      isLead: false,
    });
  }
}

export const staffRepository: StaffRepository = new StaffRepositoryImpl();
