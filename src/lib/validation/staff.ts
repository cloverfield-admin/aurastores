import { z } from "zod";

export const appRoleSchema = z.enum(["owner", "admin", "manager", "pharmacist", "cashier", "analyst"]);

export const addStaffByEmailSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(32).nullable().optional(),
  jobTitle: z.string().max(128).nullable().optional(),
  appRole: appRoleSchema,
  branchId: z.string().uuid().nullable().optional(),
});

export type AddStaffByEmailPayload = z.infer<typeof addStaffByEmailSchema>;
