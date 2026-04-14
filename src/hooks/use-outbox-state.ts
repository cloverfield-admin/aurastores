"use client";

import { useQuery } from "@tanstack/react-query";
import { getOutboxState } from "@/lib/offline/outbox";
import { outboxQueryKeys } from "@/lib/offline/outbox-query-keys";

export function useOutboxState() {
  return useQuery({
    queryKey: outboxQueryKeys.all,
    queryFn: getOutboxState,
    enabled: typeof window !== "undefined",
  });
}

/** @alias useOutboxState — full summary + entries for outbox UI */
export const useOutboxSummary = useOutboxState;
