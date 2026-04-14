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
