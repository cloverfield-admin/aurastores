import type { CSSProperties, ReactNode } from "react";
import { FONT_DISPLAY, FONT_MONO } from "./fonts";
import { Icon, LOGO_MARK, PhoneTabBar } from "./phone";

const SLIDE: CSSProperties = {
  height: "100%",
  display: "block",
  background: "#f5f8f7",
  padding: "60px 22px 0",
  overflow: "hidden",
  position: "relative",
};

const CARD: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3eae8",
  borderRadius: 15,
  padding: 14,
};

const CARD_LG: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3eae8",
  borderRadius: 17,
  padding: 18,
};

const BADGE_TEAL: CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 8.5,
  fontWeight: 600,
  color: "#0d5c54",
  background: "#e7f1ef",
  padding: "3px 7px",
  borderRadius: 100,
};

function DarkGlow() {
  return (
    <div
      style={{
        position: "absolute",
        top: -70,
        right: -50,
        width: 190,
        height: 190,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(169,227,214,0.16), transparent 70%)",
      }}
    />
  );
}

function Avatar() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "#0d5c54",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      TT
    </div>
  );
}

function SlideHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_MARK} alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", color: "#7d918c" }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.02em" }}>
            {title}
          </div>
        </div>
      </div>
      <Avatar />
    </div>
  );
}

