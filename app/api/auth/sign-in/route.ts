import { NextResponse } from "next/server";
import { authRepository } from "@/lib/repositories/auth.repository";
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

  await authRepository.updateLastLoginAt(data.user.id);
  const redirectTo = await authRepository.getPostAuthRedirect(data.user.id);

  return NextResponse.json({
    redirectTo,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}
