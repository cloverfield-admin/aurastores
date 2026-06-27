import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

type RouteContext = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("pay");
  if (!gate.ok) {
    return gate.response;
  }

  const { paymentId } = await context.params;
  const detail = await services.pay.getTransactionDetail(gate.context, paymentId);
  if (!detail) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("pay");
  if (!gate.ok) {
    return gate.response;
  }

  const { paymentId } = await context.params;
  const detail = await services.pay.getTransactionDetail(gate.context, paymentId);
  if (!detail) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  try {
    const result = await services.sales.deleteSale(gate.context, detail.sale.id);
    return NextResponse.json({
      id: paymentId,
      saleId: result.id,
      saleNumber: result.saleNumber,
      restoredItemCount: result.restoredItemCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete transaction.";
    const status = message === "Sale not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