function StatCard({
  icon,
  badge,
  value,
  label,
}: {
  icon: string;
  badge?: string;
  value: string;
  label: string;
}) {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Icon name={icon} size={18} color="#0d5c54" />
        {badge ? <span style={BADGE_TEAL}>{badge}</span> : null}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: "-0.02em",
          marginTop: 10,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", color: "#7d918c", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

/** Two-tone risk / velocity meter row (label · value · progress bar). */
function MeterRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", color: "#7d918c" }}>
          {label}
        </span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14 }}>{value}</span>
      </div>
      <div style={{ height: 7, background: "#eef3f1", borderRadius: 4, overflow: "hidden", marginTop: 7 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 1 · Dashboard                                                 */
/* ------------------------------------------------------------------ */
export function DashboardSlide() {
  return (
    <div style={SLIDE}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_MARK} alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", color: "#7d918c" }}>
              NETWORK OVERVIEW
            </div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 16.5,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Good morning, Thulani
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              border: "1px solid #e3eae8",
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Icon name="notifications" size={18} color="#0c1c19" />
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 10,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#bf6a43",
                border: "1.5px solid #fff",
              }}
            />
          </div>
          <Avatar />
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 14 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 12px",
            border: "1px solid #dbe6e2",
            borderRadius: 100,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Icon name="calendar_month" size={15} color="#0d5c54" />
          Last 30 days
          <Icon name="expand_more" size={15} color="#9bafa9" />
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 12px",
            border: "1px solid #dbe6e2",
            borderRadius: 100,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          All branches
          <Icon name="expand_more" size={15} color="#9bafa9" />
        </span>
      </div>

      <div
        style={{
          background: "#07322e",
          borderRadius: 18,
          padding: 20,
          marginTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DarkGlow />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.14em", color: "#7fcdbd" }}>
            NETWORK REVENUE
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 9.5,
              fontWeight: 600,
              color: "#07322e",
              background: "#a9e3d6",
              padding: "4px 9px",
              borderRadius: 100,
            }}
          >
            +40.1% vs prior 30d
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 31,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginTop: 9,
            position: "relative",
          }}
        >
          ZMW 54,652.00
        </div>
        <div style={{ fontSize: 11.5, color: "#bcd6cf", marginTop: 5, position: "relative" }}>
          Gross profit ZMW 24,552.29 · COGS ZMW 26,134.71
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <StatCard icon="inventory_2" badge="0 LOW-STOCK" value="100%" label="STOCK INTEGRITY" />
        <StatCard icon="groups" badge="2 ACTIVE" value="2 / 2" label="STAFF DEPLOYED" />
        <StatCard icon="bar_chart_4_bars" value="2,922" label="UNITS SOLD · 30D" />
        <StatCard icon="receipt_long" value="292" label="SALES · 30D" />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em" }}>
          Branches
        </span>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: "#0d5c54" }}
        >
          <Icon name="add" size={16} />
          Add branch
        </span>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e3eae8",
          borderRadius: 16,
          overflow: "hidden",
          marginTop: 9,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            height: 84,
            backgroundImage:
              "repeating-linear-gradient(0deg,#dfe9e6 0 2px,transparent 2px 30px),repeating-linear-gradient(90deg,#dfe9e6 0 2px,transparent 2px 30px)",
            backgroundColor: "#ecf2f0",
          }}
        >
          <Icon
            name="location_on"
            size={27}
            color="#0d5c54"
            style={{ position: "absolute", left: "50%", top: "72%", transform: "translate(-50%,-100%)" }}
          />
          <span
            style={{
              position: "absolute",
              top: 9,
              right: 9,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#fff",
              borderRadius: 100,
              padding: "4px 10px",
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#0d5c54",
              boxShadow: "0 2px 6px rgba(12,28,25,0.12)",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#11756b" }} />
            ONLINE
          </span>
        </div>
        <div style={{ padding: "13px 15px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
              Ibex Hill
            </span>
            <Icon name="open_in_new" size={17} color="#9bafa9" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#5f7771" }}>Sales (1d)</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>ZMW 2,426.00</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#5f7771" }}>Units sold (1d)</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>116</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#5f7771" }}>Lead staff</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>T. Tembo</span>
            </div>
          </div>
        </div>
      </div>

      <PhoneTabBar active="home" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 · Checkout                                                  */
/* ------------------------------------------------------------------ */
function CheckoutLine({ name, sku, qty }: { name: string; sku: string; qty: number }) {
  return (
    <div
      style={{
        ...CARD,
        borderRadius: 15,
        padding: "13px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{name}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#7d918c", marginTop: 2 }}>{sku}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
        <span
          style={{
            width: 28,
            height: 28,
            border: "1px solid #dbe6e2",
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="remove" size={15} color="#5f7771" />
        </span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14 }}>{qty}</span>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: "#0d5c54",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="add" size={15} color="#fff" />
        </span>
      </div>
    </div>
  );
}

export function CheckoutSlide() {
  return (
    <div style={SLIDE}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "1px solid #e3eae8",
            borderRadius: 12,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow_back" size={19} />
        </div>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", color: "#7d918c" }}>
            NEW SALE · IBEX HILL
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>
            Checkout
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          height: 44,
          background: "#fff",
          border: "1px solid #dbe6e2",
          borderRadius: 12,
          padding: "0 13px",
          marginTop: 14,
        }}
      >
        <Icon name="barcode_scanner" size={18} color="#9bafa9" />
        <span style={{ fontSize: 13, color: "#9bafa9" }}>Scan or search products…</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
        <CheckoutLine name="Paracetamol 500mg" sku="SKU: PCM-500 · ZMW 18.00" qty={4} />
        <CheckoutLine name="Amoxicillin 250mg caps" sku="SKU: AMX-250 · ZMW 96.00" qty={2} />
        <CheckoutLine name="Vitamin C 1000mg" sku="SKU: VTC-1K · ZMW 111.00" qty={1} />
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 13px",
            borderRadius: 100,
            background: "#07322e",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Icon name="payments" size={15} color="#a9e3d6" />
          Cash
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 13px",
            border: "1px solid #dbe6e2",
            borderRadius: 100,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            color: "#46574f",
          }}
        >
          Card
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 34,
            padding: "0 13px",
            border: "1px solid #dbe6e2",
            borderRadius: 100,
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            color: "#46574f",
          }}
        >
          Mobile money
        </span>
      </div>

      <div style={{ ...CARD, borderRadius: 16, padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: "#5f7771" }}>Subtotal · 7 units</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600 }}>ZMW 450.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 12.5, color: "#5f7771" }}>VAT (8%)</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600 }}>ZMW 36.00</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid #eef3f1",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 21, letterSpacing: "-0.02em" }}>
            ZMW 486.00
          </span>
        </div>
      </div>

      <div
        style={{
          ...CARD,
          borderRadius: 15,
          padding: "13px 14px",
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="person" size={18} color="#0d5c54" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#46574f" }}>Walk-in customer</span>
        </div>
        <Icon name="expand_more" size={17} color="#9bafa9" />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 5,
          padding: "14px 22px 24px",
          background: "linear-gradient(180deg, rgba(245,248,247,0), #f5f8f7 40%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            height: 52,
            borderRadius: 14,
            background: "#0d5c54",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 10px 24px rgba(13,92,84,0.32)",
          }}
        >
          <Icon name="check" size={20} />
          Complete sale
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 3 · Insights                                                  */
/* ------------------------------------------------------------------ */
function InsightPill({ children, color, background }: { children: ReactNode; color: string; background: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 9.5,
        color,
        background,
        padding: "4px 9px",
        borderRadius: 100,
      }}
    >
      {children}
    </span>
  );
}

