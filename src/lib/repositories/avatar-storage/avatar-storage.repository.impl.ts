import type {
  AvatarStorageRepository,
  AvatarStorageUploadParams,
  AvatarStorageUploadResult,
} from "@/lib/repositories/avatar-storage/avatar-storage.repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "user-avatars";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export class AvatarStorageRepositoryImpl implements AvatarStorageRepository {
  async upload(params: AvatarStorageUploadParams): Promise<AvatarStorageUploadResult> {
    // Use the service-role admin client (as remove() does) rather than the
    // cookie-based server client: mobile requests authenticate via a Bearer
    // token with no Supabase SSR cookie, so the cookie client is anonymous
    // (auth.uid() NULL) and the storage.objects INSERT policy rejects the
    // upload ("new row violates row-level security policy"). The upload path is
    // derived server-side from the already-validated userId, so bypassing RLS
    // here is safe.
    const supabase = createSupabaseAdminClient();
    const path = `${params.userId}/${crypto.randomUUID()}-${safeFileName(params.file.name)}`;
    const bytes = await params.file.arrayBuffer();
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: params.file.type,
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      storageKey: path,
      fileName: params.file.name,
      mimeType: params.file.type || "application/octet-stream",
      sizeBytes: params.file.size,
    };
  }

  async remove(storageKey: string): Promise<void> {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([storageKey]);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (!msg.includes("not found") && !msg.includes("no such")) {
        throw new Error(error.message);
      }
    }
  }
}

export const avatarStorageRepository: AvatarStorageRepository = new AvatarStorageRepositoryImpl();
