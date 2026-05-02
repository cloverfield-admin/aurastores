import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type WorkspaceSearchHitKind = "branch" | "staff" | "product";

export type WorkspaceSearchHit = {
  kind: WorkspaceSearchHitKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type WorkspaceSearchResult = {
  hits: WorkspaceSearchHit[];
};

export interface WorkspaceSearchRepository {
  search(context: AuthContext, q: string): Promise<WorkspaceSearchResult>;
}
