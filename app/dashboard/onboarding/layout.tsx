import { redirect } from "next/navigation";
import { authRepository } from "@/lib/repositories/auth.repository";
import { requireSupabaseUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { OnboardingProgressProvider } from "@/components/onboarding/onboarding-progress-provider";
import { OnboardingRouteGuard } from "@/components/onboarding/onboarding-route-guard";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSupabaseUser();
  const redirectTo = await authRepository.getPostAuthRedirect(user.id);

  if (redirectTo === ROUTES.dashboard.main) {
    redirect(redirectTo);
  }

  return (
    <OnboardingProgressProvider>
      <OnboardingRouteGuard>{children}</OnboardingRouteGuard>
    </OnboardingProgressProvider>
  );
}
