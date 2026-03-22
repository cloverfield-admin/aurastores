"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useOnboardingQuery,
  useRefreshOnboarding,
  useSetOnboardingDraft,
} from "@/lib/queries/onboarding";
import { onboardingStepIndex } from "./onboarding-steps";
import type { OnboardingDraft, OnboardingStepId } from "./types";

type OnboardingProgressValue = {
  draft: OnboardingDraft | null;
  furthestStepIndex: number;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  setDraftFromServer: (draft: OnboardingDraft) => void;
  refresh: () => Promise<OnboardingDraft>;
  isStepAccessible: (stepId: OnboardingStepId) => boolean;
};

const OnboardingProgressContext = createContext<OnboardingProgressValue | null>(null);

export function OnboardingProgressProvider({ children }: { children: ReactNode }) {
  const onboardingQuery = useOnboardingQuery();
  const { notify, setLoadingState } = useAuraFeedback();
  const setDraftFromServer = useSetOnboardingDraft();
  const refresh = useRefreshOnboarding();
  const draft = onboardingQuery.data ?? null;
  const furthestStepIndex = draft?.onboarding.furthestStepIndex ?? 0;
  const hydrated = !onboardingQuery.isPending;
  const loading = onboardingQuery.isPending;
  const error = onboardingQuery.error instanceof Error ? onboardingQuery.error.message : null;
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    setLoadingState(
      "onboarding-bootstrap",
      onboardingQuery.isPending && !draft,
      "Loading your onboarding workspace...",
    );

    return () => {
      setLoadingState("onboarding-bootstrap", false);
    };
  }, [draft, onboardingQuery.isPending, setLoadingState]);

  useEffect(() => {
    if (!error || lastErrorRef.current === error) {
      return;
    }

    lastErrorRef.current = error;
    notify({
      variant: "error",
      title: "Could not load onboarding data",
      description: error,
    });
  }, [error, notify]);

  const isStepAccessible = useCallback(
    (stepId: OnboardingStepId) => onboardingStepIndex(stepId) <= furthestStepIndex,
    [furthestStepIndex],
  );

  const value = useMemo(
    () => ({
      draft,
      furthestStepIndex,
      hydrated,
      loading,
      error,
      setDraftFromServer,
      refresh,
      isStepAccessible,
    }),
    [draft, furthestStepIndex, hydrated, loading, error, setDraftFromServer, refresh, isStepAccessible],
  );

  return (
    <OnboardingProgressContext.Provider value={value}>
      {children}
    </OnboardingProgressContext.Provider>
  );
}

export function useOnboardingProgress(): OnboardingProgressValue {
  const ctx = useContext(OnboardingProgressContext);
  if (!ctx) {
    throw new Error("useOnboardingProgress must be used within OnboardingProgressProvider");
  }
  return ctx;
}
