import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { ROUTES } from "@/lib/routes";
import { forgotPasswordSchema } from "@/lib/validation/auth";

const GENERIC_MESSAGE =
  "If an account exists for that email, you will receive password reset instructions shortly.";

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
  const redirectTo = `${getSiteUrl()}${ROUTES.auth.recovery}`;

  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  return NextResponse.json({ ok: true as const, message: GENERIC_MESSAGE });
}
