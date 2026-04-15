import Link from "next/link";

export function AuraAuthBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-80 -top-64 h-[1024px] w-[1280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(15,185,177,0.08)_0%,rgba(99,102,241,0.05)_50%,transparent_70%)] blur-[32px]" />
      <div className="absolute -bottom-64 -right-80 h-[1024px] w-[1280px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(15,185,177,0.08)_0%,rgba(99,102,241,0.05)_50%,transparent_70%)] opacity-60 blur-[32px]" />
      <div className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(15,185,177,0.08)_0%,rgba(99,102,241,0.05)_50%,transparent_70%)] opacity-40 blur-[32px]" />
    </div>
  );
}

export function AuraAuthBranding() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="relative flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6063ee] shadow-[0_10px_15px_-3px_rgba(0,106,101,0.1),0_4px_6px_-4px_rgba(0,106,101,0.1)]"
        aria-hidden
      >
        <span className="material-symbols-outlined notranslate text-3xl text-white">
          local_pharmacy
        </span>
      </div>
      <h1 className="bg-gradient-to-r from-[#0d9488] to-[#4f46e5] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
        AuraPharma
      </h1>
      <p className="text-sm font-medium tracking-wide text-[var(--app-text-secondary)]">
        Clarity Around Every Prescription
      </p>
    </div>
  );
}

export function AuraAuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-md rounded-xl border border-white/40 bg-[var(--app-surface)]/80 p-8 pb-6 pt-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.06)] backdrop-blur-md">
      {children}
    </div>
  );
}

export function AuraAuthFooter() {
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center text-xs uppercase tracking-[0.12em] text-[#6c7a78]"
      aria-label="Legal"
    >
      <Link href="#" className="transition hover:text-[var(--app-brand)]">
        Privacy Policy
      </Link>
      <span className="opacity-20" aria-hidden>
        •
      </span>
      <Link href="#" className="transition hover:text-[var(--app-brand)]">
        Terms of Service
      </Link>
      <span className="opacity-20" aria-hidden>
        •
      </span>
      <Link href="#" className="transition hover:text-[var(--app-brand)]">
        Help Center
      </Link>
    </nav>
  );
}

type AuraFieldLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

export function AuraFieldLabel({
  htmlFor,
  children,
  className = "",
}: AuraFieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-2 block pl-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-text-secondary)] ${className}`}
    >
      {children}
    </label>
  );
}

type AuraInputWrapProps = {
  children: React.ReactNode;
  icon: string;
};

export function AuraInputWrap({ children, icon }: AuraInputWrapProps) {
  return (
    <div className="relative">
      <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-lg text-[#6c7a78]">
        {icon}
      </span>
      {children}
    </div>
  );
}

export function auraInputClassName() {
  return "w-full rounded-lg border border-transparent bg-[var(--app-input-bg)] py-4 pl-12 pr-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[rgba(108,122,120,0.6)] focus:border-[#006a65]/20 focus:ring-2 focus:ring-[#006a65]/25";
}

export function AuraGradientSubmit({
  children,
  icon = "arrow_forward",
  disabled = false,
}: {
  children: React.ReactNode;
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] px-6 py-4 text-base font-bold text-white shadow-[0_4px_6px_-1px_rgba(0,106,101,0.2),0_2px_4px_-2px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
      <span className="material-symbols-outlined notranslate text-sm">{icon}</span>
    </button>
  );
}
