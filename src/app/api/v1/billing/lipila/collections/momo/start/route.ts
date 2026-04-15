import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLipilaClient } from "@/lib/billing/lipila-client";
import { startLipilaMomoCollectionSchema } from "@/lib/validation/billing";
import { services } from "@/lib/di";
import { getSiteUrl } from "@/lib/site-url";

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startLipilaMomoCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await db.query.subscriptionInvoices.findFirst({
    where: eq(subscriptionInvoices.id, parsed.data.invoiceId),
  });
  if (!invoice || invoice.organizationId !== gate.context.organization.id) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid." }, { status: 400 });
  }

  // Use canonical origin for callbacks.
  const callbackUrl = `${getSiteUrl()}/api/v1/billing/lipila/callback`;

  // Payload per Lipila MoMo Collections docs:
  // https://docs.lipila.dev/docs/collections/momocollections.html
  const referenceId = `ap_${invoice.identifier}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    referenceId,
    amount: invoice.amountCents / 100,
    narration: `AuraPharma subscription invoice ${invoice.identifier}`,
    accountNumber: parsed.data.msisdn,
    currency: invoice.currency,
    email: gate.context.user.email,
  };

  try {
    const lipila = createLipilaClient();
    console.info("[billing] lipila momo start", {
      endpoint: process.env.LIPILA_MOMO_COLLECTIONS_PATH,
      baseUrl: process.env.LIPILA_BASE_URL,
      apiKeyHint: (process.env.LIPILA_API_KEY ?? "").slice(-4),
      callbackUrl,
      payload,
    });
    const result = await lipila.startMobileMoneyCollection(payload, { callbackUrl });
    const returnedReferenceId = (result?.referenceId ?? payload.referenceId ?? null) as string | null;

    if (returnedReferenceId) {
      await services.billing.recordLipilaInitiation(invoice.id, {
        identifier: invoice.identifier,
        referenceId: returnedReferenceId,
        externalId: invoice.id,
        message: result?.message ?? null,
        rawPayload: result,
      });
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      referenceId: returnedReferenceId,
      status: result?.status ?? "Pending",
      message: result?.message ?? "Approve the payment prompt on the customer’s phone.",
      raw: result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start mobile money collection.";
    console.error("[billing] lipila momo start failed", {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      baseUrl: process.env.LIPILA_BASE_URL,
      endpoint: process.env.LIPILA_MOMO_COLLECTIONS_PATH,
      apiKeyHint: (process.env.LIPILA_API_KEY ?? "").slice(-4),
      callbackUrl,
      payload,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

