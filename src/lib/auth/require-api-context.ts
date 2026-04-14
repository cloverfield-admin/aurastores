import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { assertApiCapability, assertPharmacySearchCapability } from "@/lib/rbac/api-guards";

export async function requireAppApiContext(): Promise<
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse }
> {
  const context = await getCurrentAppContext();
  if (!context) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, context };
}

export async function requireAppApiCapability(
  capability: MembershipCapability,
): Promise<{ ok: true; context: AuthContext } | { ok: false; response: NextResponse }> {
  const base = await requireAppApiContext();
  if (!base.ok) {
    return base;
  }
  const denied = assertApiCapability(base.context, capability);
  if (denied) {
    return { ok: false, response: denied };
  }
  return { ok: true, context: base.context };
}

export async function requirePharmacySearchApiContext(): Promise<
  { ok: true; context: AuthContext } | { ok: false; response: NextResponse }
> {
  const base = await requireAppApiContext();
  if (!base.ok) {
    return base;
  }
  const denied = assertPharmacySearchCapability(base.context);
  if (denied) {
    return { ok: false, response: denied };
  }
  return { ok: true, context: base.context };
}
