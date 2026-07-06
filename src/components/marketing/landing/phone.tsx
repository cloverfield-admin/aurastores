import type { CSSProperties, ReactNode } from "react";
import { FONT_DISPLAY } from "./fonts";

/** Square brand mark used in nav, phone mockups, and footer (deep-teal monogram). */
export const LOGO_MARK = "/brand/logo-mark.svg";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
};

/** Material Symbols glyph (outlined) sized/colored inline, matching the design comp. */
export function Icon({ name, size = 24, color, className = "", style }: IconProps) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined notranslate ${className}`.trim()}
      style={{ fontSize: size, color, lineHeight: 1, ...style }}
    >
      {name}
    </span>
  );
}

type PhoneChromeSize = "lg" | "sm";

/** iOS-style status bar + pill notch pinned to the top of a phone screen. */
export function PhoneStatusBar({ size = "lg" }: { size?: PhoneChromeSize }) {
  const lg = size === "lg";
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: lg ? 50 : 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: lg ? "12px 30px 0" : "12px 28px 0",
          zIndex: 7,
        }}
      >
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: lg ? 14 : 13.5 }}>
          9:41
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="signal_cellular_alt" size={lg ? 15 : 14} />
          <Icon name="wifi" size={lg ? 15 : 14} />
          <Icon name="battery_full" size={lg ? 16 : 15} />
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: lg ? 12 : 11,
          left: "50%",
          transform: "translateX(-50%)",
          width: lg ? 114 : 106,
          height: lg ? 30 : 28,
          borderRadius: 100,
          background: "#0a1613",
          zIndex: 8,
        }}
      />
    </>
  );
}

export type PhoneTab = "home" | "stock" | "sales" | "expenses" | "more";

const TABS: Array<{ key: PhoneTab; icon: string; label: string }> = [
  { key: "home", icon: "space_dashboard", label: "Home" },
  { key: "stock", icon: "inventory_2", label: "Stock" },
  { key: "sales", icon: "monitoring", label: "Sales" },
  { key: "expenses", icon: "account_balance_wallet", label: "Expenses" },
  { key: "more", icon: "menu", label: "More" },
];

/** Bottom tab bar with the active destination highlighted. */
export function PhoneTabBar({ active, size = "lg" }: { active: PhoneTab; size?: PhoneChromeSize }) {
  const lg = size === "lg";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        background: "#fff",
        borderTop: "1px solid #e3eae8",
        display: "flex",
        padding: lg ? "6px 8px 20px" : "5px 8px 18px",
      }}
    >
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <div
            key={tab.key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: lg ? "8px 0" : "7px 0",
            }}
          >
            <Icon name={tab.icon} size={lg ? 21 : 20} color={on ? "#0d5c54" : "#9bafa9"} />
            <span
              style={{
                fontSize: lg ? "9.5px" : "9px",
                fontWeight: on ? 700 : 600,
                color: on ? "#0d5c54" : "#9bafa9",
              }}
            >
              {tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Home-indicator pill at the bottom of a phone screen. */
export function PhoneHomeIndicator({ width = 116, bottom = 6 }: { width?: number; bottom?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: "50%",
        transform: "translateX(-50%)",
        width,
        height: 5,
        borderRadius: 100,
        background: "rgba(12,28,25,0.26)",
        zIndex: 8,
      }}
    />
  );
}

/**
 * Single-screen phone used by the feature sections (tilted, static). The
 * screen `children` render inside the padded content area; an absolutely
 * positioned tab bar within them docks to the bottom of the frame.
 */
export function FeaturePhone({ rotate, children }: { rotate: number; children: ReactNode }) {
  return (
    <div
      style={{
        width: 372,
        maxWidth: "100%",
        transform: `rotate(${rotate}deg)`,
        position: "relative",
      }}
    >
      <div
        style={{
          borderRadius: 50,
          background: "#0a1613",
          padding: 9,
          boxShadow: "0 46px 90px -30px rgba(7,50,46,0.5)",
        }}
      >
        <div
          style={{
            borderRadius: 42,
            overflow: "hidden",
            background: "#f5f8f7",
            position: "relative",
            height: 724,
          }}
        >
          <PhoneStatusBar size="sm" />
          <div style={{ height: "100%", display: "block", padding: "58px 20px 0", overflow: "hidden" }}>
            {children}
          </div>
          <PhoneHomeIndicator />
        </div>
      </div>
    </div>
  );
}
