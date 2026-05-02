"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { OrganizationBranchesData } from "@/lib/repositories/network/network.repository";
import type { PatchOrganizationSettingsInput } from "@/lib/validation/organization";
import type { CreateOrganizationBranchInput } from "@/lib/validation/branches";
import { networkDashboardQueryKey } from "@/lib/queries/network";
import { stockBranchesQueryKey } from "@/lib/queries/stock";

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

export function useCreateOrganizationBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganizationBranchInput) =>
      fetchJson<{ branch: { id: string; name: string } }>(apiUrl("/dashboard/organization/branches"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationBranchesQueryKey }),
        queryClient.invalidateQueries({ queryKey: networkDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
      ]);
    },
  });
}
