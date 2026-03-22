import { createSupabaseServerClient } from "@/lib/supabase/server";

const ONBOARDING_BUCKET = "compliance-documents";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export class DocumentStorageRepository {
  async upload(params: {
    organizationId: string;
    userId: string;
    file: File;
    prefix: string;
  }) {
    const supabase = await createSupabaseServerClient();
    const path = `${params.organizationId}/${params.userId}/${params.prefix}-${crypto.randomUUID()}-${safeFileName(params.file.name)}`;
    const bytes = await params.file.arrayBuffer();
    const { error } = await supabase.storage.from(ONBOARDING_BUCKET).upload(path, bytes, {
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
}

export const documentStorageRepository = new DocumentStorageRepository();
