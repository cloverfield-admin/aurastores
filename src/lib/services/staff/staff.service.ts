import { randomBytes } from "node:crypto";
import { sendStaffInviteCredentialsEmail } from "@/lib/mail/staff-invite-mail";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import type {
  AddStaffByEmailInput,
  StaffRepository,
  UpdateStaffMemberInput,
} from "@/lib/repositories/staff/staff.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UpdateStaffMemberPayload } from "@/lib/validation/staff";

const STAFF_CREDENTIAL_ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const STAFF_CREDENTIAL_MAX_BYTES = 10 * 1024 * 1024;

type StaffServiceDeps = {
  staff: StaffRepository;
  documentStorage: DocumentStorageRepository;
};

export type InviteStaffMemberResult =
  | { kind: "invited"; invitationId: string }
  | { kind: "added"; membershipId: string; staffEmployeeCode: string | null };

function generateTemporaryPassword(): string {
  return randomBytes(18).toString("base64url");
}

export class StaffService {
  private readonly staff: StaffRepository;
  private readonly documentStorage: DocumentStorageRepository;

  constructor(deps: StaffServiceDeps) {
    this.staff = deps.staff;
    this.documentStorage = deps.documentStorage;
  }

  private mergeBranchIdsForUpdate(
    context: AuthContext,
    currentBranchIds: string[],
    requestedBranchIds: string[],
  ): string[] {
    const uniqueRequested = [...new Set(requestedBranchIds)];
    const allowed = context.allowedBranchIds;
    if (allowed === null) {
      return uniqueRequested;
    }
    const allowedSet = new Set(allowed);
    for (const id of uniqueRequested) {
      if (!allowedSet.has(id)) {
        throw new Error("You do not have access to this branch.");
      }
    }
    const preserved = currentBranchIds.filter((id) => !allowedSet.has(id));
    return [...new Set([...preserved, ...uniqueRequested])];
  }

  listDirectory(...args: Parameters<StaffRepository["listDirectory"]>) {
    return this.staff.listDirectory(...args);
  }

  addMemberByEmail(context: AuthContext, input: AddStaffByEmailInput) {
    return this.staff.addMemberByEmail(context, input);
  }

  /**
   * Creates a pending invitation, provisions a Supabase Auth user with a random password,
   * and emails credentials via Mailgun SMTP. Metadata carries `staff_invitation_id` so the
   * first sign-in can attach the app user and membership.
   *
   * If the email is already registered in Supabase, falls back to direct org membership (existing flow).
   */
  async inviteMemberByEmail(context: AuthContext, input: AddStaffByEmailInput): Promise<InviteStaffMemberResult> {
    const emailLower = input.email.trim().toLowerCase();

    const alreadyMember = await this.staff.isEmailActiveMemberOfOrg(context.organization.id, emailLower);
    if (alreadyMember) {
      throw new Error("This user is already a member of your organization.");
    }

    const invitationId = await this.staff.createStaffInvitation(context, {
      ...input,
      email: emailLower,
    });

    const admin = createSupabaseAdminClient();
    const temporaryPassword = generateTemporaryPassword();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: emailLower,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        staff_invitation_id: invitationId,
      },
    });

    if (error || !created.user) {
      await this.staff.deleteStaffInvitation(invitationId);
      const msg = (error?.message ?? "").toLowerCase();
      if (
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("user already exists") ||
        msg.includes("duplicate")
      ) {
        const added = await this.staff.addMemberByEmail(context, {
          ...input,
          email: emailLower,
        });
        return { kind: "added", ...added };
      }
      throw new Error(error?.message ?? "Could not create account for invitee.");
    }

    try {
      await sendStaffInviteCredentialsEmail({
        to: emailLower,
        organizationName: context.organization.displayName,
        inviteeFullName: input.fullName.trim(),
        temporaryPassword,
      });
    } catch (mailError) {
      await admin.auth.admin.deleteUser(created.user.id);
      await this.staff.deleteStaffInvitation(invitationId);
      const detail = mailError instanceof Error ? mailError.message : "Unknown error";
      throw new Error(`Invitation email could not be sent (${detail}). No account was created.`);
    }

    return { kind: "invited", invitationId };
  }

  acceptStaffInvitationFromAuth(params: {
    authUserId: string;
    emailNormalized: string;
    invitationIdFromMetadata: string | null | undefined;
  }) {
    return this.staff.acceptStaffInvitationFromAuth(params);
  }

  activateInvitedMembershipsForStaff(authUserId: string) {
    return this.staff.activateInvitedMembershipsForStaff(authUserId);
  }

  getMemberForEdit(context: AuthContext, membershipId: string) {
    return this.staff.getMemberForEdit(context, membershipId);
  }

  async updateMember(context: AuthContext, membershipId: string, payload: UpdateStaffMemberPayload): Promise<void> {
    const member = await this.staff.getMemberForEdit(context, membershipId);
    if (!member) {
      throw new Error("Staff member not found.");
    }

    const finalBranchIds = this.mergeBranchIdsForUpdate(context, member.branchIds, payload.branchIds);
    if (finalBranchIds.length === 0) {
      throw new Error("Select at least one branch.");
    }

    if (payload.appRole === "pharmacist") {
      const n = await this.staff.countStaffCredentials(context.organization.id, membershipId);
      if (n < 1) {
        throw new Error("Pharmacists must have at least one credential document on file.");
      }
    }

    const input: UpdateStaffMemberInput = {
      fullName: payload.fullName,
      phone: payload.phone ?? null,
      jobTitle: payload.jobTitle ?? null,
      appRole: payload.appRole,
      branchIds: payload.branchIds,
      capabilities: payload.capabilities ?? undefined,
    };

    await this.staff.updateMember(context, membershipId, input, finalBranchIds);
  }

  async uploadStaffCredentials(context: AuthContext, membershipId: string, files: File[]): Promise<void> {
    if (!files.length) {
      throw new Error("No files uploaded.");
    }
    const member = await this.staff.getMemberForEdit(context, membershipId);
    if (!member) {
      throw new Error("Staff member not found.");
    }
    for (const file of files) {
      if (!STAFF_CREDENTIAL_ALLOWED_MIME.has(file.type)) {
        throw new Error("Only PDF, JPEG, and PNG files are allowed.");
      }
      if (file.size > STAFF_CREDENTIAL_MAX_BYTES) {
        throw new Error("Each file must be at most 10 MB.");
      }
      const uploaded = await this.documentStorage.upload({
        organizationId: context.organization.id,
        userId: member.userId,
        file,
        prefix: "staff-credential",
      });
      await this.staff.insertStaffCredential({
        organizationId: context.organization.id,
        staffUserId: member.userId,
        membershipId,
        storageKey: uploaded.storageKey,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
      });
    }
  }

  async deleteStaffCredential(context: AuthContext, membershipId: string, documentId: string): Promise<void> {
    const member = await this.staff.getMemberForEdit(context, membershipId);
    if (!member) {
      throw new Error("Staff member not found.");
    }
    if (member.appRole === "pharmacist") {
      const n = await this.staff.countStaffCredentials(context.organization.id, membershipId);
      if (n <= 1) {
        throw new Error(
          "Cannot remove the last credential while this member is a pharmacist. Change their role or upload a replacement document first.",
        );
      }
    }
    const doc = await this.staff.findStaffCredentialDocument(
      context.organization.id,
      membershipId,
      documentId,
    );
    if (!doc) {
      throw new Error("Credential not found.");
    }
    await this.documentStorage.remove(doc.storageKey);
    await this.staff.deleteStaffCredentialDocument(documentId, context.organization.id, membershipId);
  }
}
