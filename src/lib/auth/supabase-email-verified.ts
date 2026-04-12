import type { User } from "@supabase/supabase-js";

export function isSupabaseEmailVerified(user: Pick<User, "email_confirmed_at"> | null | undefined) {
  return Boolean(user?.email_confirmed_at);
}
