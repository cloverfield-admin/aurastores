import { redirect } from "next/navigation";
import { services } from "@/lib/di";
import { getCurrentSupabaseUser } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSupabaseUser();
  if (user) {
    const redirectTo = await services.auth.getPostAuthRedirect(user.id);
    redirect(redirectTo);
  }

  return (
    <div className="aura-landing relative min-h-dvh bg-[#f7f9fb] text-[#191c1e]">
      {children}
    </div>
  );
}
