import { NextResponse } from "next/server";
import { isAccountStatusError } from "@/lib/auth/account-status";
import { getCurrentAppContext } from "@/lib/auth/session";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { assertApiCapability, assertWorkspaceSearchCapability } from "@/lib/rbac/api-guards";

export async function requireAppApiContext(): Promise<
  | { ok: true; context: AuthContext }
  | { ok: false; response: NextResponse }
> {
  let context: AuthContext | null;
  try {
    context = await getCurrentAppContext();
  } catch (error) {
    // 403 with the SAME machine code the engine returns, so a client needs only
    // one handler for "your account/store was disabled" across both backends.
    if (isAccountStatusError(error)) {
      return {
        ok: false,
        response: NextResponse.json({ error: error.message, code: error.code }, { status: 403 }),
      };
    }
    throw error;
  }
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

export async function requireWorkspaceSearchApiContext(): Promise<
  { ok: true; context: AuthContext } | { ok: false; response: NextResponse }
> {
  const base = await requireAppApiContext();
  if (!base.ok) {
    return base;
  }
  const denied = assertWorkspaceSearchCapability(base.context);
  if (denied) {
    return { ok: false, response: denied };
  }
  return { ok: true, context: base.context };
}
