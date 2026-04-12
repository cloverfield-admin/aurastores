import { NextResponse } from "next/server";
import { ROUTES } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";

const GENERIC_MESSAGE = "If an account exists for that email, we sent a new confirmation link.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const confirmNext = encodeURIComponent(ROUTES.dashboard.onboarding.root);
  const emailRedirectTo = `${getSiteUrl()}/auth/callback?next=${confirmNext}`;

  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo },
  });

  return NextResponse.json({ ok: true as const, message: GENERIC_MESSAGE });
}
