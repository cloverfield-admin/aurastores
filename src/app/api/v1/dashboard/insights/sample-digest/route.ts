import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { sendInsightsSampleDigestEmail } from "@/lib/mail/insights-digest-mail";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("insights");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const branchId = body && typeof body.branchId === "string" && body.branchId.trim() ? body.branchId.trim() : undefined;

  try {
    const overview = await services.insights.getOverview(context, { branchId });
    await sendInsightsSampleDigestEmail({
      to: context.user.email,
      organizationName: context.organization.displayName,
      overview,
    });
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send sample digest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

