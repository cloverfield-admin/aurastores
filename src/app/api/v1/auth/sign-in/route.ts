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

  await services.auth.syncEmailVerifiedFromAuth(
    data.user.id,
    Boolean(data.user.email_confirmed_at),
  );
  await services.auth.updateLastLoginAt(data.user.id);
  const redirectTo = await services.auth.getPostAuthRedirect(data.user.id);

  return NextResponse.json({
    redirectTo,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}
