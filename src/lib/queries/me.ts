"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import type { UserPreferencesInput, PatchMeInput } from "@/lib/validation/me";

export const meQueryKey = ["me"] as const;
export const securityActivityQueryKey = ["me", "security-activity"] as const;

export type MeResponse = {
  capabilities: MembershipCapabilities;
  allowedBranchIds: string[] | null;
  role: string;
  fullName: string;
  phone: string | null;
  email: string;
  preferences: UserPreferencesInput;
  avatarUrl: string | null;
  avatarStorageKey: string | null;
};

export type SecurityActivityItem = {
  id: string;
  action: string;
  title: string;
  description: string;
  occurredAt: string;
  icon: "shield" | "login" | "logout" | "key" | "notifications" | "palette";
};

export type SecurityActivityResponse = {
  items: SecurityActivityItem[];
};

export function useMeQuery(placeholderData?: MeResponse) {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () =>
      fetchJson<MeResponse>(apiUrl("/me"), {
        method: "GET",
      }),
    placeholderData,
  });
}

export function usePatchMeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchMeInput) =>
      fetchJson<{ ok: true; fullName: string; preferences: UserPreferencesInput }>(apiUrl("/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(apiUrl("/me/avatar"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true; avatarUrl: string | null; avatarStorageKey: string | null; error?: string }
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload && "error" in payload && payload.error ? payload.error : "Upload failed.");
      }
      if (!payload || !("ok" in payload) || !payload.ok) {
        throw new Error("Upload failed.");
      }
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      fetchJson<{ ok: true }>(apiUrl("/auth/change-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useSecurityActivityQuery() {
  return useQuery({
    queryKey: securityActivityQueryKey,
    queryFn: () =>
      fetchJson<SecurityActivityResponse>(apiUrl("/me/security-activity"), {
        method: "GET",
      }),
  });
}
