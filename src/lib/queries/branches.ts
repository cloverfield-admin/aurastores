"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { UpdateOrganizationBranchInput } from "@/lib/validation/branches";
import { organizationBranchesQueryKey } from "@/lib/queries/organization";
import { networkDashboardQueryKey } from "@/lib/queries/network";
import { stockBranchesQueryKey } from "@/lib/queries/stock";

export const branchDetailQueryKey = (branchId: string) => ["dashboard", "organization", "branch", branchId] as const;

export type BranchDetailResponse = {
  branch: {
    id: string;
    code: string;
    name: string;
    type: "main" | "retail" | "warehouse";
    status: "draft" | "active" | "inactive" | "syncing";
    isPrimary: boolean;
    addressLine1: string;
    latitude: number | null;
    longitude: number | null;
    licensedPharmacistCount: number;
    operatingHours: Array<{
      dayOfWeek: number;
      isClosed: boolean;
      opensAt: string | null;
      closesAt: string | null;
    }>;
  };
};

export function useBranchDetailQuery(branchId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: branchDetailQueryKey(branchId),
    queryFn: () => fetchJson<BranchDetailResponse>(apiUrl(`/dashboard/organization/branches/${branchId}`), { method: "GET" }),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateBranchMutation(branchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrganizationBranchInput) =>
      fetchJson<BranchDetailResponse>(apiUrl(`/dashboard/organization/branches/${branchId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: branchDetailQueryKey(branchId) }),
        queryClient.invalidateQueries({ queryKey: organizationBranchesQueryKey }),
        queryClient.invalidateQueries({ queryKey: networkDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
      ]);
    },
  });
}

