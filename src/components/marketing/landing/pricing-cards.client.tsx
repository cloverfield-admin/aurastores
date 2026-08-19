"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { LandingPlan } from "@/lib/marketing/landing-pricing";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "./fonts";
import { Icon } from "./phone";

const TOGGLE_BASE: CSSProperties = {
  border: "none",
  cursor: "pointer",
  padding: "9px 18px",
  borderRadius: 9,
  fontFamily: FONT_BODY,
  fontSize: 13.5,
  fontWeight: 600,
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
};

const TOGGLE_ACTIVE: CSSProperties = {
  ...TOGGLE_BASE,
  background: "#0d5c54",
  color: "#fff",
  boxShadow: "0 2px 8px rgba(13,92,84,0.25)",
};

const TOGGLE_INACTIVE: CSSProperties = {
  ...TOGGLE_BASE,
  background: "transparent",
  color: "#5f7771",
};

function PlanCard({ plan, annual }: { plan: LandingPlan; annual: boolean }) {
  const featured = plan.featured;
  const showAnnual = annual && plan.yearlyPrice != null;
  const price = showAnnual ? plan.yearlyPrice! : plan.monthlyPrice;
  const unit = showAnnual ? "/year" : "/month";
  const note = showAnnual ? plan.yearlyNote : plan.monthlyNote;

  return (
    <div
      style={{
        background: featured ? "#07322e" : "#fff",
        border: featured ? "1px solid #07322e" : "1px solid #e3eae8",
        borderRadius: 18,
        padding: 32,
        position: "relative",
        boxShadow: featured ? "0 30px 60px -28px rgba(7,50,46,0.5)" : undefined,
        color: featured ? "#fff" : undefined,
      }}
    >
      {featured ? (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            fontFamily: FONT_MONO,
            fontSize: 10.5,
            letterSpacing: "0.12em",
            color: "#07322e",
            background: "#a9e3d6",
            padding: "5px 10px",
            borderRadius: 100,
            fontWeight: 600,
          }}
        >
          MOST POPULAR
        </div>
      ) : null}

      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>{plan.name}</div>
      <p
        style={{
          fontSize: 13.5,
          color: featured ? "#bcd6cf" : "#5f7771",
          margin: "6px 0 0",
          lineHeight: 1.5,
        }}
      >
        {plan.tagline}
      </p>

      <div style={{ margin: "22px 0 0", display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 38, letterSpacing: "-0.03em" }}>
          {price}
        </span>
        <span style={{ fontSize: 14, color: featured ? "#bcd6cf" : "#5f7771" }}>{unit}</span>
      </div>
      <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: featured ? "#7fcdbd" : "#7d918c", marginTop: 7 }}>
        {note}
      </div>

      <Link
        href={
          plan.checkoutPlanCode
            ? // showAnnual, not the raw toggle: a plan without a yearly price shows
              // its monthly figure, and checkout must open on what was quoted.
              `/billing/checkout?plan=${plan.checkoutPlanCode}&interval=${showAnnual ? "yearly" : "monthly"}`
            : plan.ctaHref
        }
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 18,
          fontSize: 14.5,
          fontWeight: 600,
          color: featured ? "#07322e" : "#0c1c19",
          background: featured ? "#a9e3d6" : "#fff",
          border: featured ? undefined : "1px solid #dbe6e2",
          padding: 12,
          borderRadius: 11,
          textDecoration: "none",
        }}
      >
        {plan.ctaLabel}
      </Link>

      <div
        style={{
          height: 1,
          background: featured ? "rgba(255,255,255,0.12)" : "#eef3f1",
          margin: "24px 0",
        }}
      />

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {plan.bullets.map((bullet) => (
          <li
            key={bullet}
            style={{ display: "flex", gap: 10, fontSize: 14, color: featured ? "#dcebe7" : "#2f4540" }}
          >
            <Icon name="check_circle" size={19} color={featured ? "#a9e3d6" : "#11756b"} style={{ flexShrink: 0 }} />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingCards({ plans }: { plans: LandingPlan[] }) {
  const [annual, setAnnual] = useState(false);
  const hasYearly = plans.some((plan) => plan.yearlyPrice != null);

  return (
    <>
      {hasYearly ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}>
          <div
            style={{
              display: "inline-flex",
              padding: 5,
              background: "#eef4f2",
              borderRadius: 12,
              gap: 4,
            }}
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
              style={annual ? TOGGLE_INACTIVE : TOGGLE_ACTIVE}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
              style={annual ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
            >
              Annual
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="g3p"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 20,
          marginTop: 34,
          alignItems: "start",
        }}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.code} plan={plan} annual={annual} />
        ))}
      </div>
    </>
  );
}
