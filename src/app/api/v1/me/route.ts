import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_USER_PREFERENCES, patchMeSchema } from "@/lib/validation/me";

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }
  const { capabilities, allowedBranchIds, membership, user } = gate.context;
  const preferences = { ...DEFAULT_USER_PREFERENCES, ...(user.preferences ?? {}) };
  const avatarUrl = user.avatarStorageKey ? getUserAvatarPublicUrl(user.avatarStorageKey) : null;

  return NextResponse.json({
    capabilities,
    allowedBranchIds,
    role: membership.role,
    fullName: user.fullName,
    phone: user.phone ?? null,
    email: user.email,
    preferences,
    avatarUrl,
    avatarStorageKey: user.avatarStorageKey ?? null,
  });
}

export async function PATCH(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = patchMeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { fullName, theme, emailAlerts, smsAlerts, pushNotifications } = parsed.data;
  const prefPatch = {
    ...(theme !== undefined ? { theme } : {}),
    ...(emailAlerts !== undefined ? { emailAlerts } : {}),
    ...(smsAlerts !== undefined ? { smsAlerts } : {}),
    ...(pushNotifications !== undefined ? { pushNotifications } : {}),
  };
  const hasPrefs = Object.keys(prefPatch).length > 0;

  try {
    if (fullName !== undefined) {
      await services.auth.updateUserFullName(gate.context.user.id, fullName);
      const supabase = await createSupabaseServerClient();
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (metaError) {
        return NextResponse.json({ error: metaError.message }, { status: 400 });
      }
    }

    if (hasPrefs) {
      await services.auth.updateUserPreferences(gate.context.user.id, prefPatch);
    }

    const refreshed = await services.auth.findByAuthUserId(gate.context.user.id);
    if (!refreshed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      ...(refreshed.user.preferences ?? {}),
    };

    return NextResponse.json({
      ok: true as const,
      fullName: refreshed.user.fullName,
      preferences,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
