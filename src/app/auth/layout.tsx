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

  // Pages that must render even for a SIGNED-IN user.
  //
  // This layout bounces authenticated users to getPostAuthRedirect(). The last two
  // below are where that function SENDS people — they exist to explain to someone
  // who is signed in why they can't get anywhere. Redirecting them away would land
  // them right back here, forever: /auth/web-admin-only → layout → redirect →
  // /auth/web-admin-only → … Any future page that getPostAuthRedirect can return
  // must be added here too.
  const allowAuthenticatedShell =
    pathname === ROUTES.auth.recovery ||
    pathname === ROUTES.auth.updatePassword ||
    pathname === ROUTES.auth.verifyEmail ||
    pathname === ROUTES.auth.webAdminOnly ||
    pathname === ROUTES.auth.accountDisabled;

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
