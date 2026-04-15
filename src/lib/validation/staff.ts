import { z } from "zod";

export const appRoleSchema = z.enum(["owner", "admin", "manager", "pharmacist", "cashier", "analyst"]);

const membershipCapabilitiesSchema = z
  .object({
    stock: z.boolean().optional(),
    sales: z.boolean().optional(),
    insights: z.boolean().optional(),
    catalog: z.boolean().optional(),
    staff: z.boolean().optional(),
    pay: z.boolean().optional(),
    organization: z.boolean().optional(),
    /** @deprecated Renamed to `organization`; accepted for older clients. */
    settings: z.boolean().optional(),
  })
  .strict()
  .transform((v) => {
    if (!v) {
      return undefined;
    }
    const { settings: legacy, ...rest } = v;
    if (typeof legacy === "boolean" && rest.organization === undefined) {
      return { ...rest, organization: legacy };
    }
    return rest;
  })
  .optional();

const addStaffByEmailBaseSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(32).nullable().optional(),
  jobTitle: z.string().max(128).nullable().optional(),
  appRole: appRoleSchema,
  /** When omitted, server derives defaults from `appRole`. */
  capabilities: membershipCapabilitiesSchema,
  /** Prefer this; at least one branch required after merge with `branchId`. */
  branchIds: z.array(z.string().uuid()).optional(),
  /** @deprecated Use `branchIds`; if set without `branchIds`, treated as a single branch. */
  branchId: z.string().uuid().nullable().optional(),
});

export const addStaffByEmailSchema = addStaffByEmailBaseSchema
  .transform((data) => {
    const branchIds =
      data.branchIds && data.branchIds.length > 0
        ? [...new Set(data.branchIds)]
        : data.branchId
          ? [data.branchId]
          : [];
    const { branchId: _b, branchIds: _ids, ...rest } = data;
    return { ...rest, branchIds };
  })
  .pipe(
    z.object({
      email: z.string().email(),
      fullName: z.string().min(1).max(200),
      phone: z.string().max(32).nullable().optional(),
      jobTitle: z.string().max(128).nullable().optional(),
      appRole: appRoleSchema,
      capabilities: membershipCapabilitiesSchema,
      branchIds: z.array(z.string().uuid()).min(1, "Select at least one branch."),
    }),
  );

/** PATCH body: no `email` field; `.strict()` rejects if client sends it. */
export const updateStaffMemberSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    phone: z
      .union([z.string().max(32), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    jobTitle: z
      .union([z.string().max(128), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    appRole: appRoleSchema,
    capabilities: membershipCapabilitiesSchema,
    branchIds: z.array(z.string().uuid()).min(1, "Select at least one branch."),
  })
  .strict();

export type UpdateStaffMemberPayload = z.infer<typeof updateStaffMemberSchema>;

export const listStaffDirectorySchema = z.object({
  q: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "1", 10);
      return Number.isFinite(parsed) ? parsed : 1;
    }),
  pageSize: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "10", 10);
      return Number.isFinite(parsed) ? parsed : 10;
    }),
});

export type AddStaffByEmailPayload = z.infer<typeof addStaffByEmailSchema>;

export const staffMembershipIdParamSchema = z.object({
  membershipId: z.string().uuid(),
});

export const staffCredentialDocumentIdParamSchema = z.object({
  membershipId: z.string().uuid(),
  documentId: z.string().uuid(),
});
