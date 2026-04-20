import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { pharmacyDetailsSchema } from "@/lib/validation/onboarding";

export async function PATCH(request: Request) {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pharmacyDetailsSchema.safeParse(body);

  if (!parsed.success) {
    console.error("[onboarding.pharmacy-details] 400 invalid payload", {
      body,
      issues: parsed.error.issues,
      flattened: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: "Invalid branch setup payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const onboarding = await services.onboarding.savePharmacyDetails(authUser.id, parsed.data);
  return NextResponse.json(onboarding);
}
