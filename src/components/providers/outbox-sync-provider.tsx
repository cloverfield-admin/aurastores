"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { flushOutbox } from "@/lib/offline/outbox";
import { OUTBOX_KIND_SALE_CREATE, OUTBOX_KIND_STOCK_ADJUSTMENT } from "@/lib/offline/outbox-kinds";
import { outboxQueryKeys } from "@/lib/offline/outbox-query-keys";
import {
  salesCatalogQueryKey,
  salesDashboardQueryKey,
} from "@/lib/queries/sales";
import {
  stockBatchDetailQueryKey,
  stockBranchesQueryKey,
  stockCatalogQueryKey,
  stockDashboardQueryKey,
} from "@/lib/queries/stock";

const DEBOUNCE_MS = 400;

export function OutboxSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const invalidateOutbox = () => {
      void queryClient.invalidateQueries({ queryKey: outboxQueryKeys.all });
    };

    const runFlush = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }
      const { processed, kinds } = await flushOutbox();
      invalidateOutbox();
      if (processed === 0) {
        return;
      }
      if (kinds.includes(OUTBOX_KIND_SALE_CREATE)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: salesDashboardQueryKey }),
          queryClient.invalidateQueries({ queryKey: salesCatalogQueryKey }),
          queryClient.invalidateQueries({ queryKey: ["stock", "dashboard"] }),
        ]);
      }
      if (kinds.includes(OUTBOX_KIND_STOCK_ADJUSTMENT)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
          queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey }),
          queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
          queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
        ]);
      }
    };

    const scheduleFlush = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        void runFlush();
      }, DEBOUNCE_MS);
    };

    const onOutboxChanged = () => {
      invalidateOutbox();
      scheduleFlush();
    };

    const onOnline = () => {
      scheduleFlush();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleFlush();
      }
    };

    window.addEventListener("aurapharma:outbox-changed", onOutboxChanged);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    scheduleFlush();

    return () => {
      window.removeEventListener("aurapharma:outbox-changed", onOutboxChanged);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [queryClient]);

  return children;
}
