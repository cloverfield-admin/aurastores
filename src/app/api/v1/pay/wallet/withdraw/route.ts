import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { withdrawWalletSchema } from "@/lib/validation/pay";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("pay");
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = withdrawWalletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid withdrawal payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const wallet = await services.pay.withdraw(gate.context, parsed.data);
    return NextResponse.json({ wallet });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to request withdrawal." },
      { status: 400 },
    );
  }
}
