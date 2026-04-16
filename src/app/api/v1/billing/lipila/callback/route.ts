import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { services } from "@/lib/di";
import { lipilaCallbackSchema } from "@/lib/validation/billing";

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

  if (!identifier) {
    return NextResponse.json(
      { error: "Invoice identifier is required." },
      { status: 400 },
    );
  }

  const invoice = await services.billing.findInvoiceByIdentifier(identifier);

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

