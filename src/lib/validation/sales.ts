import { z } from "zod";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    });

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  batchId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  unitPrice: z.coerce.number().positive().max(10_000_000),
  description: optionalText(200),
});

export const createSaleSchema = z.object({
  branchId: z.string().uuid().optional(),
  customerName: optionalText(160),
  patientCode: optionalText(32),
  mobile: optionalText(32),
  paymentMethod: z.enum(["aura-pay", "card", "mobile-money", "cash", "insurance", "bank-transfer"]).default("cash"),
  paymentReference: optionalText(128),
  discountCode: optionalText(64),
  notes: optionalText(1_000),
  status: z.enum(["draft", "completed"]).default("completed"),
  items: z.array(saleItemSchema).min(1).max(100),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const startSaleMobileMoneySchema = z.object({
  sale: createSaleSchema.omit({ status: true, paymentMethod: true, paymentReference: true }).extend({
    status: z.literal("completed").optional(),
    paymentMethod: z.literal("mobile-money").optional(),
  }),
  mobileMoneyNumber: z.string().trim().min(7).max(32),
  customerPaysLipilaFee: z.boolean().optional().default(false),
});

export type StartSaleMobileMoneyInput = z.infer<typeof startSaleMobileMoneySchema>;
