import type { CSSProperties } from "react";
import { FONT_DISPLAY, FONT_MONO } from "./fonts";
import { FeaturePhone, Icon, LOGO_MARK, PhoneTabBar } from "./phone";

const CARD_SM: CSSProperties = {
  background: "#fff",
  border: "1px solid #e3eae8",
  borderRadius: 14,
  padding: 13,
};

function FeatureHeader({
  eyebrow,
  title,
  actionIcon,
}: {
  eyebrow: string;
  title: string;
  actionIcon: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_MARK} alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.14em", color: "#7d918c" }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            {title}
          </div>
        </div>
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "#0d5c54",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 14px rgba(13,92,84,0.28)",
          flexShrink: 0,
        }}
      >
        <Icon name={actionIcon} size={actionIcon === "add" ? 21 : 20} color="#fff" />
      </div>
    </div>
  );
}

function FilterChip({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 30,
        padding: "0 12px",
        borderRadius: 100,
        border: active ? undefined : "1px solid #dbe6e2",
        background: active ? "#07322e" : "#fff",
        color: active ? "#fff" : "#46574f",
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

function StockRow({
  name,
  sku,
  pct,
  barColor,
  count,
  status,
  statusColor,
  flexShrink,
}: {
  name: string;
  sku: string;
  pct: number;
  barColor: string;
  count: string;
  status: string;
  statusColor: string;
  flexShrink?: boolean;
}) {
  return (
    <div style={{ ...CARD_SM, flexShrink: flexShrink ? 0 : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, color: "#7d918c", marginTop: 2 }}>{sku}</div>
        </div>
        <Icon name="more_vert" size={17} color="#9bafa9" style={{ flexShrink: 0 }} />
      </div>
      <div style={{ height: 5, background: "#eef3f1", borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: barColor }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10.5, color: "#5f7771" }}>{count}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 600, color: statusColor }}>{status}</span>
      </div>
    </div>
  );
}

export function StockPhone() {
  return (
    <FeaturePhone rotate={-1.6}>
      <FeatureHeader eyebrow="AURA STOCK · CHIPATA" title="Stock inventory" actionIcon="add" />

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#11756b", flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: "#5f7771" }}>Real-time sync active · synced 1 min ago</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 13 }}>
        <div style={CARD_SM}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#7d918c" }}>
            TOTAL STOCK VALUE
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.02em", marginTop: 7 }}>
            ZMW 53,844.88
          </div>
          <div style={{ fontSize: 10, color: "#7d918c", marginTop: 2 }}>5,468 units · 685 products</div>
        </div>
        <div style={CARD_SM}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#7d918c" }}>
              NEAR EXPIRY
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 7.5,
                fontWeight: 600,
                color: "#a06018",
                background: "#f9efdf",
                padding: "3px 6px",
                borderRadius: 100,
              }}
            >
              ATTENTION
            </span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.02em", marginTop: 7 }}>
            1 product
          </div>
          <div style={{ fontSize: 10, color: "#7d918c", marginTop: 2 }}>1 already expired</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 42,
          background: "#fff",
          border: "1px solid #dbe6e2",
          borderRadius: 12,
          padding: "0 12px",
          marginTop: 12,
        }}
      >
        <Icon name="search" size={17} color="#9bafa9" />
        <span style={{ fontSize: 12.5, color: "#9bafa9" }}>Search by product, SKU…</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
        <FilterChip label="All" active />
        <FilterChip label="Low stock" />
        <FilterChip label="Near expiry" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 11 }}>
        <StockRow
          name="Amoxicillin 250mg caps"
          sku="SKU: AMX-250"
          pct={72}
          barColor="#0d5c54"
          count="312 of 430 units"
          status="HEALTHY"
          statusColor="#0d5c54"
        />
        <StockRow
          name="Paracetamol 500mg"
          sku="SKU: PCM-500"
          pct={18}
          barColor="#bf6a43"
          count="84 of 460 units"
          status="REORDER"
          statusColor="#b3402e"
        />
        <StockRow
          name="Vitamin C 1000mg"
          sku="SKU: VTC-1K"
          pct={56}
          barColor="#0d5c54"
          count="201 of 360 units"
          status="HEALTHY"
          statusColor="#0d5c54"
          flexShrink
        />
      </div>

      <PhoneTabBar active="stock" size="sm" />
    </FeaturePhone>
  );
}

function SalesBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        height: "100%",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ width: "100%", height: `${pct}%`, borderRadius: "5px 5px 2px 2px", background: color }} />
      <span style={{ fontFamily: FONT_MONO, fontSize: 7.5, color: "#7d918c" }}>{label}</span>
    </div>
  );
}

function TopProduct({ name, amount, pct }: { name: string; amount: string; pct: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{name}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600, color: "#0d5c54" }}>{amount}</span>
      </div>
      <div style={{ height: 5, background: "#eef3f1", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "#0d5c54" }} />
      </div>
    </div>
  );
}

export function SalesPhone() {
  return (
    <FeaturePhone rotate={1.6}>
      <FeatureHeader eyebrow="AURA SALES · CHIPATA" title="Sales performance" actionIcon="add_shopping_cart" />

      <div
        style={{
          background: "#07322e",
          borderRadius: 16,
          padding: 17,
          marginTop: 13,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(169,227,214,0.16), transparent 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.14em", color: "#7fcdbd" }}>
            TOTAL REVENUE
          </span>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 8.5,
              fontWeight: 600,
              color: "#07322e",
              background: "#a9e3d6",
              padding: "4px 8px",
              borderRadius: 100,
            }}
          >
            +18.2% vs prior 7d
          </span>
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginTop: 8,
            position: "relative",
          }}
        >
          ZMW 16,842.00
        </div>
        <div style={{ fontSize: 10.5, color: "#bcd6cf", marginTop: 4, position: "relative" }}>
          Gross profit ZMW 7,782.11 · 812 units
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 10 }}>
        <div style={CARD_SM}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Icon name="trending_up" size={17} color="#0d5c54" />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 7.5,
                fontWeight: 600,
                color: "#0d5c54",
                background: "#e7f1ef",
                padding: "3px 6px",
                borderRadius: 100,
              }}
            >
              46.3% MARGIN
            </span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", marginTop: 9 }}>
            ZMW 7,782
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#7d918c", marginTop: 2 }}>
            GROSS PROFIT
          </div>
        </div>
        <div style={CARD_SM}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Icon name="bar_chart_4_bars" size={17} color="#0d5c54" />
            <Icon name="chevron_right" size={15} color="#9bafa9" />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", marginTop: 9 }}>
            812
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.1em", color: "#7d918c", marginTop: 2 }}>
            UNITS SOLD · 7D
          </div>
        </div>
      </div>

      <div style={{ ...CARD_SM, borderRadius: 16, padding: 16, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="monitoring" size={17} color="#0d5c54" />
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14 }}>Revenue trend</span>
          </div>
          <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: "0.1em", color: "#7d918c" }}>
            LAST 7 DAYS
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 92, marginTop: 14 }}>
          <SalesBar label="MON" pct={38} color="#cfe3de" />
          <SalesBar label="TUE" pct={54} color="#cfe3de" />
          <SalesBar label="WED" pct={44} color="#cfe3de" />
          <SalesBar label="THU" pct={66} color="#8fc7ba" />
          <SalesBar label="FRI" pct={58} color="#cfe3de" />
          <SalesBar label="SAT" pct={88} color="#0d5c54" />
          <SalesBar label="SUN" pct={30} color="#cfe3de" />
        </div>
      </div>

      <div style={{ ...CARD_SM, borderRadius: 16, padding: 16, marginTop: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="medication" size={17} color="#0d5c54" />
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14 }}>Top performing products</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 13 }}>
          <TopProduct name="Paracetamol 500mg" amount="ZMW 3,864" pct={84} />
          <TopProduct name="Amoxicillin 250mg caps" amount="ZMW 2,912" pct={63} />
        </div>
      </div>

      <PhoneTabBar active="sales" size="sm" />
    </FeaturePhone>
  );
}
