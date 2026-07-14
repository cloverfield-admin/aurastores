"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "./fonts";
import { Icon } from "./phone";

type Platform = "ios" | "android";

const STORE_BUTTON: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  background: "#0c1c19",
  color: "#fff",
  borderRadius: 13,
  padding: "11px 20px",
  textDecoration: "none",
  textAlign: "left",
  border: "none",
  cursor: "pointer",
  fontFamily: FONT_BODY,
};

function StoreButton({
  platform,
  icon,
  kicker,
  name,
  onClick,
}: {
  platform: Platform;
  icon: string;
  kicker: string;
  name: string;
  onClick: (platform: Platform) => void;
}) {
  return (
    <button type="button" style={STORE_BUTTON} onClick={() => onClick(platform)}>
      <Icon name={icon} size={26} color="#a9e3d6" />
      <span>
        <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", color: "#8fb0a8" }}>
          {kicker}
        </span>
        <span style={{ display: "block", fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16.5, marginTop: 2 }}>
          {name}
        </span>
      </span>
    </button>
  );
}

function ComingSoonDialog({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const platformName = platform === "ios" ? "iOS" : "Android";
  const storeName = platform === "ios" ? "the App Store" : "Google Play";

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(7,50,46,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 22,
          padding: 32,
          position: "relative",
          boxShadow: "0 40px 90px -30px rgba(7,50,46,0.5)",
          fontFamily: FONT_BODY,
          color: "#0c1c19",
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1px solid #e3eae8",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#46574f",
          }}
        >
          <Icon name="close" size={20} />
        </button>

        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: "#eef4f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="smartphone" size={28} color="#0d5c54" />
        </div>

        <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.14em", color: "#0d5c54", marginTop: 20 }}>
          COMING SOON
        </div>
        <h3
          id={titleId}
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: "8px 0 0" }}
        >
          The {platformName} app is on its way
        </h3>
        {/* No "continue on the web" any more — the web app is the platform console
            and there is nothing here for a store owner to continue INTO. Offering it
            would walk them into a sign-up that no longer exists. */}
        <p id={descId} style={{ fontSize: 15, lineHeight: 1.55, color: "#46574f", margin: "12px 0 0" }}>
          We&apos;re putting the finishing touches on the AuraStores app for {storeName}. It&apos;s
          where you&apos;ll run everything — sales, stock, staff and payments — from day one.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              height: 50,
              borderRadius: 13,
              background: "#0d5c54",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              fontFamily: FONT_BODY,
              boxShadow: "0 10px 24px rgba(13,92,84,0.28)",
            }}
          >
            <Icon name="check" size={20} color="#a9e3d6" />
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function DownloadCta() {
  const [platform, setPlatform] = useState<Platform | null>(null);

  return (
    <section id="download" style={{ maxWidth: 1200, margin: "104px auto 0", padding: "0 28px" }}>
      <div
        className="cta-box"
        style={{
          background: "#0d5c54",
          borderRadius: 24,
          padding: "72px 40px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -60,
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: "clamp(30px,4.4vw,48px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#fff",
              margin: 0,
              textWrap: "balance",
            }}
          >
            Put every store in your pocket
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "#bcd6cf",
              maxWidth: 560,
              margin: "16px auto 0",
            }}
          >
            Join teams using AuraStores to unify inventory, sales, and payouts — from the phone already
            in your hand.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
            <StoreButton
              platform="ios"
              icon="phone_iphone"
              kicker="DOWNLOAD ON THE"
              name="App Store"
              onClick={setPlatform}
            />
            <StoreButton
              platform="android"
              icon="play_arrow"
              kicker="GET IT ON"
              name="Google Play"
              onClick={setPlatform}
            />
          </div>

          {/* Was "Same account on the web — get started". There is no web sign-up any
              more, so the promise was one we could no longer keep. */}
          <p
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11.5,
              color: "#7fcdbd",
              marginTop: 20,
              letterSpacing: "0.04em",
            }}
          >
            Everything you need to run the store — in your pocket.
          </p>
        </div>
      </div>

      {platform ? <ComingSoonDialog platform={platform} onClose={() => setPlatform(null)} /> : null}
    </section>
  );
}
