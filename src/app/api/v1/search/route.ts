import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di/services";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const result = await services.pharmacySearch.search(context, q);
  return NextResponse.json(result);
}