export function InsightsSlide() {
  return (
    <div style={{ ...SLIDE, position: undefined }}>
      <SlideHeader eyebrow="TRENDS & FORECASTS · CHIPATA" title="Aura Insights" />

      <div
        style={{
          background: "#07322e",
          borderRadius: 18,
          padding: 20,
          marginTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DarkGlow />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: FONT_MONO,
              fontSize: 9.5,
              letterSpacing: "0.14em",
              color: "#07322e",
              background: "#a9e3d6",
              padding: "5px 10px",
              borderRadius: 100,
            }}
          >
            <Icon name="insights" size={14} />
            INSIGHTS
          </span>
          <span
            style={{
              width: 36,
              height: 36,
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              background: "rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="calendar_month" size={18} color="#a9e3d6" />
          </span>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#bcd6cf", margin: "12px 0 0", position: "relative" }}>
          Inventory risk signals, sales velocity, and reorder suggestions for your branch.
        </p>
        <div
          style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", color: "#7fcdbd", marginTop: 14, position: "relative" }}
        >
          CHIPATA · LAST 30 DAYS
        </div>
      </div>

      <div style={{ ...CARD_LG, marginTop: 11 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15 }}>Inventory risk heatmap</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 15 }}>
          <MeterRow label="LOW-STOCK" value="62" pct={62} color="#bf6a43" />
          <MeterRow label="NEAR-EXPIRY" value="18" pct={18} color="#d9a03c" />
          <MeterRow label="BATCH HEALTH" value="86" pct={86} color="#0d5c54" />
        </div>
      </div>

      <div style={{ ...CARD_LG, marginTop: 11 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Paracetamol 500mg</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#7d918c", marginTop: 4 }}>
              VELOCITY 9.2/DAY · ON HAND 84
            </div>
          </div>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              fontWeight: 600,
              color: "#5a43c0",
              background: "#f1eefb",
              padding: "4px 8px",
              borderRadius: 100,
              flexShrink: 0,
            }}
          >
            REORDER
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "#f7f5fd",
            border: "1px solid #e6e0f7",
            borderRadius: 12,
            padding: "10px 13px",
            marginTop: 12,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#5a43c0" }}>Suggested order · 190 units</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600 }}>ZMW 3,420</span>
        </div>
      </div>

      <div style={{ ...CARD_LG, marginTop: 11, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Amoxicillin 250mg caps</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#7d918c", marginTop: 4 }}>
              VELOCITY 4.1/DAY · ON HAND 312
            </div>
          </div>
          <span style={{ ...BADGE_TEAL, fontSize: 8.5, padding: "4px 8px", flexShrink: 0 }}>HEALTHY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
          <InsightPill color="#46574f" background="#f0f5f3">ON HAND 312</InsightPill>
          <InsightPill color="#46574f" background="#f0f5f3">4.1/DAY</InsightPill>
          <InsightPill color="#0d5c54" background="#e7f1ef">COVER 76D</InsightPill>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 4 · Expenses                                                  */
/* ------------------------------------------------------------------ */
function ExpenseRow({
  name,
  tag,
  tagColor,
  tagBg,
  date,
  amount,
  border,
}: {
  name: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  date: string;
  amount: string;
  border?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "12px 0",
        borderBottom: border ? "1px solid #eef3f1" : undefined,
        marginTop: border ? 6 : undefined,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              fontWeight: 600,
              color: tagColor,
              background: tagBg,
              padding: "3px 7px",
              borderRadius: 100,
            }}
          >
            {tag}
          </span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#7d918c" }}>{date}</span>
        </div>
      </div>
      <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>{amount}</span>
    </div>
  );
}

export function ExpensesSlide() {
  return (
    <div style={SLIDE}>
      <SlideHeader eyebrow="BRANCH SPEND · CHIPATA" title="Branch expenses" />

      <div
        style={{
          background: "#07322e",
          borderRadius: 18,
          padding: 20,
          marginTop: 14,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <DarkGlow />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontFamily: FONT_MONO,
              fontSize: 9.5,
              letterSpacing: "0.14em",
              color: "#07322e",
              background: "#a9e3d6",
              padding: "5px 10px",
              borderRadius: 100,
            }}
          >
            <Icon name="receipt_long" size={14} />
            EXPENSES
          </span>
          <span
            style={{
              width: 36,
              height: 36,
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              background: "rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="calendar_month" size={18} color="#a9e3d6" />
          </span>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "#bcd6cf", margin: "12px 0 0", position: "relative" }}>
          General and restocking expenses, plus provider charges from mobile money and wallet withdrawals.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: 14,
            position: "relative",
          }}
        >
          <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", color: "#7fcdbd" }}>
            CHIPATA · 2026-07-01 → 2026-07-02
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 38,
              padding: "0 15px",
              borderRadius: 11,
              background: "#a9e3d6",
              color: "#07322e",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <Icon name="add" size={16} />
            Add expense
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 11 }}>
        <ExpenseStat label="TOTAL EXPENSES" icon="description" value="ZMW 1,100.00" />
        <ExpenseStat label="CHARGES" icon="percent" value="ZMW 0.00" />
        <ExpenseStat label="RESTOCKING" icon="inventory_2" value="ZMW 900.00" />
        <ExpenseStat label="GENERAL" icon="receipt" value="ZMW 200.00" />
      </div>

      <div style={{ ...CARD_LG, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>Expenses flow</span>
            <div style={{ fontSize: 11.5, color: "#7d918c", marginTop: 2 }}>Daily totals for the selected range.</div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 30,
              padding: "0 11px",
              border: "1px solid #dbe6e2",
              borderRadius: 100,
              background: "#fff",
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            All
            <Icon name="expand_more" size={14} color="#9bafa9" />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 96, marginTop: 14 }}>
          <ExpenseBar label="JUL 01" pct={78} color="#0d5c54" />
          <ExpenseBar label="JUL 02" pct={26} color="#cfe3de" />
          <div style={{ flex: 2 }} />
        </div>
      </div>

      <div style={{ ...CARD_LG, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>Expenses</span>
            <div style={{ fontSize: 11.5, color: "#7d918c", marginTop: 2 }}>All entries in the selected range.</div>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", color: "#7d918c", flexShrink: 0 }}>
            2 ENTRIES
          </span>
        </div>
        <ExpenseRow
          name="Supplier restock · PharmaCo"
          tag="RESTOCKING"
          tagColor="#0d5c54"
          tagBg="#e7f1ef"
          date="2026-07-01"
          amount="ZMW 900.00"
          border
        />
        <ExpenseRow
          name="Generator fuel"
          tag="GENERAL"
          tagColor="#46574f"
          tagBg="#eef3f1"
          date="2026-07-02"
          amount="ZMW 200.00"
        />
      </div>

      <PhoneTabBar active="expenses" />
    </div>
  );
}

function ExpenseStat({ label, icon, value }: { label: string; icon: string; value: string }) {
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", color: "#7d918c" }}>{label}</span>
        <Icon name={icon} size={17} color="#0d5c54" />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", marginTop: 10 }}>
        {value}
      </div>
    </div>
  );
}

function ExpenseBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        maxWidth: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        height: "100%",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ width: "100%", height: `${pct}%`, borderRadius: "5px 5px 2px 2px", background: color }} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 7.5, color: "#7d918c" }}>{label}</span>
    </div>
  );
}
