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

type PharmacyDetailsPayload = {
  branchName: string;
  pharmacistCount: string;
  branchLocation: string;
  hoursMode: "24-7" | "custom";
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

export function useSavePharmacyDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PharmacyDetailsPayload) =>
      fetchJson<OnboardingDraft>(apiUrl("/onboarding/pharmacy-details"), {
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
