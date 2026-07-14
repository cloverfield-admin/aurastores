import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid sign-in payload.",
        issues: parsed.error.flatten(),
      },
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
        error: "Please verify your email before signing in. Check your inbox for the confirmation link.",
        code: "EMAIL_NOT_VERIFIED" as const,
      },
      { status: 403 },
    );
  }

  // The web app is the PLATFORM CONSOLE. Store owners and staff run their business
  // from the mobile app (which authenticates against the Go engine, not this route),
  // so a correct password from a non-admin is still not a way in here.
  //
  // The session is torn down immediately rather than left dangling: a valid cookie
  // for someone who can reach nothing is just a loose end.
  const isPlatformAdmin = await services.auth.isPlatformAdmin(data.user.id);
  if (!isPlatformAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error:
          "The AuraStores web app is for platform staff. Store owners and staff should use the AuraStores mobile app.",
        code: "WEB_ADMIN_ONLY" as const,
      },
      { status: 403 },
    );
  }

  await services.auth.syncEmailVerifiedFromAuth(
    data.user.id,
    Boolean(data.user.email_confirmed_at),
  );
  await services.auth.updateLastLoginAt(data.user.id);

  // getPostAuthRedirect resolves the auth context, which THROWS for a disabled
  // account — it catches that itself and returns the account-disabled page, so a
  // disabled admin gets an explanation instead of a 500.
  const redirectTo = await services.auth.getPostAuthRedirect(data.user.id);

  return NextResponse.json({
    redirectTo,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}
