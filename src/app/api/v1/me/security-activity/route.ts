import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const items = await services.auth.listSecurityActivityForUser(gate.context.user.id);
  return NextResponse.json({ items });
}
