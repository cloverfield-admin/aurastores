import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type PharmacySearchHitKind = "branch" | "staff" | "product";

export type PharmacySearchHit = {
  kind: PharmacySearchHitKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type PharmacySearchResult = {
  hits: PharmacySearchHit[];
};

export interface PharmacySearchRepository {
  search(context: AuthContext, q: string): Promise<PharmacySearchResult>;
}
