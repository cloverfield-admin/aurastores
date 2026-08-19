import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";

/**
 * Sign-in for the web billing portal (`/billing/*`).
 *
 * Separate from `/api/v1/auth/sign-in` because that route is the platform
 * console's door and refuses anyone without an `aurastores_admin` membership.
 * This one lets an organization's Store Owner or Store Manager in — and only as
 * far as billing. Apple takes a cut of in-app purchases, so paying on the web
 * has to be possible; running the store on the web still is not.
 *
 * The session it establishes is an ordinary Supabase session. What keeps a store
 * owner out of the console is the console's own gate (`/admin` checks
 * isPlatformAdmin), not the absence of a cookie.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sign-in payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to sign in with those credentials." },
      { status: 401 },
    );
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Please verify your email before signing in. Check your inbox for the confirmation link.",
        code: "EMAIL_NOT_VERIFIED" as const,
      },
      { status: 403 },
    );
  }

  // Platform staff have their own door and their own console; sending them
  // through here would hand them a store's billing page instead.
  const isPlatformAdmin = await services.auth.isPlatformAdmin(data.user.id);
  if (isPlatformAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: "Platform staff should sign in through the admin console.",
        code: "PLATFORM_ADMIN" as const,
      },
      { status: 403 },
    );
  }

  const membership = await services.auth.findBillingMembership(data.user.id);
  if (!membership) {
    // The session is torn down rather than left dangling: a valid cookie for
    // someone who can reach nothing is just a loose end.
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "Web access is for billing only — ask your Store Owner. Everything else lives in the AuraStores app.",
        code: "BILLING_ROLE_REQUIRED" as const,
      },
      { status: 403 },
    );
  }

  await services.auth.syncEmailVerifiedFromAuth(
    data.user.id,
    Boolean(data.user.email_confirmed_at),
  );
  await services.auth.updateLastLoginAt(data.user.id);

  return NextResponse.json({
    redirectTo: "/billing",
    role: membership.role,
    organization: { id: membership.organizationId, name: membership.organizationName },
    user: { id: data.user.id, email: data.user.email },
  });
}
