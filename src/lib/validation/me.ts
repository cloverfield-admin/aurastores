import { z } from "zod";
import type { UserPreferences } from "@/lib/db/schema";

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "light",
  emailAlerts: true,
  smsAlerts: true,
  pushNotifications: false,
};

export const userPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  emailAlerts: z.boolean(),
  smsAlerts: z.boolean(),
  pushNotifications: z.boolean(),
});

export const patchUserPreferencesSchema = userPreferencesSchema.partial();

/** PATCH /api/v1/me — preferences and/or display name. */
export const patchMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    emailAlerts: z.boolean().optional(),
    smsAlerts: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
  })
  .refine(
    (o) =>
      o.fullName !== undefined ||
      o.theme !== undefined ||
      o.emailAlerts !== undefined ||
      o.smsAlerts !== undefined ||
      o.pushNotifications !== undefined,
    { message: "No fields to update." },
  );

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type PatchUserPreferencesInput = z.infer<typeof patchUserPreferencesSchema>;
export type PatchMeInput = z.infer<typeof patchMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
