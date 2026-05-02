import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client with the service role key. Use only in trusted server code
 * (Route Handlers, Server Actions). Never import from client components.
 */
export function createSupabaseAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
