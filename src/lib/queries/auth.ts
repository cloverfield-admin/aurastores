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
  pharmacyName: string;
  email: string;
  password: string;
};

type SignUpResponse = {
  redirectTo: string;
  requiresEmailVerification: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
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
