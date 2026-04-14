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
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    total: number;
    active: number;
    invited: number;
    other: number;
  };
};

export function useStaffDirectoryQuery(options?: { q?: string; page?: number; pageSize?: number }) {
  const q = options?.q?.trim() ?? "";
  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize ?? 10)));
  const queryString = `q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
  return useQuery({
    queryKey: [...staffDirectoryQueryKey, { q, page, pageSize }] as const,
    queryFn: () => fetchJson<StaffDirectoryResponse>(`${apiUrl("/staff")}?${queryString}`, { method: "GET" }),
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
