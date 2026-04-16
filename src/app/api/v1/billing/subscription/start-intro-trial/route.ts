import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { startIntroPaidTrialSchema } from "@/lib/validation/billing";

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startIntroPaidTrialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await services.billing.startIntroPaidTrial({
      organizationId: gate.context.organization.id,
      planCode: parsed.data.planCode,
    });
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start intro trial.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
