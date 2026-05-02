import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionPlanPrices, subscriptionPlans } from "@/lib/db/schema";
import { updatePlanPriceSchema } from "@/lib/validation/billing";

function requireAuraStoresAdmin(role: string) {
  if (role !== "aurastores_admin") {
    throw new Error("Forbidden");
  }
}

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) return gate.response;

  try {
    requireAuraStoresAdmin(gate.context.membership.role);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      planCode: subscriptionPlans.code,
      planName: subscriptionPlans.name,
      interval: subscriptionPlanPrices.interval,
      currency: subscriptionPlanPrices.currency,
      amountCents: subscriptionPlanPrices.amountCents,
      effectiveFrom: subscriptionPlanPrices.effectiveFrom,
    })
    .from(subscriptionPlanPrices)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptionPlanPrices.planId))
    .where(and(eq(subscriptionPlanPrices.isActive, true), isNull(subscriptionPlanPrices.effectiveTo)))
    .orderBy(subscriptionPlans.sortOrder, subscriptionPlanPrices.interval, desc(subscriptionPlanPrices.effectiveFrom));

  return NextResponse.json({ prices: rows });
}

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) return gate.response;

  try {
    requireAuraStoresAdmin(gate.context.membership.role);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updatePlanPriceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.code, parsed.data.planCode),
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const current = await tx.query.subscriptionPlanPrices.findFirst({
      where: and(
        eq(subscriptionPlanPrices.planId, plan.id),
        eq(subscriptionPlanPrices.currency, parsed.data.currency),
        eq(subscriptionPlanPrices.interval, parsed.data.interval),
        eq(subscriptionPlanPrices.isActive, true),
        isNull(subscriptionPlanPrices.effectiveTo),
      ),
      orderBy: [desc(subscriptionPlanPrices.effectiveFrom)],
    });

    if (current) {
      await tx
        .update(subscriptionPlanPrices)
        .set({ isActive: false, effectiveTo: now, updatedAt: now })
        .where(eq(subscriptionPlanPrices.id, current.id));
    }

    await tx.insert(subscriptionPlanPrices).values({
      planId: plan.id,
      currency: parsed.data.currency,
      interval: parsed.data.interval,
      amountCents: parsed.data.amountCents,
      isActive: true,
      effectiveFrom: now,
      effectiveTo: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  return NextResponse.json({ ok: true });
}

