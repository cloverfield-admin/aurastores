import { NextResponse } from "next/server";
import { safeInternalNextPath } from "@/lib/auth/safe-redirect";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");

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

  const next = safeInternalNextPath(nextRaw);
  const fallback = await services.auth.getPostAuthRedirect(data.user.id);
  const destination = next ?? fallback;

  return NextResponse.redirect(new URL(destination, url.origin));
}
