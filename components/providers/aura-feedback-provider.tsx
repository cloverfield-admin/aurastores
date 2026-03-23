"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info" | "warning";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastRecord = ToastInput & {
  id: number;
};

type AuraFeedbackContextValue = {
  notify: (input: ToastInput) => void;
  dismiss: (id: number) => void;
  setLoadingState: (key: string, active: boolean, message?: string) => void;
  withLoading: <T>(key: string, message: string, task: () => Promise<T>) => Promise<T>;
  isLoading: (key?: string) => boolean;
};

const AuraFeedbackContext = createContext<AuraFeedbackContextValue | null>(null);

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), toast.durationMs ?? 4200);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.durationMs, toast.id]);

  const tone = {
    success: {
      badge: "bg-[rgba(15,185,177,0.16)] text-[#006a65]",
      border: "border-[rgba(15,185,177,0.18)]",
      icon: "check_circle",
    },
    error: {
      badge: "bg-[rgba(239,68,68,0.12)] text-[#ba1a1a]",
      border: "border-[rgba(239,68,68,0.18)]",
      icon: "error",
    },
    warning: {
      badge: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
      border: "border-[rgba(245,158,11,0.18)]",
      icon: "warning",
    },
    info: {
      badge: "bg-[rgba(96,99,238,0.16)] text-[#4648d4]",
      border: "border-[rgba(96,99,238,0.18)]",
      icon: "info",
    },
  }[toast.variant ?? "info"];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-4 rounded-2xl border bg-white/95 p-4 shadow-[0_24px_48px_-20px_rgba(15,23,42,0.35)] backdrop-blur-md ${tone.border}`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
        <span className="material-symbols-outlined notranslate text-[20px]">{tone.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#191c1e]">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#5b6866]">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded-lg p-1 text-[#94a3b8] transition hover:bg-slate-100 hover:text-[#475569]"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined notranslate text-lg">close</span>
      </button>
    </div>
  );
}

import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { GlobalLoadingSync } from "./global-loading-sync";

export function AuraFeedbackProvider({ children }: { children: ReactNode }) {
  const nextToastId = useRef(0);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, string>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput) => {
    nextToastId.current += 1;
    const toast: ToastRecord = {
      id: nextToastId.current,
      variant: "info",
      ...input,
    };

    setToasts((current) => [...current.slice(-3), toast]);
  }, []);

  const setLoadingState = useCallback((key: string, active: boolean, message = "Loading...") => {
    setLoadingStates((current) => {
      if (active) {
        if (current[key] === message) {
          return current;
        }
        return { ...current, [key]: message };
      }

      if (!(key in current)) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const withLoading = useCallback(
    async <T,>(key: string, message: string, task: () => Promise<T>) => {
      setLoadingState(key, true, message);
      try {
        return await task();
      } finally {
        setLoadingState(key, false);
      }
    },
    [setLoadingState],
  );

  const isLoading = useCallback(
    (key?: string) => (key ? key in loadingStates : Object.keys(loadingStates).length > 0),
    [loadingStates],
  );

  const value = useMemo(
    () => ({
      notify,
      dismiss,
      setLoadingState,
      withLoading,
      isLoading,
    }),
    [dismiss, notify, setLoadingState, withLoading, isLoading],
  );

  const loadingMessages = Object.values(loadingStates);
  const activeLoadingMessage = loadingMessages[loadingMessages.length - 1];

  return (
    <AuraFeedbackContext.Provider value={value}>
      {children}
      <GlobalLoadingSync />

      {activeLoadingMessage ? <LoadingOverlay message={activeLoadingMessage} /> : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-end px-4 pb-6 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </AuraFeedbackContext.Provider>
  );
}

export function useAuraFeedback() {
  const context = useContext(AuraFeedbackContext);
  if (!context) {
    throw new Error("useAuraFeedback must be used within AuraFeedbackProvider");
  }
  return context;
}
