"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { OrganizationBranchesData } from "@/lib/repositories/network/network.repository";
import type { PatchOrganizationSettingsInput } from "@/lib/validation/organization";

export const organizationBranchesQueryKey = ["dashboard", "organization", "branches"] as const;

export function useOrganizationOverviewQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: organizationBranchesQueryKey,
    queryFn: () =>
      fetchJson<OrganizationBranchesData>(apiUrl("/dashboard/organization"), { method: "GET" }),
    enabled: options?.enabled ?? true,
  });
}

export function usePatchOrganizationSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchOrganizationSettingsInput) =>
      fetchJson<{ salesTax: { enabled: boolean; rateBps: number } }>(apiUrl("/dashboard/organization"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: organizationBranchesQueryKey });
    },
  });
}
