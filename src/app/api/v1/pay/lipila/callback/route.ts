import { NextResponse } from "next/server";
import { processLipilaPaymentCallback } from "@/lib/lipila/payment-processing";
import { hasValidLipilaCallbackToken, unwrapLipilaCallbackPayload } from "@/lib/lipila/utils";
import { lipilaPaymentCallbackSchema } from "@/lib/validation/lipila";

export async function POST(request: Request) {
  if (!hasValidLipilaCallbackToken(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = lipilaPaymentCallbackSchema.safeParse(unwrapLipilaCallbackPayload(body));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid callback payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const transaction = await processLipilaPaymentCallback(parsed.data);
    return NextResponse.json({
      ok: true,
      referenceId: transaction.referenceId,
      status: transaction.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process callback." },
      { status: 400 },
    );
  }
}
