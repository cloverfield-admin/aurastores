import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import { AuthService } from "@/lib/services/auth/auth.service";

function createMockAuthRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByAuthUserId: vi.fn(),
    createRegisteredUser: vi.fn(),
    updateLastLoginAt: vi.fn(),
    getPostAuthRedirect: vi.fn(),
    ...overrides,
  } as unknown as AuthRepository;
}

describe("AuthService", () => {
  it("delegates findByAuthUserId to the injected repository", async () => {
    const findByAuthUserId = vi.fn().mockResolvedValue(null);
    const auth = new AuthService({
      auth: createMockAuthRepository({ findByAuthUserId }),
    });

    await auth.findByAuthUserId("user-1");

    expect(findByAuthUserId).toHaveBeenCalledWith("user-1");
  });
});
