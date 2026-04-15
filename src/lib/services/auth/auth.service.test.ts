import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import type { AvatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository";
import { AuthService } from "@/lib/services/auth/auth.service";

function createMockAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByAuthUserId: vi.fn(),
    createRegisteredUser: vi.fn(),
    updateLastLoginAt: vi.fn(),
    syncEmailVerifiedFromAuth: vi.fn(),
    getPostAuthRedirect: vi.fn(),
    updateUserPreferences: vi.fn(),
    updateUserFullName: vi.fn(),
    setUserAvatarStorageKey: vi.fn(),
    ...overrides,
  } as unknown as AuthRepository;
}

function createMockAvatarStorage(): AvatarStorageRepository {
  return {
    upload: vi.fn(),
    remove: vi.fn(),
  };
}

describe("AuthService", () => {
  it("delegates findByAuthUserId to the injected repository", async () => {
    const findByAuthUserId = vi.fn().mockResolvedValue(null);
    const auth = new AuthService({
      auth: createMockAuthRepository({ findByAuthUserId }),
      avatarStorage: createMockAvatarStorage(),
    });

    await auth.findByAuthUserId("user-1");

    expect(findByAuthUserId).toHaveBeenCalledWith("user-1");
  });
});
