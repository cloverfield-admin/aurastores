import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEphemeralSupabaseAuthClient } from "@/lib/supabase/ephemeral-auth-client";
import { changePasswordSchema } from "@/lib/validation/me";

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password." },
      { status: 400 },
    );
  }

  const emailNormalized = gate.context.user.email.trim().toLowerCase();
  const ephemeral = createEphemeralSupabaseAuthClient();
  const { error: verifyError } = await ephemeral.auth.signInWithPassword({
    email: emailNormalized,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true as const });
}
