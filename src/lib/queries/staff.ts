"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { AddStaffByEmailPayload, UpdateStaffMemberPayload } from "@/lib/validation/staff";
import { networkDashboardQueryKey } from "@/lib/queries/network";

export const staffDirectoryQueryKey = ["staff", "directory"] as const;

export type StaffDirectoryMemberDto = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  membershipStatus: string;
  jobTitle: string | null;
  staffEmployeeCode: string | null;
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

export function useStaffDirectoryQuery(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const q = options?.q?.trim() ?? "";
  const page = Math.max(1, Math.floor(options?.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize ?? 10)));
  const queryString = `q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}`;
  return useQuery({
    queryKey: [...staffDirectoryQueryKey, { q, page, pageSize }] as const,
    queryFn: () => fetchJson<StaffDirectoryResponse>(`${apiUrl("/staff")}?${queryString}`, { method: "GET" }),
    enabled: options?.enabled ?? true,
  });
}

export type AddStaffMemberResponse =
  | { invitationId: string; status: "invited" }
  | { membershipId: string; staffEmployeeCode: string | null; status: "added" };

export function useAddStaffMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddStaffByEmailPayload) =>
      fetchJson<AddStaffMemberResponse>(apiUrl("/staff"), {
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

export const appMeQueryKey = ["app", "me"] as const;

export type AppMeResponse = {
  capabilities: Record<string, boolean>;
  allowedBranchIds: string[] | null;
  role: string;
  fullName: string;
  phone: string | null;
};

export function useAppMeQuery() {
  return useQuery({
    queryKey: appMeQueryKey,
    queryFn: () => fetchJson<AppMeResponse>(apiUrl("/me")),
  });
}

export const staffMemberQueryKey = (membershipId: string) => ["staff", "member", membershipId] as const;

export type StaffMemberCredentialDto = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

export type StaffMemberDetailDto = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  jobTitle: string | null;
  appRole: string;
  membershipStatus: string;
  staffEmployeeCode: string | null;
  capabilities: Record<string, boolean>;
  branchIds: string[];
  credentials: StaffMemberCredentialDto[];
};

export function useStaffMemberQuery(membershipId: string | undefined) {
  return useQuery({
    queryKey: membershipId ? staffMemberQueryKey(membershipId) : ["staff", "member", "__"],
    queryFn: () => fetchJson<StaffMemberDetailDto>(apiUrl(`/staff/${membershipId}`)),
    enabled: Boolean(membershipId),
  });
}

export function useUpdateStaffMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { membershipId: string; payload: UpdateStaffMemberPayload }) =>
      fetchJson<{ ok: true }>(apiUrl(`/staff/${vars.membershipId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vars.payload),
      }),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffMemberQueryKey(vars.membershipId) }),
        queryClient.invalidateQueries({ queryKey: staffDirectoryQueryKey }),
        queryClient.invalidateQueries({ queryKey: networkDashboardQueryKey }),
      ]);
    },
  });
}

async function postStaffCredentialsMultipart(membershipId: string, files: File[]): Promise<void> {
  const fd = new FormData();
  for (const f of files) {
    fd.append("files", f);
  }
  const res = await fetch(apiUrl(`/staff/${membershipId}/credentials`), {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(payload?.error ?? "Upload failed.");
  }
}

export function useUploadStaffCredentialsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { membershipId: string; files: File[] }) => {
      await postStaffCredentialsMultipart(vars.membershipId, vars.files);
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: staffMemberQueryKey(vars.membershipId) });
      await queryClient.invalidateQueries({ queryKey: staffDirectoryQueryKey });
    },
  });
}

export function useDeleteStaffCredentialMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { membershipId: string; documentId: string }) => {
      const res = await fetch(apiUrl(`/staff/${vars.membershipId}/credentials/${vars.documentId}`), {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Delete failed.");
      }
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: staffMemberQueryKey(vars.membershipId) });
      await queryClient.invalidateQueries({ queryKey: staffDirectoryQueryKey });
    },
  });
}
