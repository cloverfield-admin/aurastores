import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const AVATAR_BUCKET = "user-avatars";

/**
 * Builds the public object URL for a key in the `user-avatars` bucket (bucket must be public).
 */
export function getUserAvatarPublicUrl(avatarStorageKey: string): string {
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarStorageKey);
  return data.publicUrl;
}
