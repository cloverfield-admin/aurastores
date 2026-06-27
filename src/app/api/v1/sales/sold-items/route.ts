import { NextResponse } from "next/server";
import { parseOptionalDashboardDateRangeQuery } from "@/lib/api/parse-dashboard-date-range-query";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }

  const url = new URL(request.url);
  const parsed = parseOptionalDashboardDateRangeQuery(url);
  if (!parsed.ok) {
    return parsed.response;
  }

  const soldItems = await services.sales.getSoldItems(gate.context, {
    branchId: url.searchParams.get("branch") ?? undefined,
    range: parsed.range,
    page: parsePositiveInt(url.searchParams.get("page"), 1),
    pageSize: parsePositiveInt(url.searchParams.get("pageSize"), 20),
  });

  return NextResponse.json(soldItems);
}
