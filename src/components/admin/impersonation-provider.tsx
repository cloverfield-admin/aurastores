"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setImpersonationTarget } from "@/lib/api/engine";
import type { AdminOrgProfile } from "@/lib/queries/admin";

type ImpersonationState = {
  /** The store currently being viewed read-only, or null. */
  target: AdminOrgProfile | null;
  start: (org: AdminOrgProfile) => void;
  stop: () => void;
};

const ImpersonationContext = createContext<ImpersonationState | null>(null);

/**
 * Tracks the "view as store" session.
 *
 * The org id also lives in a module-level slot in `lib/api/engine` so every
 * `adminFetch({impersonate: true})` picks it up without prop-drilling. This
 * provider is the only writer of that slot.
 */
export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<AdminOrgProfile | null>(null);
  const queryClient = useQueryClient();

  const start = useCallback(
    (org: AdminOrgProfile) => {
      // Drop anything cached from a PREVIOUS store before switching. Impersonated
      // query keys are org-scoped, so this is belt-and-braces — but getting it
      // wrong renders company A's revenue under company B's name, which is the
      // single easiest data-leak bug to ship here.
      queryClient.removeQueries({ queryKey: ["admin", "impersonate"] });
      setImpersonationTarget(org.id);
      setTarget(org);
    },
    [queryClient],
  );

  const stop = useCallback(() => {
    setImpersonationTarget(null);
    setTarget(null);
    queryClient.removeQueries({ queryKey: ["admin", "impersonate"] });
  }, [queryClient]);

  const value = useMemo<ImpersonationState>(() => ({ target, start, stop }), [target, start, stop]);

  return <ImpersonationContext.Provider value={value}>{children}</ImpersonationContext.Provider>;
}

export function useImpersonation(): ImpersonationState {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    throw new Error("useImpersonation must be used inside an ImpersonationProvider");
  }
  return ctx;
}
