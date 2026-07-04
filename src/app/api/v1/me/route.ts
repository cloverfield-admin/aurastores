import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, products, sales } from "@/lib/db/schema";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { utcMonthRangeForInstant } from "@/lib/dates/utc-month-range";
import { DEFAULT_USER_PREFERENCES, patchMeSchema } from "@/lib/validation/me";

export async function GET() {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }
  const { capabilities, allowedBranchIds, membership, user, entitlements, subscription } = gate.context;
  const preferences = { ...DEFAULT_USER_PREFERENCES, ...(user.preferences ?? {}) };
  const avatarUrl = user.avatarStorageKey ? getUserAvatarPublicUrl(user.avatarStorageKey) : null;

  const { startInclusive, endExclusive } = utcMonthRangeForInstant(new Date());
  const monthStartIso = startInclusive.toISOString();
  const monthEndIso = endExclusive.toISOString();

  const [productCountRow, activeCategoryCountRow, completedSalesCountRow] = await Promise.all([
    db
      .select({ value: count() })
      .from(products)
      .where(eq(products.organizationId, gate.context.organization.id))
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.organizationId, gate.context.organization.id),
          isNull(productCategories.archivedAt),
        ),
      )
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, gate.context.organization.id),
          eq(sales.status, "completed"),
          sql`coalesce(${sales.completedAt}, ${sales.createdAt}) >= ${monthStartIso}::timestamptz`,
          sql`coalesce(${sales.completedAt}, ${sales.createdAt}) < ${monthEndIso}::timestamptz`,
        ),
      )
      .then((rows) => rows[0]),
  ]);

  return NextResponse.json({
    capabilities,
    allowedBranchIds,
    role: membership.role,
    organizationId: gate.context.organization.id,
    organizationName: gate.context.organization.name,
    fullName: user.fullName,
    phone: user.phone ?? null,
    email: user.email,
    preferences,
    avatarUrl,
    avatarStorageKey: user.avatarStorageKey ?? null,
    entitlements: {
      limits: entitlements.limits,
    },
    subscription,
    usage: {
      products: productCountRow?.value ?? 0,
      categories: activeCategoryCountRow?.value ?? 0,
      salesTransactions: completedSalesCountRow?.value ?? 0,
    },
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
