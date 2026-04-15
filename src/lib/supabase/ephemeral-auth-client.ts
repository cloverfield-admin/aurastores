import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** One-off auth checks without touching Next.js auth cookies. */
export function createEphemeralSupabaseAuthClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
