import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { patchOrganizationSettingsSchema } from "@/lib/validation/organization";
import { eq } from "drizzle-orm";

export async function GET() {
  const gate = await requireAppApiCapability("organization");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  try {
    const data = await services.network.getOrganizationBranches(context);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load organization branches.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const gate = await requireAppApiCapability("organization");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = patchOrganizationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const nextEnabled = parsed.data.salesTaxEnabled;
  const nextRateBps = nextEnabled ? (parsed.data.salesTaxRateBps ?? context.organization.salesTaxRateBps ?? 0) : 0;

  const [updated] = await db
    .update(organizations)
    .set({
      salesTaxEnabled: nextEnabled,
      salesTaxRateBps: nextRateBps,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, context.organization.id))
    .returning({
      salesTaxEnabled: organizations.salesTaxEnabled,
      salesTaxRateBps: organizations.salesTaxRateBps,
    });

  return NextResponse.json({
    salesTax: { enabled: updated?.salesTaxEnabled ?? nextEnabled, rateBps: updated?.salesTaxRateBps ?? nextRateBps },
  });
}
