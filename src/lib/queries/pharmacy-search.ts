"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { PharmacySearchResult } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository";

export const pharmacySearchQueryKey = ["pharmacy-search"] as const;

export function usePharmacySearchQuery(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: [...pharmacySearchQueryKey, trimmed],
    queryFn: () =>
      fetchJson<PharmacySearchResult>(`${apiUrl("/search")}?q=${encodeURIComponent(trimmed)}`, {
        method: "GET",
      }),
    enabled: trimmed.length >= 2,
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}
