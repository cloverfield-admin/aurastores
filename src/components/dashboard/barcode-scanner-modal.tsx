"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startQuaggaLiveScan } from "@/lib/barcode/quagga-scanner";

export type BarcodeScannerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void | Promise<void>;
  title?: string;
  /** Hint for mobile users (rear camera via Quagga constraints). */
  hint?: string;
};

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScan,
  title = "Scan barcode",
  hint = "Use your phone or laptop camera over https:// or localhost (not http:// on a Wi‑Fi IP). On iPhone use Safari, allow the camera, and avoid in-app browsers.",
}: BarcodeScannerModalProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const onScanRef = useRef(onScan);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /* eslint-disable react-hooks/set-state-in-effect -- Quagga camera lifecycle drives status UI */
  useEffect(() => {
    if (!open) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    setStatus("starting");
    setErrorMessage(null);

    void (async () => {
      const stop = await startQuaggaLiveScan({
        target: viewport,
        singleScan: true,
        signal: ac.signal,
        onError: (message) => {
          if (cancelled) {
            return;
          }
          setErrorMessage(message);
          setStatus("error");
        },
        onCode: (code) => {
          if (cancelled) {
            return;
          }
          onScanRef.current(code);
          onOpenChange(false);
        },
      });

      if (cancelled) {
        await stop();
        return;
      }

      stopRef.current = stop;
      if (!ac.signal.aborted) {
        setStatus("scanning");
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      const stop = stopRef.current;
      stopRef.current = null;
      if (stop) {
        void stop();
      }
    };
  }, [open, onOpenChange]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          close();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-scanner-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3">
          <h2 id="barcode-scanner-title" className="text-base font-semibold text-[#0f172a]">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            aria-label="Close scanner"
          >
            <span className="material-symbols-outlined notranslate text-xl">close</span>
          </button>
        </div>

        <div className="space-y-3 px-4 py-3">
          <p className="text-xs leading-relaxed text-[#64748b]">{hint}</p>
          {status === "starting" ? (
            <p className="text-sm text-[#006a65]">Starting camera…</p>
          ) : null}
          {errorMessage ? <p className="text-sm text-[#b91c1c]">{errorMessage}</p> : null}
        </div>

        <div className="relative bg-black px-2 pb-4 pt-0">
          <div
            ref={viewportRef}
            className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl bg-black [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />
          {status === "scanning" && !errorMessage ? (
            <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-medium text-white/90 drop-shadow">
              Align the barcode within the frame
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e2e8f0] px-4 py-3">
          <button
            type="button"
            onClick={close}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#475569] transition hover:bg-[#f1f5f9]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
