import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_PATHNAME_HEADER } from "@/lib/auth/safe-redirect";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get(AUTH_PATHNAME_HEADER) ?? "";
  const allowAuthenticatedShell =
    pathname === ROUTES.auth.recovery ||
    pathname === ROUTES.auth.updatePassword ||
    pathname === ROUTES.auth.verifyEmail;

  const user = await getCurrentSupabaseUser();
  if (user && !allowAuthenticatedShell) {
    const redirectTo = await services.auth.getPostAuthRedirect(user.id);
    redirect(redirectTo);
  }

  return (
    <div className="aura-landing relative min-h-dvh bg-[var(--app-canvas)] text-[var(--app-text)]">
      {children}
    </div>
  );
}
