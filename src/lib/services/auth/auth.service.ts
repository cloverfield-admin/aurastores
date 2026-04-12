import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";

export class AuthService {
  constructor(private readonly repos: { auth: AuthRepository }) {}

  findByAuthUserId(authUserId: string) {
    return this.repos.auth.findByAuthUserId(authUserId);
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
}
