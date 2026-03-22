import { redirect } from "next/navigation";
import { authRepository } from "@/lib/repositories/auth.repository";
import { getCurrentSupabaseUser } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSupabaseUser();
  if (user) {
    const redirectTo = await authRepository.getPostAuthRedirect(user.id);
    redirect(redirectTo);
  }

  return (
    <div className="aura-landing relative min-h-dvh bg-[#f7f9fb] text-[#191c1e]">
      {children}
    </div>
  );
}
