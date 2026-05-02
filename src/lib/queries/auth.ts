"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

type SignInPayload = {
  email: string;
  password: string;
  remember: boolean;
};

type SignInResponse = {
  redirectTo: string;
  user: {
    id: string;
    email?: string | null;
  };
};

type SignUpPayload = {
  fullName: string;
  businessName: string;
  storeVertical?: "pharmacy" | "general_retail";
  email: string;
  password: string;
  selectedPlanCode?: "basic" | "pro" | "enterprise";
};

type SignUpResponse = {
  redirectTo: string;
  emailVerified: boolean;
  requiresEmailVerification: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
};

type ForgotPasswordPayload = {
  email: string;
};

type ForgotPasswordResponse = {
  ok: true;
  message: string;
};

type UpdatePasswordPayload = {
  password: string;
};

type UpdatePasswordResponse = {
  ok: true;
  redirectTo: string;
};

type ResendVerificationPayload = {
  email: string;
};

type ResendVerificationResponse = {
  ok: true;
  message: string;
};

export function useSignInMutation() {
  return useMutation({
    mutationFn: (payload: SignInPayload) =>
      fetchJson<SignInResponse>(apiUrl("/auth/sign-in"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: (payload: SignUpPayload) =>
      fetchJson<SignUpResponse>(apiUrl("/auth/sign-up"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      fetchJson<ForgotPasswordResponse>(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
  });
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) =>
      fetchJson<UpdatePasswordResponse>(apiUrl("/auth/update-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (payload: ResendVerificationPayload) =>
      fetchJson<ResendVerificationResponse>(apiUrl("/auth/resend-verification"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
  });
}
