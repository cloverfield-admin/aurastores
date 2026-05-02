"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { OnboardingDraft } from "@/components/onboarding/types";

export const onboardingQueryKey = ["onboarding"] as const;

type IdentityPayload = {
  legalName: string;
  taxId: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type WeeklyHourPayload = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type LocationDetailsPayload = {
  branchName: string;
  pharmacistCount: string;
  branchLocation: string;
  hoursMode: "24-7" | "custom";
  weeklyHours?: WeeklyHourPayload[];
  latitude?: number | null;
  longitude?: number | null;
};

type CompleteOnboardingResponse = {
  redirectTo: string;
  onboarding: OnboardingDraft;
};

export function useOnboardingQuery() {
  return useQuery({
    queryKey: onboardingQueryKey,
    queryFn: () => fetchJson<OnboardingDraft>(apiUrl("/onboarding"), { method: "GET" }),
  });
}

export function useSetOnboardingDraft() {
  const queryClient = useQueryClient();

  return (draft: OnboardingDraft) => {
    queryClient.setQueryData(onboardingQueryKey, draft);
  };
}

export function useRefreshOnboarding() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
    return queryClient.ensureQueryData({
      queryKey: onboardingQueryKey,
      queryFn: () => fetchJson<OnboardingDraft>(apiUrl("/onboarding"), { method: "GET" }),
    });
  };
}

export function useSaveIdentityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IdentityPayload) =>
      fetchJson<OnboardingDraft>(apiUrl("/onboarding/identity"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: (draft) => {
      queryClient.setQueryData(onboardingQueryKey, draft);
    },
  });
}

export function useSaveLocationDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LocationDetailsPayload) => {
      const res = await fetch(apiUrl("/onboarding/location-details"), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | (OnboardingDraft & { error?: string; issues?: unknown })
        | { error?: string; issues?: unknown }
        | null;
      if (!res.ok) {
        const err = new Error((body as any)?.error ?? "Request failed.");
        (err as any).status = res.status;
        (err as any).payload = body;
        throw err;
      }
      if (body === null) {
        throw new Error("Empty response.");
      }
      return body as OnboardingDraft;
    },
    onSuccess: (draft) => {
      queryClient.setQueryData(onboardingQueryKey, draft);
    },
  });
}

export function useUploadLicenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      fetchJson<OnboardingDraft>(apiUrl("/onboarding/license"), {
        method: "POST",
        body: formData,
      }),
    onSuccess: (draft) => {
      queryClient.setQueryData(onboardingQueryKey, draft);
    },
  });
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetchJson<CompleteOnboardingResponse>(apiUrl("/onboarding/complete"), {
        method: "POST",
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(onboardingQueryKey, payload.onboarding);
    },
  });
}
