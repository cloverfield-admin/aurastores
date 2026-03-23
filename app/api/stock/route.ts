import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") || undefined;
  const search = url.searchParams.get("search") ?? "";
  const view = url.searchParams.get("view") === "expiring" ? "expiring" : "all";
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");

  const dashboard = await stockRepository.getDashboard(context, {
    branchId,
    search,
    view,
    page,
    pageSize,
  });
  return NextResponse.json(dashboard);
}
