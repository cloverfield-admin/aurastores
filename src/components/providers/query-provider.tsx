"use client";

import {
  PersistQueryClientProvider,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createQueryIdbPersister } from "@/lib/query-idb-persister";
import { shouldPersistQueryKey } from "@/lib/query-cache-whitelist";
import { OfflineBanner } from "@/components/providers/offline-banner";
import { OutboxQueuedBanner } from "@/components/providers/outbox-queued-banner";
import { OutboxSyncProvider } from "@/components/providers/outbox-sync-provider";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHE_BUSTER =
  typeof process.env.NEXT_PUBLIC_QUERY_CACHE_BUSTER === "string" &&
  process.env.NEXT_PUBLIC_QUERY_CACHE_BUSTER.length > 0
    ? process.env.NEXT_PUBLIC_QUERY_CACHE_BUSTER
    : "v1";

function createThrottledPersister(base: Persister, throttleMs: number): Persister {
  let lastWrite = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pending: PersistedClient | null = null;

  const flush = () => {
    timeout = null;
    if (!pending) return;
    const payload = pending;
    pending = null;
    void base.persistClient(payload);
  };

  return {
    persistClient: async (client) => {
      const now = Date.now();
      pending = client;
      if (now - lastWrite >= throttleMs) {
        lastWrite = now;
        if (timeout) clearTimeout(timeout);
        timeout = null;
        pending = null;
        await base.persistClient(client);
        return;
      }
      if (!timeout) {
        timeout = setTimeout(() => {
          lastWrite = Date.now();
          flush();
        }, throttleMs - (now - lastWrite));
      }
    },
    restoreClient: () => base.restoreClient(),
    removeClient: () => base.removeClient(),
  };
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            networkMode: "offlineFirst",
          },
        },
      }),
  );

  const [persister] = useState(() => createThrottledPersister(createQueryIdbPersister(), 1000));

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.fetchStatus === "fetching") return false;
            if (query.state.status !== "success") return false;
            return shouldPersistQueryKey(query.queryKey);
          },
        },
      }}
    >
      <OfflineBanner />
      <OutboxQueuedBanner />
      <OutboxSyncProvider>{children}</OutboxSyncProvider>
    </PersistQueryClientProvider>
  );
}
