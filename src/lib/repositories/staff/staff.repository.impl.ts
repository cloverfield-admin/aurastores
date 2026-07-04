import { and, count, eq, gte, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branchStaffAssignments,
  branches,
  complianceDocuments,
  organizationMemberships,
  staffInvitations,
  users,
} from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import {
  STAFF_CREDENTIAL_METADATA_KIND,
  type AddStaffByEmailInput,
  type StaffCredentialRecord,
  type StaffDirectoryMember,
  type StaffDirectorySummary,
  type StaffMemberForEdit,
  type StaffRepository,
  type UpdateStaffMemberInput,
} from "@/lib/repositories/staff/staff.repository";
import { mergeCapabilitiesFromInput, normalizeStoredCapabilities } from "@/lib/rbac/capabilities";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";
import { dispatchNotification } from "@/lib/notifications/engine";

/** DB or transaction client (drizzle transaction type is narrower than root `db`). */
type DbExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

function sqlCountToNumber(value: unknown): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class StaffRepositoryImpl implements StaffRepository {
  private async assertStaffUserLimit(context: AuthContext) {
    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, context.organization.id),
          ne(organizationMemberships.status, "removed"),
        ),
      );

    assertWithinLimit({
      kind: "staffUsers",
      current: memberCount,
      limit: context.entitlements.limits.staffUsers,
    });
  }

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

    const totalRow = await db
      .select({ value: count() })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere);
    const membershipTotal = sqlCountToNumber(totalRow[0]?.value);

    const summaryRows = await db
      .select({
        status: organizationMemberships.status,
        count: count(),
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere)
      .groupBy(organizationMemberships.status);

    const summaryMap = new Map(
      summaryRows.map((row) => [row.status, sqlCountToNumber(row.count)] as const),
    );
    const active = summaryMap.get("active") ?? 0;
    const membershipInvited = summaryMap.get("invited") ?? 0;

    const now = new Date();
    const [pendingInviteRow] = await db
      .select({ value: count() })
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.organizationId, context.organization.id),
          eq(staffInvitations.status, "pending"),
          gte(staffInvitations.expiresAt, now),
        ),
      );
    const pendingEmailInvites = sqlCountToNumber(pendingInviteRow?.value);

    const invited = membershipInvited + pendingEmailInvites;
    const total = membershipTotal + pendingEmailInvites;
    const other = Math.max(0, membershipTotal - active - membershipInvited);

    const rows = await db
      .select({
        membershipId: organizationMemberships.id,
        userId: users.id,
        fullName: users.fullName,
        email: users.email,
        avatarStorageKey: users.avatarStorageKey,
        role: organizationMemberships.role,
        membershipStatus: organizationMemberships.status,
        jobTitle: organizationMemberships.jobTitle,
        staffEmployeeCode: organizationMemberships.staffEmployeeCode,
        branchName: sql<string | null>`(
          SELECT string_agg(b.name, ', ' ORDER BY b.name)
          FROM branch_staff_assignments AS bsa
          INNER JOIN branches AS b ON b.id = bsa.branch_id
          WHERE bsa.user_id = ${organizationMemberships.userId}
            AND bsa.unassigned_at IS NULL
            AND b.organization_id = ${organizationMemberships.organizationId}
        )`.as("branch_name"),
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(baseWhere)
      .orderBy(users.fullName)
      .limit(pageSize)
      .offset(offset);

    const totalPages = Math.max(1, Math.ceil(membershipTotal / pageSize));
    const safePage = Math.min(page, totalPages);

    return {
      members: rows.map((row) => ({
        membershipId: row.membershipId,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        avatarUrl: row.avatarStorageKey ? getUserAvatarPublicUrl(row.avatarStorageKey) : null,
        role: row.role,
        membershipStatus: row.membershipStatus,
        jobTitle: row.jobTitle,
        staffEmployeeCode: row.staffEmployeeCode,
        branchName: row.branchName,
      })),
      pagination: {
        page: safePage,
        pageSize,
        totalItems: membershipTotal,
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
        avatarStorageKey: users.avatarStorageKey,
        role: organizationMemberships.role,
        membershipStatus: organizationMemberships.status,
        jobTitle: organizationMemberships.jobTitle,
        staffEmployeeCode: organizationMemberships.staffEmployeeCode,
        branchName: sql<string | null>`(
          SELECT string_agg(b.name, ', ' ORDER BY b.name)
          FROM branch_staff_assignments AS bsa
          INNER JOIN branches AS b ON b.id = bsa.branch_id
          WHERE bsa.user_id = ${organizationMemberships.userId}
            AND bsa.unassigned_at IS NULL
            AND b.organization_id = ${organizationMemberships.organizationId}
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
      avatarUrl: row.avatarStorageKey ? getUserAvatarPublicUrl(row.avatarStorageKey) : null,
      role: row.role,
      membershipStatus: row.membershipStatus,
      jobTitle: row.jobTitle,
      staffEmployeeCode: row.staffEmployeeCode,
      branchName: row.branchName,
    }));
  }

  async addMemberByEmail(
    context: AuthContext,
    input: AddStaffByEmailInput,
  ): Promise<{ membershipId: string; staffEmployeeCode: string | null }> {
    const email = input.email.trim();
    if (!email) {
      throw new Error("Email is required.");
    }

    const branchIds = [...new Set(input.branchIds)];
    if (!branchIds.length) {
      throw new Error("At least one branch is required.");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new Error(
        "No AuraStores account exists for this email. The team member must register first, then you can add them.",
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
      await this.assertStaffUserLimit(context);
      return await db.transaction(async (tx) => {
        let staffEmployeeCode = existing.staffEmployeeCode;
        if (!staffEmployeeCode) {
          staffEmployeeCode = await this.allocateNextStaffEmployeeCode(tx, context.organization.id);
        }

        await tx
          .update(organizationMemberships)
          .set({
            status: "active",
            role: input.appRole,
            jobTitle: input.jobTitle,
            staffEmployeeCode,
            capabilities: mergeCapabilitiesFromInput(input.appRole, input.capabilities),
            joinedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(organizationMemberships.id, existing.id));

        for (const branchId of branchIds) {
          await this.ensureBranchAssignment(tx, context.organization.id, user.id, branchId, input.appRole);
        }

        await tx
          .update(users)
          .set({
            fullName: input.fullName.trim() || user.fullName,
            phone: input.phone?.trim() || user.phone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        return { membershipId: existing.id, staffEmployeeCode };
      });
    }

    await this.assertStaffUserLimit(context);
    return await db.transaction(async (tx) => {
      const staffEmployeeCode = await this.allocateNextStaffEmployeeCode(tx, context.organization.id);

      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: context.organization.id,
          userId: user.id,
          role: input.appRole,
          status: "active",
          jobTitle: input.jobTitle,
          staffEmployeeCode,
          capabilities: mergeCapabilitiesFromInput(input.appRole, input.capabilities),
          isDefault: false,
          joinedAt: new Date(),
        })
        .returning({
          id: organizationMemberships.id,
          staffEmployeeCode: organizationMemberships.staffEmployeeCode,
        });

      if (!membership) {
        throw new Error("Could not create membership.");
      }

      for (const branchId of branchIds) {
        await this.ensureBranchAssignment(tx, context.organization.id, user.id, branchId, input.appRole);
      }

      await tx
        .update(users)
        .set({
          fullName: input.fullName.trim() || user.fullName,
          phone: input.phone?.trim() || user.phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return {
        membershipId: membership.id,
        staffEmployeeCode: membership.staffEmployeeCode ?? staffEmployeeCode,
      };
    });
  }

  private async allocateNextStaffEmployeeCode(tx: DbExecutor, organizationId: string): Promise<string> {
    const [row] = await tx
      .select({
        maxSeq: sql<number>`coalesce(max(cast(substring(${organizationMemberships.staffEmployeeCode} from 4) as integer)) filter (where ${organizationMemberships.staffEmployeeCode} like 'AP-%'), 0)`,
      })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          isNotNull(organizationMemberships.staffEmployeeCode),
        ),
      );

    const next = (row?.maxSeq ?? 0) + 1;
    return `AP-${String(next).padStart(5, "0")}`;
  }

  private async ensureBranchAssignment(
    tx: DbExecutor,
    organizationId: string,
    userId: string,
    branchId: string,
    membershipRole: AddStaffByEmailInput["appRole"],
  ) {
    const branch = await tx.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.organizationId, organizationId)),
    });
    if (!branch) {
      throw new Error("Branch not found.");
    }

    const anyAssignment = await tx.query.branchStaffAssignments.findFirst({
      where: and(
        eq(branchStaffAssignments.userId, userId),
        eq(branchStaffAssignments.branchId, branchId),
      ),
    });

    if (anyAssignment && anyAssignment.unassignedAt == null) {
      if (anyAssignment.role !== membershipRole) {
        await tx
          .update(branchStaffAssignments)
          .set({ role: membershipRole })
          .where(eq(branchStaffAssignments.id, anyAssignment.id));
      }
      return;
    }

    if (anyAssignment) {
      await tx
        .update(branchStaffAssignments)
        .set({
          unassignedAt: null,
          role: membershipRole,
          status: "active",
          assignedAt: new Date(),
        })
        .where(eq(branchStaffAssignments.id, anyAssignment.id));
      return;
    }

    await tx.insert(branchStaffAssignments).values({
      branchId,
      userId,
      role: membershipRole,
      status: "active",
      isLead: false,
    });
  }

  async isEmailActiveMemberOfOrg(organizationId: string, emailLower: string): Promise<boolean> {
    const rows = await db
      .select({ id: organizationMemberships.id })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          ne(organizationMemberships.status, "removed"),
          sql`lower(${users.email}) = ${emailLower}`,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async createStaffInvitation(context: AuthContext, input: AddStaffByEmailInput): Promise<string> {
    await this.assertStaffUserLimit(context);
    const emailLower = input.email.trim().toLowerCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    const caps = mergeCapabilitiesFromInput(input.appRole, input.capabilities);
    const [row] = await db
      .insert(staffInvitations)
      .values({
        organizationId: context.organization.id,
        invitedByUserId: context.user.id,
        email: emailLower,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() ?? "",
        appRole: input.appRole,
        jobTitle: input.jobTitle,
        branchIds: [...new Set(input.branchIds)],
        capabilities: caps,
        status: "pending",
        expiresAt,
      })
      .returning({ id: staffInvitations.id });
    if (!row) {
      throw new Error("Could not create staff invitation.");
    }
    return row.id;
  }

  async deleteStaffInvitation(id: string): Promise<void> {
    await db.delete(staffInvitations).where(eq(staffInvitations.id, id));
  }

  async acceptStaffInvitationFromAuth(params: {
    authUserId: string;
    emailNormalized: string;
    invitationIdFromMetadata: string | null | undefined;
  }): Promise<"provisioned" | "skipped"> {
    const invitationId = params.invitationIdFromMetadata?.trim();
    if (!invitationId) {
      return "skipped";
    }

    await db.transaction(async (tx) => {
      const invitation = await tx.query.staffInvitations.findFirst({
        where: and(eq(staffInvitations.id, invitationId), eq(staffInvitations.status, "pending")),
      });

      if (!invitation) {
        return;
      }

      if (invitation.email.toLowerCase() !== params.emailNormalized.toLowerCase()) {
        return;
      }

      if (invitation.expiresAt < new Date()) {
        await tx
          .update(staffInvitations)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(staffInvitations.id, invitationId));
        return;
      }

      const existingUser = await tx.query.users.findFirst({
        where: eq(users.id, params.authUserId),
      });

      if (!existingUser) {
        await tx.insert(users).values({
          id: params.authUserId,
          email: invitation.email,
          fullName: invitation.fullName,
          phone: invitation.phone,
          status: "active",
          isEmailVerified: true,
        });
      } else {
        await tx
          .update(users)
          .set({
            fullName: invitation.fullName,
            phone: invitation.phone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, params.authUserId));
      }

      const existingMembership = await tx.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, invitation.organizationId),
          eq(organizationMemberships.userId, params.authUserId),
        ),
      });

      if (existingMembership && existingMembership.status !== "removed") {
        const mergedCaps = mergeCapabilitiesFromInput(
          invitation.appRole,
          invitation.capabilities as Record<string, boolean> | null | undefined,
        );
        await tx
          .update(organizationMemberships)
          .set({
            role: invitation.appRole,
            jobTitle: invitation.jobTitle,
            capabilities: mergedCaps,
            updatedAt: new Date(),
          })
          .where(eq(organizationMemberships.id, existingMembership.id));

        const branchIdsExisting = [...new Set(invitation.branchIds)];
        for (const branchId of branchIdsExisting) {
          await this.ensureBranchAssignment(
            tx as DbExecutor,
            invitation.organizationId,
            params.authUserId,
            branchId,
            invitation.appRole,
          );
        }

        await tx
          .update(staffInvitations)
          .set({
            status: "accepted",
            acceptedAt: new Date(),
            authUserId: params.authUserId,
            updatedAt: new Date(),
          })
          .where(eq(staffInvitations.id, invitationId));
        return;
      }

      const staffEmployeeCode = await this.allocateNextStaffEmployeeCode(
        tx as DbExecutor,
        invitation.organizationId,
      );

      const invitationCaps = mergeCapabilitiesFromInput(
        invitation.appRole,
        invitation.capabilities as Record<string, boolean> | null | undefined,
      );
      const [membership] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: invitation.organizationId,
          userId: params.authUserId,
          role: invitation.appRole,
          status: "invited",
          jobTitle: invitation.jobTitle,
          staffEmployeeCode,
          capabilities: invitationCaps,
          isDefault: false,
          joinedAt: new Date(),
        })
        .returning({ id: organizationMemberships.id });

      if (!membership) {
        throw new Error("Could not create membership from invitation.");
      }

      const branchIds = [...new Set(invitation.branchIds)];
      for (const branchId of branchIds) {
        await this.ensureBranchAssignment(
          tx as DbExecutor,
          invitation.organizationId,
          params.authUserId,
          branchId,
          invitation.appRole,
        );
      }

      await tx
        .update(staffInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          authUserId: params.authUserId,
          updatedAt: new Date(),
        })
        .where(eq(staffInvitations.id, invitationId));
    });

    const after = await db.query.staffInvitations.findFirst({
      where: eq(staffInvitations.id, invitationId),
    });
    if (after?.status === "accepted" && after.authUserId === params.authUserId) {
      // Notify staff-capable members that someone joined (fire-and-forget).
      await dispatchNotification({
        type: "staff_invite_accepted",
        organizationId: after.organizationId,
        params: {
          staff_name: after.email,
          membership_id: after.id,
        },
      });
      return "provisioned";
    }
    return "skipped";
  }

  async activateInvitedMembershipsForStaff(authUserId: string): Promise<void> {
    await db
      .update(organizationMemberships)
      .set({
        status: "active",
        joinedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(organizationMemberships.userId, authUserId), eq(organizationMemberships.status, "invited")),
      );
  }

  private staffCredentialScope(organizationId: string, membershipId: string) {
    return and(
      eq(complianceDocuments.organizationId, organizationId),
      sql`(${complianceDocuments.metadata}->>'kind') = ${STAFF_CREDENTIAL_METADATA_KIND}`,
      sql`(${complianceDocuments.metadata}->>'membershipId') = ${membershipId}`,
    );
  }

  async getMemberForEdit(context: AuthContext, membershipId: string): Promise<StaffMemberForEdit | null> {
    const [row] = await db
      .select({
        membershipId: organizationMemberships.id,
        userId: organizationMemberships.userId,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        jobTitle: organizationMemberships.jobTitle,
        appRole: organizationMemberships.role,
        membershipStatus: organizationMemberships.status,
        staffEmployeeCode: organizationMemberships.staffEmployeeCode,
        capabilities: organizationMemberships.capabilities,
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(
        and(
          eq(organizationMemberships.id, membershipId),
          eq(organizationMemberships.organizationId, context.organization.id),
          ne(organizationMemberships.status, "removed"),
        ),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    const branchRows = await db
      .select({ branchId: branchStaffAssignments.branchId })
      .from(branchStaffAssignments)
      .innerJoin(branches, eq(branches.id, branchStaffAssignments.branchId))
      .where(
        and(
          eq(branchStaffAssignments.userId, row.userId),
          eq(branches.organizationId, context.organization.id),
          isNull(branchStaffAssignments.unassignedAt),
        ),
      );

    const credentialRows = await db
      .select({
        id: complianceDocuments.id,
        fileName: complianceDocuments.fileName,
        mimeType: complianceDocuments.mimeType,
        createdAt: complianceDocuments.createdAt,
      })
      .from(complianceDocuments)
      .where(this.staffCredentialScope(context.organization.id, membershipId))
      .orderBy(complianceDocuments.createdAt);

    const credentials: StaffCredentialRecord[] = credentialRows.map((c) => ({
      id: c.id,
      fileName: c.fileName,
      mimeType: c.mimeType,
      createdAt: c.createdAt,
    }));

    const roleStr = row.appRole;
    return {
      membershipId: row.membershipId,
      userId: row.userId,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      jobTitle: row.jobTitle,
      appRole: row.appRole as StaffMemberForEdit["appRole"],
      membershipStatus: row.membershipStatus,
      staffEmployeeCode: row.staffEmployeeCode,
      capabilities: normalizeStoredCapabilities(row.capabilities, roleStr),
      branchIds: branchRows.map((b) => b.branchId),
      credentials,
    };
  }

  async updateMember(
    context: AuthContext,
    membershipId: string,
    input: UpdateStaffMemberInput,
    finalBranchIds: string[],
  ): Promise<void> {
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.id, membershipId),
        eq(organizationMemberships.organizationId, context.organization.id),
        ne(organizationMemberships.status, "removed"),
      ),
    });
    if (!membership) {
      throw new Error("Staff member not found.");
    }

    const userId = membership.userId;
    const caps = mergeCapabilitiesFromInput(input.appRole, input.capabilities);
    const branchSet = new Set(finalBranchIds);

    await db.transaction(async (tx) => {
      const activeAssignments = await tx
        .select({
          id: branchStaffAssignments.id,
          branchId: branchStaffAssignments.branchId,
        })
        .from(branchStaffAssignments)
        .innerJoin(branches, eq(branches.id, branchStaffAssignments.branchId))
        .where(
          and(
            eq(branchStaffAssignments.userId, userId),
            eq(branches.organizationId, context.organization.id),
            isNull(branchStaffAssignments.unassignedAt),
          ),
        );

      for (const a of activeAssignments) {
        if (!branchSet.has(a.branchId)) {
          await tx
            .update(branchStaffAssignments)
            .set({
              unassignedAt: new Date(),
              status: "inactive",
            })
            .where(eq(branchStaffAssignments.id, a.id));
        }
      }

      for (const branchId of finalBranchIds) {
        await this.ensureBranchAssignment(
          tx,
          context.organization.id,
          userId,
          branchId,
          input.appRole,
        );
      }

      await tx
        .update(organizationMemberships)
        .set({
          role: input.appRole,
          jobTitle: input.jobTitle,
          capabilities: caps,
          updatedAt: new Date(),
        })
        .where(eq(organizationMemberships.id, membershipId));

      await tx
        .update(users)
        .set({
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    });
  }

  async listStaffCredentials(organizationId: string, membershipId: string): Promise<StaffCredentialRecord[]> {
    const rows = await db
      .select({
        id: complianceDocuments.id,
        fileName: complianceDocuments.fileName,
        mimeType: complianceDocuments.mimeType,
        createdAt: complianceDocuments.createdAt,
      })
      .from(complianceDocuments)
      .where(this.staffCredentialScope(organizationId, membershipId))
      .orderBy(complianceDocuments.createdAt);

    return rows.map((c) => ({
      id: c.id,
      fileName: c.fileName,
      mimeType: c.mimeType,
      createdAt: c.createdAt,
    }));
  }

  async countStaffCredentials(organizationId: string, membershipId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(complianceDocuments)
      .where(this.staffCredentialScope(organizationId, membershipId));
    return sqlCountToNumber(row?.value);
  }

  async findStaffCredentialDocument(
    organizationId: string,
    membershipId: string,
    documentId: string,
  ): Promise<{ id: string; storageKey: string } | null> {
    const [row] = await db
      .select({
        id: complianceDocuments.id,
        storageKey: complianceDocuments.storageKey,
      })
      .from(complianceDocuments)
      .where(and(eq(complianceDocuments.id, documentId), this.staffCredentialScope(organizationId, membershipId)))
      .limit(1);
    return row ?? null;
  }

  async insertStaffCredential(params: {
    organizationId: string;
    staffUserId: string;
    membershipId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<string> {
    const metadata = {
      kind: STAFF_CREDENTIAL_METADATA_KIND,
      membershipId: params.membershipId,
    };
    const [row] = await db
      .insert(complianceDocuments)
      .values({
        organizationId: params.organizationId,
        branchId: null,
        uploadedByUserId: params.staffUserId,
        documentType: "other",
        status: "uploaded",
        fileName: params.fileName,
        storageKey: params.storageKey,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        metadata,
      })
      .returning({ id: complianceDocuments.id });
    if (!row) {
      throw new Error("Could not save credential record.");
    }
    return row.id;
  }

  async deleteStaffCredentialDocument(
    documentId: string,
    organizationId: string,
    membershipId: string,
  ): Promise<void> {
    await db
      .delete(complianceDocuments)
      .where(
        and(eq(complianceDocuments.id, documentId), this.staffCredentialScope(organizationId, membershipId)),
      );
  }
}

export const staffRepository: StaffRepository = new StaffRepositoryImpl();
