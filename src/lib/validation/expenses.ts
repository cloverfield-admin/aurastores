import { z } from "zod";

export const expenseTypeSchema = z.enum(["general", "restocking", "charge"]);

export const createExpenseSchema = z.object({
  branchId: z.string().uuid().optional(),
  expenseType: z.enum(["general", "restocking"]),
  amountCents: z.coerce.number().int().positive().max(10_000_000_000),
  currency: z.string().trim().length(3).optional().default("ZMW"),
  description: z.string().trim().min(2).max(1_000),
  expenseDate: z
    .string()
    .trim()
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Use YYYY-MM-DD.")
    .transform((value) => {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const expenseIdParamSchema = z.object({
  expenseId: z.string().uuid(),
});

