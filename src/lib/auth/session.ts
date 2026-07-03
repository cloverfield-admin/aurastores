import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { services } from "@/lib/di";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolves the current Supabase user.
 *
 * Web requests carry the session in the Supabase SSR cookie. Native clients
 * (the mobile app) instead present `Authorization: Bearer <access-token>`;
 * when that header is present we validate the JWT against GoTrue and use it,
 * falling back to the cookie session otherwise. Every API gate funnels through
 * this function, so this is the single place mobile auth needs to be honoured.
 */
export async function getCurrentSupabaseUser() {
  const supabase = await createSupabaseServerClient();

  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        return user;
      }
    }
  }

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
