"use client";

import { Children, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FONT_BODY, FONT_MONO } from "./fonts";
import { Icon, PhoneHomeIndicator, PhoneStatusBar } from "./phone";

export type HeroScreen = {
  label: string;
  icon: string;
  caption: string;
};

type HeroCarouselProps = {
  screens: HeroScreen[];
  children: ReactNode;
};

const ROTATE_MS = 4500;
const HOLD_MS = 9000;

/**
 * The hero phone: an auto-rotating carousel of app screens (passed as
 * children) with a tab strip and live caption. Picking a tab pauses the
 * auto-rotation for a few seconds so the chosen screen stays put.
 */
export function HeroCarousel({ screens, children }: HeroCarouselProps) {
  const slides = Children.toArray(children);
  const count = slides.length || 1;
  const [idx, setIdx] = useState(0);
  const holdRef = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (!holdRef.current) {
        setIdx((i) => (i + 1) % count);
      }
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [count]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const pick = (i: number) => {
    holdRef.current = true;
    setIdx(i);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdRef.current = false;
    }, HOLD_MS);
  };

  return (
    <div
      className="phonecol"
      style={{ position: "relative", width: 404, maxWidth: "100%", justifySelf: "center" }}
    >
      {/* Floating stat pills */}
      <div
        className="floatpill"
        style={{
          position: "absolute",
          top: 74,
          left: -84,
          zIndex: 8,
          animation: "auraFloat 6s ease-in-out infinite",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#a9e3d6",
          color: "#07322e",
          borderRadius: 100,
          padding: "9px 15px",
          fontFamily: FONT_MONO,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          boxShadow: "0 14px 32px -10px rgba(7,50,46,0.35)",
        }}
      >
        <Icon name="trending_up" size={16} />
        +40.1% REVENUE · 30D
      </div>
      <div
        className="floatpill"
        style={{
          position: "absolute",
          bottom: 150,
          right: -72,
          zIndex: 8,
          animation: "auraFloatB 7s ease-in-out infinite",
          background: "#fff",
          border: "1px solid #e3eae8",
          borderRadius: 14,
          padding: "12px 15px",
          display: "flex",
          alignItems: "center",
          gap: 11,
          boxShadow: "0 18px 40px -12px rgba(7,50,46,0.28)",
          maxWidth: 220,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "#eef4f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="sync" size={19} color="#0d5c54" />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>2 branches synced</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: "#7d918c", marginTop: 2 }}>
            JUST NOW
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div
        style={{
          borderRadius: 54,
          background: "#0a1613",
          padding: 9,
          boxShadow: "0 60px 110px -34px rgba(7,50,46,0.55)",
        }}
      >
        <div
          style={{
            borderRadius: 46,
            overflow: "hidden",
            background: "#f5f8f7",
            position: "relative",
            height: 800,
          }}
        >
          <PhoneStatusBar size="lg" />

          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${count * 100}%`,
              display: "flex",
              willChange: "transform",
              transition: "transform 0.85s cubic-bezier(0.22,1,0.36,1)",
              transform: `translateX(-${idx * (100 / count)}%)`,
            }}
          >
            {slides.map((slide, i) => (
              <div key={i} style={{ width: `${100 / count}%`, height: "100%" }}>
                {slide}
              </div>
            ))}
          </div>

          <PhoneHomeIndicator width={126} bottom={7} />
        </div>
      </div>

      {/* Screen tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 26,
        }}
      >
        {screens.map((screen, i) => {
          const active = i === idx;
          return (
            <button
              key={screen.label}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={active}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 40,
                padding: "0 16px",
                borderRadius: 100,
                cursor: "pointer",
                border: active ? "1px solid #07322e" : "1px solid #dbe6e2",
                background: active ? "#07322e" : "#fff",
                color: active ? "#fff" : "#46574f",
                fontFamily: FONT_BODY,
                fontSize: 13.5,
                fontWeight: 600,
                transition: "all 0.25s ease",
              }}
            >
              <Icon name={screen.icon} size={17} color={active ? "#a9e3d6" : "#0d5c54"} />
              {screen.label}
            </button>
          );
        })}
      </div>
      <p
        aria-live="polite"
        style={{
          textAlign: "center",
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#7d918c",
          margin: "14px 0 0",
          minHeight: 17,
        }}
      >
        {screens[idx]?.caption}
      </p>
    </div>
  );
}
