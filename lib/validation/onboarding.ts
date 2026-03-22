import { z } from "zod";

export const hoursModeSchema = z.enum(["24-7", "custom"]);

export const identitySchema = z.object({
  legalName: z.string().trim().min(2).max(200),
  taxId: z.string().trim().min(2).max(64),
  phone: z.string().trim().min(7).max(32),
  street: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(128),
  state: z.string().trim().min(2).max(128),
  zip: z.string().trim().min(2).max(32),
});

export const pharmacyDetailsSchema = z.object({
  branchName: z.string().trim().min(2).max(160),
  pharmacistCount: z.coerce.number().int().min(1).max(1000),
  branchLocation: z.string().trim().min(3).max(255),
  hoursMode: hoursModeSchema,
});

export type IdentityInput = z.infer<typeof identitySchema>;
export type PharmacyDetailsInput = z.infer<typeof pharmacyDetailsSchema>;
export type HoursMode = z.infer<typeof hoursModeSchema>;
