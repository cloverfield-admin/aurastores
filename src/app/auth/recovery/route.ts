import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PKCE exchange entry for password-reset emails only. Always continues to
 * {@link ROUTES.auth.updatePassword} so we do not rely on a `next` query param
 * (Supabase often drops custom params when appending `code`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const signInWithError = new URL(ROUTES.auth.signIn, url.origin);
  signInWithError.searchParams.set("auth_error", "1");

  if (!code) {
    return NextResponse.redirect(signInWithError);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(signInWithError);
  }

  await services.auth.syncEmailVerifiedFromAuth(
    data.user.id,
    Boolean(data.user.email_confirmed_at),
  );
  await services.auth.updateLastLoginAt(data.user.id);

  return NextResponse.redirect(new URL(ROUTES.auth.updatePassword, url.origin));
}
