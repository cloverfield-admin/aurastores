import { z } from "zod";

const normalizedEmail = z.string().trim().email().transform((value) => value.toLowerCase());

export const signInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8),
  remember: z.boolean().optional().default(false),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  pharmacyName: z.string().trim().min(2).max(160),
  email: normalizedEmail,
  password: z.string().min(8).max(128),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
