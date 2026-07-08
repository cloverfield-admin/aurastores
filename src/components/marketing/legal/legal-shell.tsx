import type { ReactNode } from "react";
import Link from "next/link";
import { HomePageHeader } from "@/components/marketing/home-page-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { FONT_DISPLAY, FONT_MONO } from "@/components/marketing/landing/fonts";
import { Icon } from "@/components/marketing/landing/phone";
import { ROUTES } from "@/lib/routes";

export type LegalSection = {
  /** Anchor id (kebab-case) used by the table of contents. */
  id: string;
  title: string;
  body: ReactNode;
};

const POLICY_TABS = [
  { href: ROUTES.marketing.privacy, label: "Privacy policy", icon: "shield_person" },
  { href: ROUTES.marketing.terms, label: "Terms of service", icon: "gavel" },
  { href: ROUTES.marketing.security, label: "Security", icon: "encrypted" },
] as const;

export type LegalHighlight = {
  icon: string;
  title: string;
  body: string;
};

type LegalShellProps = {
  eyebrow: string;
  title: string;
  intro: string;
  /** Human-readable revision date, e.g. "8 July 2026". */
  updated: string;
  /** Pathname of the current page, used to highlight the active policy tab. */
  activePath: string;
  /** Optional trust-card row rendered between the hero and the sections. */
  highlights?: LegalHighlight[];
  sections: LegalSection[];
  contact: {
    heading: string;
    body: string;
    email: string;
  };
};

/**
 * Shared chrome for the marketing legal/trust subpages (privacy, terms,
 * security). Reuses the landing v2 palette; prose typography lives in
 * `globals.css` under `.legalprose`.
 */
export function LegalShell({
  eyebrow,
  title,
  intro,
  updated,
  activePath,
  highlights,
  sections,
  contact,
}: LegalShellProps) {
  return (
    <div className="aura-landing-v2">
      <HomePageHeader />

      <main>
        {/* HERO */}
        <section style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid #e3eae8" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -200,
              right: -160,
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(13,92,84,0.10), transparent 68%)",
            }}
          />
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 28px 56px", position: "relative" }}>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#0d5c54",
              }}
            >
              {eyebrow}
            </span>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(34px,4.6vw,54px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                margin: "16px 0 0",
                maxWidth: 720,
                textWrap: "balance",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: "clamp(16px,1.8vw,18px)",
                lineHeight: 1.6,
                color: "#46574f",
                maxWidth: 640,
                margin: "18px 0 0",
                textWrap: "pretty",
              }}
            >
              {intro}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 26 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 14px",
                  border: "1px solid #d3e2de",
                  background: "#fff",
                  borderRadius: 100,
                  fontFamily: FONT_MONO,
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#5f7771",
                }}
              >
                <Icon name="history" size={15} color="#0d5c54" />
                Last updated · {updated}
              </span>
            </div>

            {/* Policy switcher */}
            <nav
              aria-label="Legal pages"
              style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 30 }}
            >
              {POLICY_TABS.map((tab) => {
                const active = tab.href === activePath;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "10px 18px",
                      borderRadius: 11,
                      textDecoration: "none",
                      color: active ? "#fff" : "#0c1c19",
                      background: active ? "#0d5c54" : "#fff",
                      border: active ? "1px solid #0d5c54" : "1px solid #dbe6e2",
                      boxShadow: active ? "0 6px 16px rgba(13,92,84,0.24)" : undefined,
                    }}
                  >
                    <Icon name={tab.icon} size={17} color={active ? "#a9e3d6" : "#0d5c54"} />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>

        {/* HIGHLIGHT CARDS */}
        {highlights?.length ? (
          <div
            className="g3"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "56px 28px 0",
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 20,
            }}
          >
            {highlights.map((highlight) => (
              <div
                key={highlight.title}
                style={{ background: "#fff", border: "1px solid #e3eae8", borderRadius: 16, padding: 26 }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: "#eef4f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={highlight.icon} size={23} color="#0d5c54" />
                </div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, margin: "16px 0 0" }}>
                  {highlight.title}
                </h2>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: "#46574f", margin: "7px 0 0" }}>
                  {highlight.body}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* BODY */}
        <div className="legalgrid" style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 28px 0" }}>
          {/* Table of contents */}
          <aside className="legaltoc" aria-label="On this page">
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7d918c",
                padding: "0 12px 10px",
              }}
            >
              On this page
            </div>
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "#9db3ad", marginRight: 8 }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </a>
            ))}
          </aside>

          {/* Sections */}
          <article
            style={{
              background: "#fff",
              border: "1px solid #e3eae8",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="legalprose">
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11.5,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    color: "#0d5c54",
                    marginBottom: 10,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h2>{section.title}</h2>
                {section.body}
              </section>
            ))}
          </article>
        </div>

        {/* CONTACT BAND */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px 0" }}>
          <div
            className="legalcontact"
            style={{
              background: "#07322e",
              color: "#fff",
              borderRadius: 18,
              padding: "40px 44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 28,
              flexWrap: "wrap",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -140,
                right: -100,
                width: 340,
                height: 340,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(169,227,214,0.16), transparent 70%)",
              }}
            />
            <div style={{ maxWidth: 560, position: "relative" }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: 0 }}>
                {contact.heading}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#bcd6cf", margin: "10px 0 0" }}>{contact.body}</p>
            </div>
            <a
              href={`mailto:${contact.email}`}
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                fontSize: 15,
                fontWeight: 600,
                color: "#07322e",
                background: "#fff",
                padding: "14px 24px",
                borderRadius: 12,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="mail" size={19} color="#0d5c54" />
              {contact.email}
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
