import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { onboardingRepository } from "@/lib/repositories/onboarding.repository";
import { pharmacyDetailsSchema } from "@/lib/validation/onboarding";

export async function PATCH(request: Request) {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = pharmacyDetailsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid branch setup payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const onboarding = await onboardingRepository.savePharmacyDetails(authUser.id, parsed.data);
  return NextResponse.json(onboarding);
}
