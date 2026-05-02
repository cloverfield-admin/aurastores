import { z } from "zod";

/** Lipila collections expect Zambia international format: 260 + 9 subscriber digits. */
export const LIPILA_ZAMBIA_MSISDN_RE = /^260\d{9}$/;

export function normalizeLipilaZambiaMsisdn(raw: string): string {
  return raw.trim().replace(/^\+/, "").replace(/[\s-]/g, "");
}

export const zambiaLipilaMsisdnSchema = z
  .string()
  .transform((value) => normalizeLipilaZambiaMsisdn(value))
  .pipe(
    z
      .string()
      .regex(LIPILA_ZAMBIA_MSISDN_RE, "Invalid phone number format. Use 260XXXXXXXXX (12 digits)."),
  );

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
