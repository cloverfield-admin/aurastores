"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FONT_BODY, FONT_DISPLAY } from "@/components/marketing/landing/fonts";
import { Icon, LOGO_MARK } from "@/components/marketing/landing/phone";

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "#ecosystem", label: "Platform" },
  { href: "#stock", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#network", label: "Multi-branch" },
];

const NAV_LINK_STYLE: CSSProperties = {
  fontSize: 14.5,
  fontWeight: 500,
  color: "#46574f",
  textDecoration: "none",
};

export function HomePageHeaderClient() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,248,247,0.82)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: "1px solid #e3eae8",
      }}
    >
      <div
        className="navbar"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 28px",
          height: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          aria-label="AuraStores home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_MARK}
            alt=""
            style={{ width: 34, height: 34, display: "block", filter: "drop-shadow(0 4px 12px rgba(13,92,84,0.28))" }}
          />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, letterSpacing: "-0.03em" }}>
            <span style={{ fontWeight: 800, color: "#07322e" }}>aura</span>
            <span style={{ fontWeight: 500, color: "#4da899" }}>stores</span>
          </span>
        </Link>

        <nav className="navlinks" style={{ display: "flex", alignItems: "center", gap: 30 }} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} style={NAV_LINK_STYLE}>
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="navcta" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* No auth link. The web app is the platform console now — the only way in
                is /auth/sign-in, typed directly by staff. Advertising a login on the
                public marketing site would invite store owners into a door that is
                closed to them, and point everyone else at the console. */}
            <a
              href="#download"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14.5,
                fontWeight: 600,
                color: "#fff",
                background: "#0d5c54",
                padding: "10px 18px",
                borderRadius: 10,
                textDecoration: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 16px rgba(13,92,84,0.24)",
              }}
            >
              <Icon name="smartphone" size={18} />
              Get the app
            </a>
          </div>
          <button
            ref={buttonRef}
            type="button"
            className="navtoggle"
            aria-expanded={open}
            aria-controls="home-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            style={{
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              border: "1px solid #dbe6e2",
              background: "#fff",
              color: "#0c1c19",
              cursor: "pointer",
            }}
          >
            <Icon name={open ? "close" : "menu"} size={22} />
          </button>
        </div>
      </div>

      {open ? (
        <div
          ref={panelRef}
          id="home-mobile-nav"
          role="navigation"
          aria-label="Primary"
          style={{
            borderTop: "1px solid #e3eae8",
            background: "#f5f8f7",
            padding: "10px 20px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontFamily: FONT_BODY,
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ padding: "12px 6px", fontSize: 15, fontWeight: 600, color: "#0c1c19", textDecoration: "none" }}
            >
              {link.label}
            </a>
          ))}
          <div style={{ marginTop: 6, borderTop: "1px solid #e3eae8", paddingTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* No auth link here either — see the desktop nav above. */}
            <a
              href="#download"
              onClick={() => setOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                background: "#0d5c54",
                padding: "12px 18px",
                borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(13,92,84,0.24)",
              }}
            >
              <Icon name="smartphone" size={18} />
              Get the app
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
