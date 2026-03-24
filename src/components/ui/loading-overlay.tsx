"use client";

export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(247,249,251,0.72)] px-6 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/50 bg-white/90 p-8 text-center shadow-[0_32px_80px_-24px_rgba(15,23,42,0.35)]">
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(15,185,177,0.18)_0%,rgba(96,99,238,0.10)_52%,transparent_74%)] blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative flex size-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[rgba(15,185,177,0.15)]" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#0fb9b1] border-r-[#6063ee]" />
            <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(15,185,177,0.10)]">
              <span className="material-symbols-outlined notranslate text-[#006a65]">
                local_pharmacy
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[#191c1e]">
              Aura is working
            </p>
            <p className="text-sm leading-relaxed text-[#4f5d5b]">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
