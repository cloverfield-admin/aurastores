"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Shared shell for the web billing portal.
 *
 * Styling follows the same convention as the marketing landing: inline styles
 * lifted from the design comp, so the portal stays 1:1 with it without leaking a
 * one-off surface into the app's Tailwind theme. Tokens live here rather than in
 * each screen so the three pages cannot drift apart.
 */

export const FONT_DISPLAY = "var(--font-schibsted), 'Schibsted Grotesk', sans-serif";
export const FONT_BODY = "var(--font-manrope), 'Manrope', system-ui, sans-serif";
export const FONT_MONO = "var(--font-plex-mono), 'IBM Plex Mono', monospace";

export const C = {
  bg: "#f5f8f7",
  surface: "#ffffff",
  surfaceMuted: "#f2f6f5",
  tint: "#eef4f2",
  border: "#e3eae8",
  borderInput: "#dbe6e2",
  borderFaint: "#eef3f1",
  text: "#0c1c19",
  secondary: "#46574f",
  muted: "#5f7771",
  faint: "#7d918c",
  placeholder: "#9bafa9",
  primary: "#0d5c54",
  dark: "#07322e",
  mint: "#a9e3d6",
  mintText: "#7fcdbd",
  success: "#11756b",
  warn: "#bf6a43",
  warnBg: "#f7ece6",
  danger: "#c0342b",
} as const;

export const RADIUS = { card: 18, cardLg: 20, control: 12, button: 11, pill: 100 } as const;

/**
 * Material Symbols Rounded, as the design specifies. The three families are all
 * declared app-wide by `@material-symbols/font-400`, so this needs no extra
 * import — the rounded woff2 is fetched only on pages that use it.
 */
export function BillingIcon({
  name,
  size = 20,
  color,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className="notranslate"
      style={{
        fontFamily: "'Material Symbols Rounded'",
        fontWeight: 400,
        fontStyle: "normal",
        lineHeight: 1,
        letterSpacing: "normal",
        textTransform: "none",
        display: "inline-block",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        direction: "ltr",
        verticalAlign: "middle",
        fontFeatureSettings: "'liga'",
        fontVariationSettings: "'wght' 400, 'opsz' 24, 'FILL' 0",
        WebkitFontSmoothing: "antialiased",
        fontSize: size,
        color,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

/** The `aura` + `stores` lockup, next to the mark. */
export function BillingWordmark({ size = 17 }: { size?: number }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark.svg"
        alt=""
        width={size + 11}
        height={size + 11}
        style={{ display: "block" }}
      />
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: size, letterSpacing: "-0.03em" }}>
        <span style={{ fontWeight: 800, color: C.dark }}>aura</span>
        <span style={{ fontWeight: 500, color: "#4da899" }}>stores</span>
      </span>
    </span>
  );
}

/** Uppercase mono label — the design's eyebrow treatment. */
export function MonoLabel({
  children,
  color = C.faint,
  size = 10.5,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: size,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  background,
  color,
  style,
}: {
  children: ReactNode;
  background: string;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT_MONO,
        fontSize: 10.5,
        letterSpacing: "0.1em",
        fontWeight: 600,
        background,
        color,
        padding: "5px 11px",
        borderRadius: RADIUS.pill,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  padding = 24,
  style,
}: {
  children: ReactNode;
  padding?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.card,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Filled primary action: teal, white text, soft teal shadow. */
export const PRIMARY_BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  height: 52,
  width: "100%",
  background: C.primary,
  color: "#fff",
  border: "none",
  borderRadius: RADIUS.control,
  fontFamily: FONT_BODY,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(13,92,84,0.28)",
};

/** On dark surfaces the primary flips to mint with dark text. */
export const MINT_BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: C.mint,
  color: C.dark,
  border: "none",
  borderRadius: RADIUS.button,
  padding: "12px 22px",
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
};

export const GHOST_ON_DARK: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "transparent",
  color: "#fff",
  borderRadius: RADIUS.button,
  padding: "12px 22px",
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

export const INPUT_WRAP: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  height: 50,
  border: `1px solid ${C.borderInput}`,
  borderRadius: RADIUS.control,
  padding: "0 14px",
  marginTop: 8,
  background: C.surface,
};

export const BARE_INPUT: CSSProperties = {
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: FONT_BODY,
  fontSize: 14.5,
  color: C.text,
  minWidth: 0,
};

export const FIELD_LABEL: CSSProperties = {
  display: "block",
  fontFamily: FONT_BODY,
  fontSize: 13,
  fontWeight: 600,
  color: "#2f4540",
};

/** Page background + base typography for every billing screen. */
export function BillingShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        color: C.text,
        background: C.bg,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {children}
    </div>
  );
}

/** Signed-in top bar: brand, page title, role badge, user chip. */
export function BillingTopBar({
  roleLabel,
  userName,
}: {
  roleLabel: string | null;
  userName: string | null;
}) {
  const initial = (userName ?? "").trim().charAt(0).toUpperCase() || "•";
  return (
    <header
      style={{
        minHeight: 62,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 32px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <BillingWordmark />
        <span style={{ width: 1, height: 24, background: C.border }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>
          Billing &amp; plan
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {roleLabel ? (
          <Pill background={C.tint} color={C.primary}>
            {roleLabel}
          </Pill>
        ) : null}
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.pill,
            padding: "5px 14px 5px 6px",
            background: C.surface,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: C.primary,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {initial}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{userName ?? "Your account"}</span>
        </span>
      </div>
    </header>
  );
}

/** Muted note block with an icon — used for the role and org-wide advisories. */
export function NoteBlock({
  icon,
  children,
  background = C.surfaceMuted,
}: {
  icon: string;
  children: ReactNode;
  background?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 10, background, borderRadius: RADIUS.control, padding: 13 }}>
      <BillingIcon name={icon} size={18} color={C.primary} style={{ flexShrink: 0 }} />
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted, margin: 0 }}>{children}</p>
    </div>
  );
}
