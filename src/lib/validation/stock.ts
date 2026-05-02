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

const optionalBarcode = z
  .union([z.string().trim().max(128), z.literal("")])
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
  productBarcode: optionalBarcode,
  batchNumber: z.string().trim().min(2).max(64),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format."),
  quantityReceived: z.coerce.number().int().min(1).max(1_000_000),
  unitOrderPrice: z.coerce.number().positive().max(1_000_000),
  supplierName: optionalText(160),
  categoryName: optionalText(120),
  purchaseOrderNumber: optionalText(64),
  unitSellingPrice: z.coerce.number().nonnegative().max(1_000_000),
  notes: optionalText(1_000),
});

export const createStockBatchesSchema = z.array(createStockBatchSchema).min(1).max(50);

export const disposeStockBatchSchema = z.object({
  branchId: z.string().uuid().optional(),
  note: optionalText(500),
});

export const updateStockBatchSchema = z
  .object({
    branchId: z.string().uuid().optional(),
    batchNumber: z.string().trim().min(2).max(64).optional(),
    purchaseOrderNumber: z
      .union([z.string().trim().max(64), z.literal(""), z.null()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }),
    manufacturedAt: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format."), z.literal(""), z.null()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null || value === "") return null;
        return value;
      }),
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date format.")
      .optional(),
    unitOrderPrice: z.coerce.number().positive().max(1_000_000).optional(),
    unitSellingPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
    notes: z
      .union([z.string().trim().max(1_000), z.literal(""), z.null()])
      .optional()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }),
    status: z
      .enum(["draft", "active", "quarantined", "expired", "disposed", "depleted"])
      .optional(),
  })
  .refine(
    (data) =>
      data.batchNumber !== undefined ||
      data.purchaseOrderNumber !== undefined ||
      data.manufacturedAt !== undefined ||
      data.expiresAt !== undefined ||
      data.unitOrderPrice !== undefined ||
      data.unitSellingPrice !== undefined ||
      data.notes !== undefined ||
      data.status !== undefined,
    {
    message: "At least one field must be provided.",
    },
  );

export const stockAdjustmentSchema = z.object({
  branchId: z.string().uuid().optional(),
  batchIds: z.array(z.string().uuid()).min(1).max(100),
  quantityDelta: z.coerce.number().int().refine((value) => value !== 0, {
    message: "Quantity delta must be non-zero.",
  }),
  note: optionalText(500),
});

export type CreateStockBatchInput = z.infer<typeof createStockBatchSchema>;
export type CreateStockBatchesInput = z.infer<typeof createStockBatchesSchema>;
export type DisposeStockBatchInput = z.infer<typeof disposeStockBatchSchema>;
export type UpdateStockBatchInput = z.infer<typeof updateStockBatchSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
