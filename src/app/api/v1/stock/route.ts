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
  const branchId = url.searchParams.get("branch") || undefined;
  const search = url.searchParams.get("search") ?? "";
  const view = url.searchParams.get("view") === "expiring" ? "expiring" : "all";
  const inventoryStatusParam = url.searchParams.get("inventoryStatus");
  const inventoryStatus =
    inventoryStatusParam === "out_of_stock"
      ? "out_of_stock"
      : inventoryStatusParam === "reorder_attention"
        ? "reorder_attention"
        : "all";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");

  const dashboard = await services.stock.getDashboard(context, {
    branchId,
    search,
    view,
    inventoryStatus,
    page,
    pageSize,
  });
  return NextResponse.json(dashboard);
}
