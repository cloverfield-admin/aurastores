import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("insights");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || undefined;

  try {
    const data = await services.insights.getOverview(context, { branchId: branch });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load insights overview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

