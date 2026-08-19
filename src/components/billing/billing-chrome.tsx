"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api/version";
import { createQueryIdbPersister } from "@/lib/query-idb-persister";
import { ROUTES } from "@/lib/routes";

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
  className,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={className}
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
      className="aura-bill-card"
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

/**
 * Phone layout for the whole portal.
 *
 * The screens are built from inline styles lifted straight from the design comp
 * (see the note at the top of this file), which is fine until a 375px handset —
 * and a store owner paying a mobile-money bill is on a handset far more often
 * than at a desk. Inline styles beat class rules, so every override here needs
 * `!important`; that is the cost of keeping the desktop rendering 1:1 with the
 * comp rather than rewriting it into utility classes.
 *
 * Nothing above 560px is touched, so the desktop and tablet renderings are
 * byte-identical to what they were.
 */
const RESPONSIVE_CSS = `
@media (max-width: 560px){
  .aura-bill-main{padding:20px 16px 40px !important}
  .aura-bill-card{padding:18px !important}
  .aura-bill-hero{padding:20px !important;min-height:0 !important}
  .aura-bill-topbar{padding:10px 16px !important;gap:10px !important}
  .aura-bill-topbar-left{gap:12px !important}
  .aura-bill-topbar-right{flex-wrap:wrap !important;justify-content:flex-end !important;row-gap:8px !important}
  .aura-bill-display{font-size:28px !important;line-height:1.15 !important}
  .aura-bill-wrap{flex-wrap:wrap !important}
  /* Actions go full width and stack: two half-width buttons at 250px are two
     lines of wrapped text each. */
  .aura-bill-actions{width:100% !important;flex-direction:column !important;align-items:stretch !important}
  .aura-bill-actions > *{width:100% !important;justify-content:center !important;text-align:center !important}
  /* The payment-history table stops being a table. Four columns inside 250px
     scrolled sideways in a card whose header stayed put — each payment becomes
     its own block instead, labelled from the cell's own data-label. */
  .aura-billing-history{overflow-x:visible !important}
  .aura-bill-history-head{display:none !important}
  .aura-bill-history-row{grid-template-columns:1fr !important;min-width:0 !important;gap:6px !important;padding:16px !important}
  .aura-bill-history-row > *{display:flex !important;justify-content:space-between !important;align-items:center !important;gap:12px !important}
  .aura-bill-history-row > *::before{content:attr(data-label);font-family:${"var(--aura-bill-mono, monospace)"};font-size:10px;letter-spacing:0.1em;color:${C.muted};flex-shrink:0}
  /* Decorative labels that would starve a real control of width. */
  .aura-bill-hide-narrow{display:none !important}
  /* The checkout summary's fixed right rail. */
  .aura-checkout-grid{grid-template-columns:1fr !important}
}`;

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
        // The mono face is a next/font CSS variable, so the ::before labels
        // above can only reach it through a custom property set here.
        ["--aura-bill-mono" as string]: FONT_MONO,
      }}
    >
      <style>{RESPONSIVE_CSS}</style>
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  /**
   * Signs out and leaves nothing behind.
   *
   * The cached plan, invoices and org name are somebody's billing details, and
   * this portal is the one part of the web app a store owner uses — often on a
   * shared machine. So the in-memory cache is cleared and the persisted copy
   * removed, not just the cookie dropped.
   */
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch(apiUrl("/auth/sign-out"), { method: "POST" }).catch(() => null);
      await queryClient.cancelQueries();
      queryClient.clear();
      await Promise.resolve(createQueryIdbPersister().removeClient()).catch(() => null);
    } finally {
      // Back to the portal's own door, not the console's — that one refuses
      // store owners outright.
      router.push(ROUTES.billing.signIn);
      router.refresh();
    }
  }

  return (
    <header
      className="aura-bill-topbar"
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
      <div className="aura-bill-topbar-left" style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <BillingWordmark />
        <span style={{ width: 1, height: 24, background: C.border }} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>
          Billing &amp; plan
        </span>
      </div>
      <div
        className="aura-bill-topbar-right"
        style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
      >
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
            // Without this a long full name pushes the sign-out button off the
            // right edge on a phone: the chip is in a nowrap row of its own.
            minWidth: 0,
            maxWidth: "100%",
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
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userName ?? "Your account"}
          </span>
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sign out"
          title="Sign out"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: `1px solid ${C.border}`,
            background: C.surface,
            borderRadius: RADIUS.pill,
            padding: "7px 14px",
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 600,
            color: C.secondary,
            cursor: signingOut ? "default" : "pointer",
            opacity: signingOut ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          <BillingIcon name="logout" size={17} color={C.muted} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
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
