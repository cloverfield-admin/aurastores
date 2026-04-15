import { z } from "zod";

export const patchOrganizationSettingsSchema = z.object({
  salesTaxEnabled: z.coerce.boolean(),
  /** Basis points (e.g. 1600 = 16.00%). Ignored when disabled. */
  salesTaxRateBps: z.coerce.number().int().min(0).max(10_000).optional(),
});

export type PatchOrganizationSettingsInput = z.infer<typeof patchOrganizationSettingsSchema>;

