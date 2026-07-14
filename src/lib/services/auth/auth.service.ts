import type { UserPreferences } from "@/lib/db/schema";
import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import type { AvatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository";
import { listSecurityActivityForUser } from "@/lib/repositories/security-activity/security-activity.repository.impl";

export class AuthService {
  constructor(
    private readonly repos: {
      auth: AuthRepository;
      avatarStorage: AvatarStorageRepository;
    },
  ) {}

  findByAuthUserId(authUserId: string) {
    return this.repos.auth.findByAuthUserId(authUserId);
  }

  /**
   * Gates the platform console. Membership-independent on purpose — see
   * `AuthContext.isPlatformAdmin`: an admin who also owns a store must not be
   * locked out of the console by whichever membership happened to be default.
   */
  isPlatformAdmin(userId: string) {
    return this.repos.auth.isPlatformAdmin(userId);
  }

  createRegisteredUser(params: Parameters<AuthRepository["createRegisteredUser"]>[0]) {
    return this.repos.auth.createRegisteredUser(params);
  }

  updateLastLoginAt(authUserId: string) {
    return this.repos.auth.updateLastLoginAt(authUserId);
  }

  syncEmailVerifiedFromAuth(authUserId: string, isEmailVerified: boolean) {
    return this.repos.auth.syncEmailVerifiedFromAuth(authUserId, isEmailVerified);
  }

  getPostAuthRedirect(authUserId: string) {
    return this.repos.auth.getPostAuthRedirect(authUserId);
  }

  updateUserPreferences(userId: string, patch: Partial<UserPreferences>) {
    return this.repos.auth.updateUserPreferences(userId, patch);
  }

  updateUserFullName(userId: string, fullName: string) {
    return this.repos.auth.updateUserFullName(userId, fullName);
  }

  async replaceUserAvatar(params: {
    userId: string;
    file: File;
    previousAvatarStorageKey: string | null | undefined;
  }) {
    const uploaded = await this.repos.avatarStorage.upload({
      userId: params.userId,
      file: params.file,
    });
    await this.repos.auth.setUserAvatarStorageKey(params.userId, uploaded.storageKey);
    if (params.previousAvatarStorageKey && params.previousAvatarStorageKey !== uploaded.storageKey) {
      try {
        await this.repos.avatarStorage.remove(params.previousAvatarStorageKey);
      } catch {
        // Best-effort cleanup; new avatar is already committed.
      }
    }
    return uploaded;
  }

  listSecurityActivityForUser(userId: string) {
    return listSecurityActivityForUser(userId);
  }
}
