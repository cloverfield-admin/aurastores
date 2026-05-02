import { NextResponse } from "next/server";
import { services } from "@/lib/di";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency") ?? "ZMW";
  const plans = await services.billing.listPublicPlans(currency);
  return NextResponse.json({ currency, plans });
}

