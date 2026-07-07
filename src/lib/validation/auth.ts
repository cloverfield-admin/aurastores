import { z } from "zod";

const normalizedEmail = z.string().trim().email().transform((value) => value.toLowerCase());

export const signInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8),
  remember: z.boolean().optional().default(false),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  // Optional: the mobile app collects the business/store name during
  // onboarding (step 2), not at account creation. When omitted, sign-up
  // provisions the org with a placeholder name that onboarding overwrites.
  businessName: z.string().trim().min(2).max(160).optional(),
  storeVertical: z.enum(["pharmacy", "general_retail"]).optional().default("pharmacy"),
  email: normalizedEmail,
  password: z.string().min(8).max(128),
  selectedPlanCode: z.enum(["basic", "pro", "enterprise"]).optional(),
});

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8).max(128),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
