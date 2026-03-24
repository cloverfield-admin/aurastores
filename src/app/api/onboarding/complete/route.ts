import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";

export async function POST() {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const onboarding = await services.onboarding.complete(authUser.id);
    return NextResponse.json({
      onboarding,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not complete onboarding.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
