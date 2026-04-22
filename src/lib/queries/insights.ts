"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { InsightsOverviewData } from "@/lib/repositories/insights/insights.repository";

export const insightsOverviewQueryKey = ["dashboard", "insights", "overview"] as const;
export const insightsSampleDigestMutationKey = ["dashboard", "insights", "sample-digest"] as const;

export function useInsightsOverviewQuery(options?: { branchId?: string; enabled?: boolean }) {
  const branchId = options?.branchId;

  return useQuery({
    queryKey: [...insightsOverviewQueryKey, { branchId: branchId ?? null }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchId) {
        params.set("branch", branchId);
      }
      const suffix = params.toString();
      return fetchJson<InsightsOverviewData>(`${apiUrl("/dashboard/insights/overview")}${suffix ? `?${suffix}` : ""}`, {
        method: "GET",
      });
    },
    enabled: options?.enabled ?? true,
  });
}

export function useSendInsightsSampleDigestMutation() {
  return useMutation({
    mutationKey: insightsSampleDigestMutationKey,
    mutationFn: (body: { branchId?: string }) =>
      fetchJson<{ ok: true }>(apiUrl("/dashboard/insights/sample-digest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

