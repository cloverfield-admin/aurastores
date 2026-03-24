import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

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
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        pharmacy_name: parsed.data.pharmacyName,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
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
    pharmacyName: parsed.data.pharmacyName,
    isEmailVerified: Boolean(data.user.email_confirmed_at),
  });

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email,
      fullName: context.user.fullName,
    },
    requiresEmailVerification: !data.session,
    redirectTo: data.session ? "/dashboard/onboarding" : "/auth/sign-in",
  });
}
