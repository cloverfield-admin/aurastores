"use client";

import { useState } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "./onboarding-progress-provider";

type SaveProgressButtonProps = {
  variant?: "gradient" | "outline";
};

export function SaveProgressButton({ variant = "gradient" }: SaveProgressButtonProps) {
  const { refresh } = useOnboardingProgress();
  const { notify, withLoading } = useAuraFeedback();
  const [label, setLabel] = useState("Save Progress");
  const outline =
    "border border-[#e2e8f0] bg-white text-[#0f172a] hover:bg-slate-50";
  const gradient =
    "bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] text-white shadow-sm hover:opacity-95";

  async function handleClick() {
    setLabel("Syncing...");
    try {
      await withLoading("onboarding-save-progress", "Syncing your latest onboarding progress...", () =>
        refresh(),
      );
      setLabel("Progress Synced");
      notify({
        variant: "success",
        title: "Progress synced",
        description: "Your latest onboarding state is now saved securely.",
      });
      window.setTimeout(() => setLabel("Save Progress"), 1500);
    } catch (error) {
      setLabel("Save Progress");
      notify({
        variant: "error",
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Could not sync progress right now.",
      });
    }
  }

  return (
    <button
      type="button"
      className={`w-full rounded-2xl px-4 py-2.5 text-center text-sm font-semibold transition ${variant === "outline" ? outline : gradient}`}
      onClick={() => {
        void handleClick();
      }}
    >
      {label}
    </button>
  );
}
