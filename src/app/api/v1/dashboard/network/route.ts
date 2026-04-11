import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";

export async function GET() {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await services.network.getDashboard(context);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load network dashboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
