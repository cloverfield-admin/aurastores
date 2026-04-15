import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLipilaClient } from "@/lib/billing/lipila-client";
import { startLipilaCardCollectionSchema } from "@/lib/validation/billing";
import { services } from "@/lib/di";
import { getSiteUrl } from "@/lib/site-url";

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startLipilaCardCollectionSchema.safeParse(body);
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

  const callbackUrl = `${getSiteUrl()}/api/v1/billing/lipila/callback`;
  const returnUrl = parsed.data.returnUrl ?? `${getSiteUrl()}/dashboard/settings/billing`;

  // PCI-safe: we do not collect PAN/CVV. Expect Lipila to return a hosted checkout URL or tokenized flow data.
  const payload = {
    amount: invoice.amountCents / 100,
    currency: invoice.currency,
    identifier: invoice.identifier,
    externalId: invoice.id,
    callbackUrl,
    returnUrl,
    description: `AuraPharma subscription invoice ${invoice.identifier}`,
    type: "Collection",
    paymentMethod: "card",
  };

  try {
    const lipila = createLipilaClient();
    const result = await lipila.startCardCollection(payload);
    const referenceId = (result?.referenceId ?? result?.reference ?? result?.data?.referenceId ?? null) as string | null;
    const checkoutUrl = (result?.checkoutUrl ?? result?.url ?? result?.data?.checkoutUrl ?? null) as string | null;
    const clientSecret = (result?.clientSecret ?? result?.data?.clientSecret ?? null) as string | null;

    if (referenceId) {
      await services.billing.recordLipilaInitiation(invoice.id, {
        identifier: invoice.identifier,
        referenceId,
        externalId: String(result?.externalId ?? payload.externalId ?? ""),
        message: result?.message ?? null,
        rawPayload: result,
      });
    }

    return NextResponse.json({
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      referenceId,
      checkoutUrl,
      clientSecret,
      message: result?.message ?? "Complete the card payment to activate your plan.",
      raw: result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start card collection.";
    console.error("[billing] lipila card start failed", {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      payload,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

