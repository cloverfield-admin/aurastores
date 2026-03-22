import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { onboardingRepository } from "@/lib/repositories/onboarding.repository";

export async function GET() {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const onboarding = await onboardingRepository.getCurrent(authUser.id);
  if (!onboarding) {
    return NextResponse.json({ error: "Onboarding context not found." }, { status: 404 });
  }

  return NextResponse.json(onboarding);
}
