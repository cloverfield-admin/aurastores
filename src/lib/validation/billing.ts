import { z } from "zod";
import { zambiaLipilaMsisdnSchema } from "@/lib/validation/lipila";

export const currencySchema = z.string().trim().min(3).max(3).default("ZMW");

export const subscriptionIntervalSchema = z.enum(["monthly", "quarterly", "yearly"]);
export const subscriptionPlanCodeSchema = z.enum(["free", "basic", "pro", "enterprise"]);

export const createInvoiceSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
  interval: subscriptionIntervalSchema,
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const startIntroPaidTrialSchema = z.object({
  planCode: z.enum(["basic", "pro", "enterprise"]),
});

export type StartIntroPaidTrialInput = z.infer<typeof startIntroPaidTrialSchema>;

export const startLipilaPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
});

export type StartLipilaPaymentInput = z.infer<typeof startLipilaPaymentSchema>;

export const startLipilaMomoCollectionSchema = z.object({
  invoiceId: z.string().uuid(),
  msisdn: zambiaLipilaMsisdnSchema,
  /** Optional network hint (if Lipila requires it). */
  network: z.string().trim().min(2).max(64).optional(),
});

export type StartLipilaMomoCollectionInput = z.infer<typeof startLipilaMomoCollectionSchema>;

export const startLipilaCardCollectionSchema = z.object({
  invoiceId: z.string().uuid(),
  returnUrl: z.string().url().optional(),
});

export type StartLipilaCardCollectionInput = z.infer<typeof startLipilaCardCollectionSchema>;

export const lipilaCallbackSchema = z.object({
  referenceId: z.string().optional(),
  currency: z.string().optional(),
  amount: z.number().optional(),
  accountNumber: z.string().optional(),
  status: z.string().optional(),
  paymentType: z.string().optional(),
  type: z.string().optional(),
  ipAddress: z.string().optional(),
  identifier: z.string().optional(),
  message: z.string().optional(),
  externalId: z.string().optional(),
});

export type LipilaCallbackInput = z.infer<typeof lipilaCallbackSchema>;

export const updatePlanPriceSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
  interval: subscriptionIntervalSchema,
  currency: currencySchema,
  amountCents: z.coerce.number().int().min(0),
});

export type UpdatePlanPriceInput = z.infer<typeof updatePlanPriceSchema>;

