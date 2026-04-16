import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices, subscriptionPlans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const { id } = await params;

  const invoice = await db
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
    .where(and(eq(subscriptionInvoices.organizationId, gate.context.organization.id), eq(subscriptionInvoices.id, id)))
    .limit(1);

  const row = invoice[0] ?? null;
  if (!row) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({ invoice: row });
}

