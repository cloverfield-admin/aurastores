import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { createInvoiceSchema } from "@/lib/validation/billing";
import { db } from "@/lib/db";
import { subscriptionInvoices, subscriptionPlans } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = Math.max(1, Math.min(100, Number.parseInt(limitRaw ?? "25", 10) || 25));

  const invoices = await db
    .select({
      id: subscriptionInvoices.id,
      status: subscriptionInvoices.status,
      amountCents: subscriptionInvoices.amountCents,
      currency: subscriptionInvoices.currency,
      interval: subscriptionInvoices.interval,
      identifier: subscriptionInvoices.identifier,
      dueAt: subscriptionInvoices.dueAt,
      paidAt: subscriptionInvoices.paidAt,
      createdAt: subscriptionInvoices.createdAt,
      updatedAt: subscriptionInvoices.updatedAt,
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
    })
    .from(subscriptionInvoices)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptionInvoices.planId))
    .where(eq(subscriptionInvoices.organizationId, gate.context.organization.id))
    .orderBy(desc(subscriptionInvoices.createdAt))
    .limit(limit);

  return NextResponse.json({ invoices, limit });
}

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const invoice = await services.billing.createInvoice({
      organizationId: gate.context.organization.id,
      planCode: parsed.data.planCode,
      interval: parsed.data.interval,
    });
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create invoice.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

