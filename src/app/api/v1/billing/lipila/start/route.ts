import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { startLipilaPaymentSchema } from "@/lib/validation/billing";

function formatMoneyZmw(amountCents: number) {
  return (amountCents / 100).toFixed(2).replace(/\.00$/, "");
}

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startLipilaPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
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

  const tillNumber = process.env.LIPILA_TILL_NUMBER;
  if (!tillNumber) {
    return NextResponse.json({ error: "Lipila till number is not configured." }, { status: 500 });
  }

  const amount = formatMoneyZmw(invoice.amountCents);
  const ussdDial = `*488*${tillNumber}*${amount}#`;

  return NextResponse.json({
    invoiceId: invoice.id,
    identifier: invoice.identifier,
    currency: invoice.currency,
    amountCents: invoice.amountCents,
    ussdDial,
    instructions: `Dial ${ussdDial} to pay.`,
  });
}

