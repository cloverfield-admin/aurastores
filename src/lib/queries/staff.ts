"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { AddStaffByEmailPayload } from "@/lib/validation/staff";
import { networkDashboardQueryKey } from "@/lib/queries/network";

export const staffDirectoryQueryKey = ["staff", "directory"] as const;

export type StaffDirectoryMemberDto = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  membershipStatus: string;
  jobTitle: string | null;
  branchName: string | null;
};

type StaffDirectoryResponse = {
  members: StaffDirectoryMemberDto[];
};

export function useStaffDirectoryQuery() {
  return useQuery({
    queryKey: staffDirectoryQueryKey,
    queryFn: () => fetchJson<StaffDirectoryResponse>(apiUrl("/staff"), { method: "GET" }),
  });
}

export function useAddStaffMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddStaffByEmailPayload) =>
      fetchJson<{ membershipId: string }>(apiUrl("/staff"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffDirectoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: networkDashboardQueryKey }),
      ]);
    },
  });
}
