import { redirect } from "next/navigation";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export default async function UpdatePasswordGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentSupabaseUser();
  if (!user) {
    redirect(ROUTES.auth.signIn);
  }

  return children;
}
