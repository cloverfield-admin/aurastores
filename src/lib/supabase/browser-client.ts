"use client";

import { createBrowserClient } from "@supabase/ssr";

let singleton: ReturnType<typeof createBrowserClient> | null = null;

/**
 * The browser-side Supabase client, reading the auth session from the cookies
 * `@supabase/ssr` already manages (the server sets them; the browser reads them).
 *
 * Used for Realtime subscriptions and — since the admin console talks to the Go
 * engine cross-origin rather than through a Next.js route — to mint the bearer
 * token those requests carry.
 *
 * Returns null rather than throwing when the env vars are missing: throwing at
 * module-eval time can stop the whole UI from rendering. Callers handle null.
 */
export function getSupabaseBrowserClient() {
  if (singleton) return singleton;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  singleton = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return singleton;
}

/**
 * The access token for direct calls to the Go engine. Null when signed out.
 *
 * `getSession()` refreshes an expired token (autoRefreshToken is on), so an idle
 * tab recovers on its own rather than dumping the admin back at sign-in.
 */
export async function getEngineAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
