export type DocumentStorageUploadParams = {
  organizationId: string;
  userId: string;
  file: File;
  prefix: string;
};

export type DocumentStorageUploadResult = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface DocumentStorageRepository {
  upload(params: DocumentStorageUploadParams): Promise<DocumentStorageUploadResult>;
  /** Removes an object from storage (service role; trusted server only). */
  remove(storageKey: string): Promise<void>;
}
