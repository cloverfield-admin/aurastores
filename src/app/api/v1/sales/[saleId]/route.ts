import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET(_request: Request, context: { params: Promise<{ saleId: string }> }) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }

  const { saleId } = await context.params;
  const sale = await services.sales.getSaleById(gate.context, saleId);
  if (!sale) {
    return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  }

  return NextResponse.json(sale);
}

export async function DELETE(_request: Request, context: { params: Promise<{ saleId: string }> }) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }

  const { saleId } = await context.params;
  try {
    const result = await services.sales.deleteSale(gate.context, saleId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete sale.";
    const status = message === "Sale not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
