import { z } from "zod";

const optionalTextOrNull = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    });

const optionalBarcodeOrNull = z
  .union([z.string().trim().max(128), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    categoryName: optionalTextOrNull(120),
    barcode: optionalBarcodeOrNull,
    /** ZMW unit price (e.g. 12.50). Stored as cents in DB. */
    defaultSellingPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
    status: z.enum(["active", "discontinued"]).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.categoryName !== undefined ||
      data.barcode !== undefined ||
      data.defaultSellingPrice !== undefined ||
      data.status !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

