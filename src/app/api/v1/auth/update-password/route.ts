import { NextResponse } from "next/server";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updatePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid password.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await services.staff.activateInvitedMembershipsForStaff(user.id);

  const redirectTo = await services.auth.getPostAuthRedirect(user.id);

  return NextResponse.json({ ok: true as const, redirectTo });
}
