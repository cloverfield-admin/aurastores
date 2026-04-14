import type {
  DocumentStorageRepository,
  DocumentStorageUploadParams,
  DocumentStorageUploadResult,
} from "@/lib/repositories/document-storage/document-storage.repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ONBOARDING_BUCKET = "compliance-documents";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export class DocumentStorageRepositoryImpl implements DocumentStorageRepository {
  async upload(params: DocumentStorageUploadParams): Promise<DocumentStorageUploadResult> {
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

  async remove(storageKey: string): Promise<void> {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(ONBOARDING_BUCKET).remove([storageKey]);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (!msg.includes("not found") && !msg.includes("no such")) {
        throw new Error(error.message);
      }
    }
  }
}

export const documentStorageRepository: DocumentStorageRepository = new DocumentStorageRepositoryImpl();
