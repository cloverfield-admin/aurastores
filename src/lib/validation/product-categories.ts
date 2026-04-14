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

export const listProductCategoriesSchema = z.object({
  includeArchived: z
    .union([z.literal("1"), z.literal("0")])
    .optional()
    .transform((value) => value === "1"),
  page: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "1", 10);
      return Number.isFinite(parsed) ? parsed : 1;
    }),
  pageSize: z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "10", 10);
      return Number.isFinite(parsed) ? parsed : 10;
    }),
});

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
});

export const updateProductCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;

