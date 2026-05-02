import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const branches = await services.stock.getBranches(context, branchId);
  return NextResponse.json(branches);
}
