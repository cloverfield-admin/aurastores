"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";

const gradientBtnSm =
  "relative rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-6 py-2.5 text-center text-sm font-semibold text-white shadow-[0_10px_15px_-3px_rgba(15,185,177,0.2),0_4px_6px_-4px_rgba(15,185,177,0.2)] transition hover:opacity-95";

const navLinkClass =
  "block rounded-lg px-4 py-3 text-sm font-semibold text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0fb9b1]";

const navLinkActiveClass =
  "block rounded-lg px-4 py-3 text-sm font-semibold text-[#0fb9b1] bg-[#f0fdfa]";

export function HomePageHeader() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocPointer = (event: MouseEvent | TouchEvent) => {
      const t = event.target as Node;
      if (
        panelRef.current?.contains(t)
        || buttonRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("touchstart", onDocPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("touchstart", onDocPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/5 bg-white/80 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-4 sm:px-8">
        <Link href="/" className="min-w-0 shrink-0">
          <span className="bg-gradient-to-r from-[#0fb9b1] to-[#6366f1] bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            AuraPharma
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex" aria-label="Primary">
          <a
            href="#ecosystem"
            className="border-b-2 border-[#0fb9b1] pb-1.5 text-sm font-semibold text-[#0fb9b1]"
          >
            Features
          </a>
          <a
            href="#network"
            className="text-sm font-semibold text-[#475569] transition hover:text-[#0fb9b1]"
          >
            Solutions
          </a>
          <a
            href="#pricing"
            className="text-sm font-semibold text-[#475569] transition hover:text-[#0fb9b1]"
          >
            Pricing
          </a>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative md:hidden">
            <button
              ref={buttonRef}
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-[#475569] hover:bg-[#f1f5f9]"
              aria-expanded={open}
              aria-controls="home-mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="material-symbols-outlined notranslate text-2xl">
                {open ? "close" : "menu"}
              </span>
            </button>
            {open ? (
              <div
                ref={panelRef}
                id="home-mobile-nav"
                className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,16rem)] rounded-xl border border-black/5 bg-white py-2 shadow-lg"
                role="navigation"
                aria-label="Primary"
              >
                <a
                  href="#ecosystem"
                  className={navLinkActiveClass}
                  onClick={() => setOpen(false)}
                >
                  Features
                </a>
                <a href="#network" className={navLinkClass} onClick={() => setOpen(false)}>
                  Solutions
                </a>
                <a href="#pricing" className={navLinkClass} onClick={() => setOpen(false)}>
                  Pricing
                </a>
              </div>
            ) : null}
          </div>

          <Link href={ROUTES.demoSuccess} className={`${gradientBtnSm} whitespace-nowrap px-4 py-2 text-xs sm:px-6 sm:py-2.5 sm:text-sm`}>
            Book a Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
