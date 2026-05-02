import { NextResponse } from "next/server";
import { requireWorkspaceSearchApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di/services";

export async function GET(request: Request) {
  const gate = await requireWorkspaceSearchApiContext();
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const result = await services.workspaceSearch.search(context, q);
  return NextResponse.json(result);
}
