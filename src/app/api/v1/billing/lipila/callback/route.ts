import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lipilaTransactions, subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { services } from "@/lib/di";
import { lipilaCallbackSchema } from "@/lib/validation/billing";

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasValidCallbackToken(request: Request): boolean {
  const expected = process.env.LIPILA_CALLBACK_TOKEN;
  if (!expected) {
    return true;
  }
  const headerToken = request.headers.get("x-lipila-callback-token")?.trim();
  if (headerToken && headerToken === expected) {
    return true;
  }
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === expected;
  }
  return false;
}

export async function POST(request: Request) {
  if (!hasValidCallbackToken(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = lipilaCallbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  const identifier = parsed.data.identifier?.trim() || null;
  const externalId = parsed.data.externalId?.trim() || null;
  const referenceId = parsed.data.referenceId?.trim() || null;

  const invoice =
    (identifier ? await services.billing.findInvoiceByIdentifier(identifier) : null) ||
    (externalId
      ? // prefer UUID invoice id; fallback to treating externalId as identifier
        (isUuidLike(externalId)
          ? await db.query.subscriptionInvoices.findFirst({
              where: eq(subscriptionInvoices.id, externalId),
            })
          : null) ||
        (await services.billing.findInvoiceByIdentifier(externalId))
      : null) ||
    (referenceId
      ? await db.query.lipilaTransactions
          .findFirst({ where: eq(lipilaTransactions.referenceIdText, referenceId) })
          .then(async (tx) => (tx ? db.query.subscriptionInvoices.findFirst({ where: eq(subscriptionInvoices.id, tx.invoiceId) }) : null))
      : null);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Idempotency: if already paid, accept and store the callback anyway.
  await services.billing.recordLipilaCallback(invoice.id, parsed.data);

  const status = parsed.data.status?.toLowerCase();
  if (status === "successful") {
    const fresh = await db.query.subscriptionInvoices.findFirst({
      where: eq(subscriptionInvoices.id, invoice.id),
    });
    if (fresh && fresh.status !== "paid") {
      const paidAt = new Date();
      await services.billing.markInvoicePaid(invoice.id, paidAt);
      await services.billing.activateOrgPlanFromInvoice(invoice.id);
    }
  } else if (status === "failed") {
    await db
      .update(subscriptionInvoices)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(subscriptionInvoices.id, invoice.id));
  }

  return NextResponse.json({ ok: true });
}

