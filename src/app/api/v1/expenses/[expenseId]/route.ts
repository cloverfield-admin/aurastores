import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { expenseIdParamSchema } from "@/lib/validation/expenses";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("pay");
  if (!gate.ok) {
    return gate.response;
  }

  const params = await context.params;
  const parsed = expenseIdParamSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid expense id." }, { status: 400 });
  }

  try {
    await services.expenses.deleteExpense(gate.context, parsed.data.expenseId);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete expense.";
    const notFound = message === "Expense not found.";
    return NextResponse.json({ error: message }, { status: notFound ? 404 : 400 });
  }
}
