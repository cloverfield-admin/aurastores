import { ROUTES } from "@/lib/routes";
import { ONBOARDING_STEPS } from "@/components/onboarding/onboarding-steps";

export const ONBOARDING_FURTHEST_KEY = "aurapharma-onboarding-furthest";

const MAX_INDEX = ONBOARDING_STEPS.length - 1;

export function readFurthestStepIndex(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_FURTHEST_KEY);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(n, MAX_INDEX);
  } catch {
    return 0;
  }
}

export function persistFurthestStepIndex(index: number): void {
  if (typeof window === "undefined") return;
  const clamped = Math.max(0, Math.min(index, MAX_INDEX));
  window.localStorage.setItem(ONBOARDING_FURTHEST_KEY, String(clamped));
}

/** Map URL to step index; defaults to identity (0). */
export function pathnameToOnboardingStepIndex(pathname: string): number {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p.endsWith("/review")) return 3;
  if (p.includes("/license")) return 2;
  if (p.includes("/pharmacy-details")) return 1;
  if (p === ROUTES.dashboard.onboarding.root.replace(/\/$/, "") || p.endsWith("/onboarding")) {
    return 0;
  }
  return 0;
}

export function mergeFurthestStepIndex(current: number, atLeast: number): number {
  return Math.min(MAX_INDEX, Math.max(current, atLeast));
}
