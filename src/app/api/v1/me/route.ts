import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }
  const { capabilities, allowedBranchIds, membership, user } = gate.context;
  return NextResponse.json({
    capabilities,
    allowedBranchIds,
    role: membership.role,
    fullName: user.fullName,
  });
}
