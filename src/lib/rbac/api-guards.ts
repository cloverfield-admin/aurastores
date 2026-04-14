import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { hasCapability } from "@/lib/rbac/capabilities";

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function assertApiCapability(
  context: AuthContext,
  capability: MembershipCapability,
): NextResponse | null {
  if (!hasCapability(context.capabilities, capability)) {
    return forbiddenResponse();
  }
  return null;
}

/** Search mixes products, branches, and staff — allow if any relevant capability is granted. */
export function assertPharmacySearchCapability(context: AuthContext): NextResponse | null {
  const ok =
    hasCapability(context.capabilities, "stock") ||
    hasCapability(context.capabilities, "staff") ||
    hasCapability(context.capabilities, "catalog");
  if (!ok) {
    return forbiddenResponse();
  }
  return null;
}
