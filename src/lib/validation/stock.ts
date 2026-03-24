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

export const createStockBatchSchema = z.object({
  branchId: z.string().uuid().optional(),
  productName: z.string().trim().min(2).max(200),
  batchNumber: z.string().trim().min(2).max(64),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format."),
  quantityReceived: z.coerce.number().int().min(1).max(1_000_000),
  unitCost: z.coerce.number().positive().max(1_000_000),
  supplierName: optionalText(160),
  categoryName: optionalText(120),
  purchaseOrderNumber: optionalText(64),
  unitSalePrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
  notes: optionalText(1_000),
});

export const disposeStockBatchSchema = z.object({
  branchId: z.string().uuid().optional(),
  note: optionalText(500),
});

export const stockAdjustmentSchema = z.object({
  branchId: z.string().uuid().optional(),
  batchIds: z.array(z.string().uuid()).min(1).max(100),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, {
    message: "Quantity delta must be non-zero.",
  }),
  note: optionalText(500),
});

export type CreateStockBatchInput = z.infer<typeof createStockBatchSchema>;
export type DisposeStockBatchInput = z.infer<typeof disposeStockBatchSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
