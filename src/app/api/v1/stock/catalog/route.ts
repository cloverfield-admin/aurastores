import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const includeProductsParam = url.searchParams.get("includeProducts");
  const includeProducts =
    includeProductsParam === "0" || includeProductsParam === "false" ? false : undefined;
  const catalog = await services.stock.getCatalog(context, { branchId, includeProducts });
  return NextResponse.json(catalog);
}
