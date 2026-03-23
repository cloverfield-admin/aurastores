import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const branches = await stockRepository.getBranches(context, branchId);
  return NextResponse.json(branches);
}
