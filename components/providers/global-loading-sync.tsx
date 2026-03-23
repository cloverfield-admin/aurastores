"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuraFeedback } from "./aura-feedback-provider";

const REACT_QUERY_LOADING_KEY = "react-query-global";
const DEFAULT_MESSAGE = "Loading...";

/**
 * Syncs React Query's global fetching/mutating state to the overlay loader.
 * Shows overlay only for initial loads (no cached data) or mutations.
 * Background refetches of cached data do not trigger the overlay.
 */
export function GlobalLoadingSync() {
  const { setLoadingState } = useAuraFeedback();
  const isInitialFetching = useIsFetching({
    predicate: (query) =>
      query.state.data === undefined &&
      !((query.meta as { suppressGlobalLoading?: boolean } | undefined)?.suppressGlobalLoading),
  });
  const isMutating = useIsMutating();
  const activeRef = useRef(false);

  const loading = isInitialFetching > 0 || isMutating > 0;

  useEffect(() => {
    if (loading && !activeRef.current) {
      activeRef.current = true;
      setLoadingState(REACT_QUERY_LOADING_KEY, true, DEFAULT_MESSAGE);
    } else if (!loading && activeRef.current) {
      activeRef.current = false;
      setLoadingState(REACT_QUERY_LOADING_KEY, false);
    }
  }, [loading, setLoadingState]);

  return null;
}
