import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET() {
  const gate = await requireAppApiCapability("insights");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  try {
    const data = await services.network.getDashboard(context);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load network dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
