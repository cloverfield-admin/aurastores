import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireSupabaseUser() {
  const user = await getCurrentSupabaseUser();
  if (!user) {
    redirect(ROUTES.auth.signIn);
  }
  return user;
}

export async function getCurrentAppContext() {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return null;
  }
  return services.auth.findByAuthUserId(authUser.id);
}

export async function requireAppContext() {
  const context = await getCurrentAppContext();
  if (!context) {
    redirect(ROUTES.auth.signIn);
  }
  return context;
}
