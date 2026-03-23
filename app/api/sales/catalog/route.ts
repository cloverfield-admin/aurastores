import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { salesRepository } from "@/lib/repositories/sales.repository";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const catalog = await salesRepository.getCatalog(context, branchId);
  return NextResponse.json(catalog);
}
