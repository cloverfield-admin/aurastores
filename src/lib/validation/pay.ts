import { z } from "zod";

export const payPaymentMethodSchema = z.enum([
  "aura_pay_wallet",
  "card",
  "mobile_money",
  "cash",
  "insurance",
  "bank_transfer",
]);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    });

export const activateWalletSchema = z.object({
  branchId: z.string().uuid().optional(),
});

export const withdrawWalletSchema = z.object({
  branchId: z.string().uuid().optional(),
  amountCents: z.coerce.number().int().positive().max(100_000_000),
  mobileNumber: z.string().trim().min(7).max(32),
  reference: optionalText(128),
});

export type ActivateWalletInput = z.infer<typeof activateWalletSchema>;
export type WithdrawWalletInput = z.infer<typeof withdrawWalletSchema>;
