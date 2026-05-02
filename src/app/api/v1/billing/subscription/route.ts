import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const subscription = await services.billing.getOrgSubscription(gate.context.organization.id);
  return NextResponse.json({ subscription });
}

