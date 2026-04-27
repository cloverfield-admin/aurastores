import { z } from "zod";

export const lipilaPaymentCallbackSchema = z.object({
  referenceId: z.string().trim().min(1).max(128).optional(),
  currency: z.string().trim().max(8).optional(),
  amount: z.number().optional(),
  accountNumber: z.string().trim().max(64).optional(),
  status: z.string().trim().max(64).optional(),
  paymentType: z.string().trim().max(128).optional(),
  type: z.string().trim().max(128).optional(),
  ipAddress: z.string().trim().max(128).optional(),
  identifier: z.string().trim().max(128).optional(),
  message: z.string().trim().max(1_000).optional(),
  externalId: z.string().trim().max(128).optional(),
});

export type LipilaPaymentCallbackInput = z.infer<typeof lipilaPaymentCallbackSchema>;

export function normalizeLipilaStatus(status: string | null | undefined): "pending" | "successful" | "failed" {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "successful" || normalized === "success") {
    return "successful";
  }
  if (normalized === "failed" || normalized === "failure" || normalized === "cancelled" || normalized === "canceled") {
    return "failed";
  }
  return "pending";
}
