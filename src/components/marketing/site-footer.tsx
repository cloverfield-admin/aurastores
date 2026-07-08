import Link from "next/link";
import { FONT_DISPLAY, FONT_MONO } from "@/components/marketing/landing/fonts";
import { LOGO_MARK } from "@/components/marketing/landing/phone";
import { ROUTES } from "@/lib/routes";

const COLUMN_HEADING = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#6f928a",
} as const;

const FOOT_LINK = { fontSize: 14, color: "#cfe2dc", textDecoration: "none" } as const;

/** Dark site footer shared by the landing page and marketing subpages (legal, security). */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
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
          <div style={COLUMN_HEADING}>Products</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
            <Link href="/#stock" style={FOOT_LINK}>Aura Stock</Link>
            <Link href="/#sales" style={FOOT_LINK}>Aura Sales</Link>
            <Link href="/#ecosystem" style={FOOT_LINK}>Aura Pay</Link>
            <Link href="/#ecosystem" style={FOOT_LINK}>Aura Insights</Link>
            <Link href="/#download" style={FOOT_LINK}>Get the app</Link>
          </div>
        </div>

        <div>
          <div style={COLUMN_HEADING}>Company</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
            <span style={{ fontSize: 14, color: "#cfe2dc" }}>About us</span>
            <span style={{ fontSize: 14, color: "#cfe2dc" }}>Careers</span>
          </div>
        </div>

        <div>
          <div style={COLUMN_HEADING}>Legal</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 16 }}>
            <Link href={ROUTES.marketing.privacy} style={FOOT_LINK}>Privacy policy</Link>
            <Link href={ROUTES.marketing.terms} style={FOOT_LINK}>Terms of service</Link>
            <Link href={ROUTES.marketing.security} style={FOOT_LINK}>Security</Link>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "22px 28px", fontSize: 13, color: "#6f928a" }}>
          © {year} AuraStores. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
