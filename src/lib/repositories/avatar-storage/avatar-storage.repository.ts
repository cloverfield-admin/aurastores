export type AvatarStorageUploadParams = {
  userId: string;
  file: File;
};

export type AvatarStorageUploadResult = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export interface AvatarStorageRepository {
  upload(params: AvatarStorageUploadParams): Promise<AvatarStorageUploadResult>;
  remove(storageKey: string): Promise<void>;
}
