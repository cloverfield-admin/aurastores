"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { WorkspaceSearchResult } from "@/lib/repositories/workspace-search/workspace-search.repository";

export const workspaceSearchQueryKey = ["workspace-search"] as const;

export function useWorkspaceSearchQuery(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: [...workspaceSearchQueryKey, trimmed],
    queryFn: () =>
      fetchJson<WorkspaceSearchResult>(`${apiUrl("/search")}?q=${encodeURIComponent(trimmed)}`, {
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
