import { NextResponse } from "next/server";
import { parseOptionalDashboardDateRangeQuery } from "@/lib/api/parse-dashboard-date-range-query";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("insights");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const parsed = parseOptionalDashboardDateRangeQuery(new URL(request.url));
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const data = await services.network.getDashboard(context, parsed.range);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load network dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
