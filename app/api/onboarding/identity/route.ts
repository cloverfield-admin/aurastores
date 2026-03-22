import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { onboardingRepository } from "@/lib/repositories/onboarding.repository";
import { identitySchema } from "@/lib/validation/onboarding";

export async function PATCH(request: Request) {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = identitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid identity payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const onboarding = await onboardingRepository.saveIdentity(authUser.id, parsed.data);
  return NextResponse.json(onboarding);
}
