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
