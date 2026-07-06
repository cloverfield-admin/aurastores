import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { HomePageHeader } from "@/components/marketing/home-page-header";
import { DownloadCta } from "@/components/marketing/landing/download-cta.client";
import { StockPhone, SalesPhone } from "@/components/marketing/landing/feature-mockups";
import { HeroCarousel } from "@/components/marketing/landing/hero-carousel.client";
import type { HeroScreen } from "@/components/marketing/landing/hero-carousel.client";
import {
  DashboardSlide,
  CheckoutSlide,
  InsightsSlide,
  ExpensesSlide,
} from "@/components/marketing/landing/hero-slides";
import { FONT_DISPLAY, FONT_MONO } from "@/components/marketing/landing/fonts";
import { Icon, LOGO_MARK } from "@/components/marketing/landing/phone";
import { PricingCards } from "@/components/marketing/landing/pricing-cards.client";
import { Reveal } from "@/components/marketing/landing/reveal.client";
import { buildLandingPlans } from "@/lib/marketing/landing-pricing";
import { services } from "@/lib/di";
import { getSiteUrl } from "@/lib/site-url";

const homeTitle = "AuraStores — Every store, in your pocket";
const homeDescription =
  "Run inventory, checkout, and payouts from the phone in your hand. Built for pharmacies, retail shops, and growing multi-branch chains across Zambia.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: { title: homeTitle, description: homeDescription, url: "/" },
  twitter: { title: homeTitle, description: homeDescription },
};

const HERO_SCREENS: HeroScreen[] = [
  { label: "Dashboard", icon: "space_dashboard", caption: "NETWORK OVERVIEW · EVERY BRANCH, LIVE, AT A GLANCE" },
  { label: "Checkout", icon: "point_of_sale", caption: "NEW SALE · RING UP A BASKET IN SECONDS" },
  { label: "Insights", icon: "insights", caption: "AURA INSIGHTS · RISK SIGNALS & REORDER SUGGESTIONS" },
  { label: "Expenses", icon: "account_balance_wallet", caption: "BRANCH EXPENSES · SPEND, CHARGES & RESTOCKING" },
];

function HomeJsonLd() {
  const siteUrl = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "AuraStores", url: siteUrl },
      { "@type": "WebSite", name: "AuraStores", url: siteUrl, description: homeDescription },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

function Eyebrow({ children, color = "#0d5c54" }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </span>
  );
}

const SECTION: CSSProperties = { maxWidth: 1200, margin: "0 auto", padding: "104px 28px 0" };

const ECOSYSTEM_CARD: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3eae8",
  borderRadius: 16,
  padding: 30,
};

function FeatureBullet({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: "#eef4f2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={22} color="#0d5c54" />
      </div>
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5 }}>{title}</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#46574f", margin: "5px 0 0" }}>{body}</p>
      </div>
    </div>
  );
}

function NetworkCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 28,
      }}
    >
      <Icon name={icon} size={26} color="#a9e3d6" />
      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, margin: "16px 0 0" }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: "#a7c5bd", margin: "8px 0 0" }}>{body}</p>
    </div>
  );
}

