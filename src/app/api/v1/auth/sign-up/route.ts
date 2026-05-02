import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

/** Initial attempt plus this many retries (max 4 `signUp` calls). */
const SIGNUP_MAX_RETRIES = 3;
const SIGNUP_RETRY_DELAY_MS = 5_000;

function isRetryableSupabaseSignupError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { status?: number; message?: string; name?: string };
  const message = (maybe.message ?? "").toLowerCase();
  return (
    maybe.status === 504 ||
    message.includes("context deadline exceeded") ||
    message.includes("processing this request timed out") ||
    maybe.name === "TimeoutError"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid registration payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const confirmNext = encodeURIComponent(ROUTES.dashboard.onboarding.root);
  const emailRedirectTo = `${getSiteUrl()}/auth/callback?next=${confirmNext}`;

  let signUpResult: Awaited<ReturnType<typeof supabase.auth.signUp>> | null = null;
  for (let retry = 0; retry <= SIGNUP_MAX_RETRIES; retry++) {
    if (retry > 0) {
      await new Promise((r) => setTimeout(r, SIGNUP_RETRY_DELAY_MS));
    }
    const result = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: parsed.data.fullName,
          business_name: parsed.data.businessName,
          store_vertical: parsed.data.storeVertical,
        },
      },
    });

    signUpResult = result;
    if (!result.error) break;
    if (!isRetryableSupabaseSignupError(result.error)) break;
  }

  if (!signUpResult) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  const { data, error } = signUpResult;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data?.user) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  // Supabase can intentionally return an obfuscated user for duplicate sign-up
  // attempts when email confirmation is enabled.
  if (!data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in or reset your password." },
      { status: 409 },
    );
  }

  const context = await services.auth.createRegisteredUser({
    authUserId: data.user.id,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    businessName: parsed.data.businessName,
    storeVertical: parsed.data.storeVertical,
    isEmailVerified: Boolean(data.user.email_confirmed_at),
    selectedPlanCode: parsed.data.selectedPlanCode,
  });

  const emailVerified = Boolean(data.user.email_confirmed_at);
  if (!emailVerified && data.session) {
    await supabase.auth.signOut();
  }

  const verifyEmailUrl = `${ROUTES.auth.verifyEmail}?${new URLSearchParams({
    email: parsed.data.email,
  }).toString()}`;

  let redirectTo: string;
  if (!emailVerified) {
    redirectTo = verifyEmailUrl;
  } else if (data.session) {
    redirectTo = ROUTES.dashboard.onboarding.root;
  } else {
    redirectTo = ROUTES.auth.signIn;
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      fullName: context.user.fullName,
    },
    emailVerified,
    requiresEmailVerification: !data.session,
    redirectTo,
  });
}
