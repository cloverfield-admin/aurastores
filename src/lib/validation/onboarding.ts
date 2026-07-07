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

const hhMmRegex = /^\d{2}:\d{2}$/;

export const weeklyHourEntrySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: z.string().regex(hhMmRegex).nullable(),
  closesAt: z.string().regex(hhMmRegex).nullable(),
});

export const locationDetailsSchema = z
  .object({
    branchName: z.string().trim().min(2).max(160),
    // Optional: the simplified mobile onboarding no longer asks for a
    // pharmacist count or operating hours. Defaults to 1 on the branch.
    pharmacistCount: z.coerce.number().int().min(1).max(1000).optional(),
    branchLocation: z.string().trim().min(3).max(255),
    // Optional: when omitted, existing operating hours are left untouched.
    hoursMode: hoursModeSchema.optional(),
    weeklyHours: z.array(weeklyHourEntrySchema).length(7).optional(),
    latitude: z.number().finite().gte(-90).lte(90).nullable().optional(),
    longitude: z.number().finite().gte(-180).lte(180).nullable().optional(),
    // Optional store-profile fields the mobile onboarding sets alongside the
    // branch (business name → org display/legal name; store type → vertical),
    // since Create Account no longer collects them. Web onboarding omits both.
    businessName: z.string().trim().min(2).max(160).optional(),
    storeVertical: z.enum(["pharmacy", "general_retail"]).optional(),
  })
  .superRefine((data, ctx) => {
    const latSet = data.latitude != null && Number.isFinite(data.latitude);
    const lngSet = data.longitude != null && Number.isFinite(data.longitude);
    if (latSet !== lngSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Latitude and longitude must both be provided together.",
        path: latSet ? ["longitude"] : ["latitude"],
      });
    }

    if (data.hoursMode !== "custom") {
      return;
    }
    const weekly = data.weeklyHours;
    if (!weekly || weekly.length !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom hours require exactly 7 days.",
        path: ["weeklyHours"],
      });
      return;
    }
    const days = new Set(weekly.map((w) => w.dayOfWeek));
    if (days.size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each day of week (0–6) must appear exactly once.",
        path: ["weeklyHours"],
      });
      return;
    }
    for (let i = 0; i < weekly.length; i++) {
      const row = weekly[i];
      if (row.isClosed) {
        if (row.opensAt !== null || row.closesAt !== null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Closed days must not include open or close times.",
            path: ["weeklyHours", i],
          });
        }
        continue;
      }
      if (!row.opensAt || !row.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Open days require open and close times.",
          path: ["weeklyHours", i],
        });
        continue;
      }
      if (row.opensAt >= row.closesAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Open time must be before close time.",
          path: ["weeklyHours", i],
        });
      }
    }
  });

export type IdentityInput = z.infer<typeof identitySchema>;
export type WeeklyHourEntryInput = z.infer<typeof weeklyHourEntrySchema>;
export type LocationDetailsInput = z.infer<typeof locationDetailsSchema>;
/** @deprecated Use `LocationDetailsInput`. */
export type PharmacyDetailsInput = LocationDetailsInput;
export type HoursMode = z.infer<typeof hoursModeSchema>;