function TrustPoint({ icon, title, body, divider }: { icon: string; title: string; body: string; divider?: boolean }) {
  return (
    <div
      className={divider ? "trustdiv" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        borderLeft: divider ? "1px solid #eef3f1" : undefined,
        paddingLeft: divider ? 24 : undefined,
      }}
    >
      <Icon name={icon} size={26} color="#0d5c54" />
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, fontFamily: FONT_DISPLAY }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#5f7771" }}>{body}</div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const year = new Date().getFullYear();
  const plans = await services.billing.listPublicPlans("ZMW");
  const landingPlans = buildLandingPlans(plans);

  return (
    <div className="aura-landing-v2">
      <HomeJsonLd />
      <HomePageHeader />

      <main>
        {/* HERO */}
        <section style={{ position: "relative", overflow: "hidden" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -180,
              right: -140,
              width: 560,
              height: 560,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(13,92,84,0.10), transparent 68%)",
            }}
          />
          <div
            className="herogrid"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "72px 28px 88px",
              display: "grid",
              gridTemplateColumns: "1.06fr 1fr",
              gap: 48,
              alignItems: "center",
              position: "relative",
            }}
          >
            <div className="herocopy" style={{ maxWidth: 600 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 14px 7px 11px",
                  border: "1px solid #d3e2de",
                  background: "#fff",
                  borderRadius: 100,
                  boxShadow: "0 2px 8px rgba(12,28,25,0.04)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#11756b",
                    animation: "auraPulse 2.4s ease-out infinite",
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11.5,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#5f7771",
                  }}
                >
                  Mobile-first store operations
                </span>
              </div>
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(42px,5.6vw,70px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.035em",
                  margin: "26px 0 0",
                  textWrap: "balance",
                }}
              >
                Every store,
                <br />
                <span style={{ color: "#0d5c54" }}>in your pocket</span>
              </h1>
              <p
                style={{
                  fontSize: "clamp(17px,2vw,19.5px)",
                  lineHeight: 1.55,
                  color: "#46574f",
                  maxWidth: 520,
                  margin: "22px 0 0",
                  textWrap: "pretty",
                }}
              >
                Inventory, checkout, and payouts — run from the phone already in your hand. Built for
                pharmacies, retail shops, and growing multi-branch chains across Zambia.
              </p>
              <div className="herocta" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 32 }}>
                <a
                  href="#download"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 15.5,
                    fontWeight: 600,
                    color: "#fff",
                    background: "#0d5c54",
                    padding: "15px 26px",
                    borderRadius: 12,
                    textDecoration: "none",
                    boxShadow: "0 10px 26px rgba(13,92,84,0.30)",
                  }}
                >
                  <Icon name="smartphone" size={20} />
                  Download the app
                </a>
                <a
                  href="#stock"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    fontSize: 15.5,
                    fontWeight: 600,
                    color: "#0c1c19",
                    background: "#fff",
                    padding: "15px 24px",
                    borderRadius: 12,
                    textDecoration: "none",
                    border: "1px solid #dbe6e2",
                  }}
                >
                  <Icon name="play_circle" size={19} color="#0d5c54" />
                  See it in action
                </a>
              </div>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#7d918c", marginTop: 18, letterSpacing: "0.02em" }}>
                iOS &amp; Android · Same account on the web · No card required to start
              </p>
            </div>

            <HeroCarousel screens={HERO_SCREENS}>
              <DashboardSlide />
              <CheckoutSlide />
              <InsightsSlide />
              <ExpensesSlide />
            </HeroCarousel>
          </div>
        </section>

        {/* TRUST POINTS */}
        <section style={{ background: "#fff", borderTop: "1px solid #e3eae8", borderBottom: "1px solid #e3eae8" }}>
          <div
            className="trust3"
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "34px 28px",
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
            }}
          >
            <TrustPoint
              icon="mobile_friendly"
              title="Built for one hand"
              body="Every workflow — from checkout to payouts — fits on the shop floor."
            />
            <TrustPoint
              icon="hub"
              title="One source of truth"
              body="Head office and the floor see the same data, live."
              divider
            />
            <TrustPoint
              icon="encrypted"
              title="Bank-grade security"
              body="Encrypted in transit and at rest, role-based access."
              divider
            />
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section id="ecosystem" className="sec" style={{ ...SECTION, scrollMarginTop: 90 }}>
          <Reveal style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
            <Eyebrow>The Aura ecosystem</Eyebrow>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px,4vw,46px)",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                margin: "14px 0 0",
              }}
            >
              Modules that run the day, and inform the year
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#46574f", margin: "16px 0 0" }}>
              Integrated tools for day-to-day store operations and leadership visibility — all in the
              app, no spreadsheets in between.
            </p>
          </Reveal>

          <Reveal
            className="g3"
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 48 }}
          >
            <div style={ECOSYSTEM_CARD}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "#eef4f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="inventory_2" size={24} color="#0d5c54" />
              </div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, margin: "18px 0 0", letterSpacing: "-0.01em" }}>
                Aura Stock
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#46574f", margin: "9px 0 0" }}>
                Real-time inventory with product-level precision, expiry tracking, and automated
                reordering logic.
              </p>
              <a
                href="#stock"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0d5c54",
                  textDecoration: "none",
                  marginTop: 16,
                }}
              >
                Learn more
                <Icon name="arrow_forward" size={17} />
              </a>
            </div>

            <div style={ECOSYSTEM_CARD}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "#eef4f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="analytics" size={24} color="#0d5c54" />
              </div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, margin: "18px 0 0", letterSpacing: "-0.01em" }}>
                Aura Sales
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#46574f", margin: "9px 0 0" }}>
                Dashboards that show what sells, when it moves, and where margin leaks — by branch,
                category, or channel.
              </p>
              <a
                href="#sales"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0d5c54",
                  textDecoration: "none",
                  marginTop: 16,
                }}
              >
                Learn more
                <Icon name="arrow_forward" size={17} />
              </a>
            </div>

            <div style={ECOSYSTEM_CARD}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "#eef4f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="payments" size={24} color="#0d5c54" />
              </div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, margin: "18px 0 0", letterSpacing: "-0.01em" }}>
                Aura Pay
              </h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#46574f", margin: "9px 0 0" }}>
                Unified reconciliation for cash, card, and mobile money — without the end-of-day
                paperwork.
              </p>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#bf6a43",
                  marginTop: 16,
                  fontFamily: FONT_MONO,
                  letterSpacing: "0.04em",
                }}
              >
                COMING SOON
              </span>
            </div>
          </Reveal>

          <Reveal className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
            <div
              style={{
                background: "#07322e",
                borderRadius: 16,
                padding: 30,
                display: "flex",
                alignItems: "center",
                gap: 20,
                color: "#fff",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="insights" size={26} color="#a9e3d6" />
              </div>
              <div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, margin: 0 }}>Aura Insights</h3>
                <p style={{ fontSize: 14, color: "#bcd6cf", margin: "6px 0 0", lineHeight: 1.5 }}>
                  Predictive analytics that flag underpriced and overstocked categories before they cost
                  you.
                </p>
              </div>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e3eae8",
                borderRadius: 16,
                padding: 30,
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: "#eef4f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="sync_alt" size={26} color="#0d5c54" />
              </div>
              <div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, margin: 0 }}>Aura Sync</h3>
                <p style={{ fontSize: 14, color: "#46574f", margin: "6px 0 0", lineHeight: 1.5 }}>
                  Cloud synchronization that keeps stock, prices, and staff context aligned across every
                  branch.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FEATURE: STOCK */}
        <section id="stock" className="sec" style={{ ...SECTION, scrollMarginTop: 90 }}>
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <Reveal>
              <Eyebrow>Precision control</Eyebrow>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(28px,3.4vw,40px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  margin: "14px 0 0",
                }}
              >
                Aura Stock: your stockroom, on your phone
              </h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "#46574f", margin: "16px 0 0" }}>
                Cut waste, protect margin, and never lose a sale to an empty shelf. Count, receive, and
                reorder from the aisle — no back-office trip required.
              </p>
              <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 22 }}>
                <FeatureBullet
                  icon="verified"
                  title="Product & expiry tracking"
                  body="Automated alerts for nearing expirations and slow movers so you cut waste before it hits the books."
                />
                <FeatureBullet
                  icon="autorenew"
                  title="Automated reordering"
                  body="Dynamic stock levels that learn from sales history to prevent out-of-stock scenarios."
                />
                <FeatureBullet
                  icon="barcode_scanner"
                  title="Scan with your camera"
                  body="Add products, run counts, and ring up sales with the barcode scanner built into the app."
                />
              </div>
            </Reveal>

            <Reveal style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 420,
                  height: 420,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(13,92,84,0.12), transparent 70%)",
                }}
              />
              <StockPhone />
            </Reveal>
          </div>
        </section>

        {/* FEATURE: SALES */}
        <section id="sales" className="sec" style={{ ...SECTION, scrollMarginTop: 90 }}>
          <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
            <Reveal className="media2" style={{ position: "relative", display: "flex", justifyContent: "center", order: 1 }}>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: 420,
                  height: 420,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(13,92,84,0.12), transparent 70%)",
                }}
              />
              <SalesPhone />
            </Reveal>

            <Reveal className="copy1" style={{ order: 2 }}>
              <Eyebrow>Growth insights</Eyebrow>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(28px,3.4vw,40px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  margin: "14px 0 0",
                }}
              >
                Aura Sales: act on trends, not spreadsheets
              </h2>
              <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "#46574f", margin: "16px 0 0" }}>
                Stop guessing what&apos;s selling. Aura Sales surfaces velocity, basket mix, and branch
                comparisons the moment they shift — wherever you are.
              </p>
              <figure
                style={{
                  margin: "28px 0 0",
                  padding: "24px 26px",
                  background: "#fff",
                  borderRadius: "0 14px 14px 0",
                  border: "1px solid #e3eae8",
                  borderLeft: "3px solid #0d5c54",
                }}
              >
                <blockquote
                  style={{
                    margin: 0,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 500,
                    fontSize: 18,
                    lineHeight: 1.5,
                    letterSpacing: "-0.01em",
                    color: "#0c1c19",
                  }}
                >
                  &ldquo;We increased our margin by 14% in the first quarter by doubling down on the
                  categories Aura flagged as underpriced and overstocked.&rdquo;
                </blockquote>
                <figcaption style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#0d5c54",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    ZT
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Zanele Tembo</div>
                    <div style={{ fontSize: 13, color: "#5f7771" }}>Owner, Health First Pharmacy</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* NETWORK BAND */}
        <section
          id="network"
          style={{ marginTop: 104, background: "#07322e", color: "#fff", position: "relative", overflow: "hidden", scrollMarginTop: 68 }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -120,
              right: -80,
              width: 420,
              height: 420,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(169,227,214,0.14), transparent 70%)",
            }}
          />
          <div className="secdark" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 28px", position: "relative" }}>
            <Reveal style={{ maxWidth: 640 }}>
              <Eyebrow color="#7fcdbd">Multi-branch</Eyebrow>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(30px,4vw,46px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  margin: "14px 0 0",
                }}
              >
                One network. Complete control. Any phone.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: "#bcd6cf", margin: "16px 0 0" }}>
                Whether you manage three branches or three hundred, Aura Sync keeps stock, prices, and
                staff context aligned — so head office and the floor see the same truth, from the same
                app.
              </p>
            </Reveal>
            <Reveal className="g3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 48 }}>
              <NetworkCard
                icon="workspaces"
                title="Centralized hub"
                body="Switch between branch views with a single tap in the Aura Toggle."
              />
              <NetworkCard
                icon="sync"
                title="Instant sync"
                body="A stock change in Branch A appears in head-office reports immediately."
              />
              <NetworkCard
                icon="shield_lock"
                title="Built-in security"
                body="Role-based access for your team, with encryption in transit and at rest."
              />
            </Reveal>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="sec" style={{ ...SECTION, scrollMarginTop: 90 }}>
          <Reveal style={{ textAlign: "center", maxWidth: 660, margin: "0 auto" }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: "clamp(30px,4vw,46px)",
                lineHeight: 1.06,
                letterSpacing: "-0.03em",
                margin: "14px 0 0",
              }}
            >
              Scalable from first store to full chain
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: "#46574f", margin: "16px 0 0" }}>
              Transparent pricing for every stage of growth — from a single location to a multi-branch
              operation.
            </p>
          </Reveal>

          <PricingCards plans={landingPlans} />

          <p style={{ textAlign: "center", fontFamily: FONT_MONO, fontSize: 12, color: "#7d918c", marginTop: 24 }}>
            Basic &amp; Pro: 7-day free trial on your first paid plan, then regular billing.
          </p>
        </section>

        {/* DOWNLOAD / FINAL CTA */}
        <DownloadCta />
      </main>

      {/* FOOTER */}
      <footer style={{ marginTop: 96, background: "#052420", color: "#fff" }}>
        <div
          className="foot"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "64px 28px 40px",
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            gap: 40,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_MARK} alt="AuraStores logo" style={{ width: 32, height: 32, display: "block" }} />
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>AuraStores</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#8fb0a8", margin: "16px 0 0", maxWidth: 280 }}>
              One mobile-first platform for pharmacies, retail, and multi-location chains across Zambia.
            </p>
          </div>

          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f928a" }}>
              Products
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              <a href="#ecosystem" style={{ fontSize: 14, color: "#cfe2dc", textDecoration: "none" }}>Aura Stock</a>
              <a href="#sales" style={{ fontSize: 14, color: "#cfe2dc", textDecoration: "none" }}>Aura Sales</a>
              <a href="#ecosystem" style={{ fontSize: 14, color: "#cfe2dc", textDecoration: "none" }}>Aura Pay</a>
              <a href="#ecosystem" style={{ fontSize: 14, color: "#cfe2dc", textDecoration: "none" }}>Aura Insights</a>
              <a href="#download" style={{ fontSize: 14, color: "#cfe2dc", textDecoration: "none" }}>Get the app</a>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f928a" }}>
              Company
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              <span style={{ fontSize: 14, color: "#cfe2dc" }}>About us</span>
              <span style={{ fontSize: 14, color: "#cfe2dc" }}>Careers</span>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f928a" }}>
              Legal
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
              <span style={{ fontSize: 14, color: "#cfe2dc" }}>Privacy policy</span>
              <span style={{ fontSize: 14, color: "#cfe2dc" }}>Terms of service</span>
              <span style={{ fontSize: 14, color: "#cfe2dc" }}>Security</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 28px", fontSize: 13, color: "#6f928a" }}>
            © {year} AuraStores. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
