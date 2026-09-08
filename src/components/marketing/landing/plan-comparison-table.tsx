import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { ComparisonValue, PlanComparison } from "@/lib/billing/plan-comparison";
import { FONT_BODY, FONT_DISPLAY, FONT_MONO } from "./fonts";

const BORDER = "#e3eae8";
const FAINT = "#7d918c";
const MUTED = "#5f7771";
const TEXT = "#0c1c19";
const PRIMARY = "#0d5c54";

const CELL: CSSProperties = {
  padding: "14px 16px",
  fontFamily: FONT_BODY,
  fontSize: 14,
  color: TEXT,
  textAlign: "center",
  borderBottom: `1px solid ${BORDER}`,
  verticalAlign: "middle",
};

const ROW_LABEL: CSSProperties = {
  ...CELL,
  textAlign: "left",
  minWidth: 210,
};

function Value({ value }: { value: ComparisonValue }) {
  if (value.kind === "text") {
    return <span style={{ fontWeight: 600 }}>{value.text}</span>;
  }
  if (value.kind === "included") {
    return (
      <span aria-label="Included" title="Included" style={{ color: PRIMARY, fontSize: 17 }}>
        ✓
      </span>
    );
  }
  // An explicit dash, not an empty cell: a customer must be able to tell
  // "not included" from "we forgot to say".
  return (
    <span aria-label="Not included" title="Not included" style={{ color: "#c2d2ce", fontSize: 17 }}>
      —
    </span>
  );
}

/**
 * The full tier comparison: every capability and every limit, for every public
 * plan including Enterprise.
 *
 * The cards above sell; this answers. It exists because the cards cut their
 * bullet list at six and never state what a plan leaves out, which is exactly
 * what someone comparing two tiers is trying to find out.
 */
export function PlanComparisonTable({ comparison }: { comparison: PlanComparison }) {
  const { plans, sections } = comparison;
  if (plans.length === 0) return null;

  return (
    <div style={{ marginTop: 56 }}>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "-0.02em",
          color: TEXT,
          margin: 0,
        }}
      >
        Compare every plan
      </h3>
      <p style={{ fontFamily: FONT_BODY, fontSize: 15, color: MUTED, margin: "8px 0 0", lineHeight: 1.55 }}>
        Everything each tier includes and leaves out — no asterisks.
      </p>

      {/* Horizontal scroll rather than hidden columns: on a phone the table
          still shows every plan, it just moves. */}
      <div style={{ overflowX: "auto", marginTop: 22, WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            minWidth: 640,
            borderCollapse: "collapse",
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...ROW_LABEL, background: "#f5f8f7" }} scope="col">
                <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.12em", color: FAINT }}>
                  PLAN
                </span>
              </th>
              {plans.map((plan) => (
                <th key={plan.code} scope="col" style={{ ...CELL, background: "#f5f8f7" }}>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, color: TEXT }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
                    {plan.monthlyPrice
                      ? `${plan.monthlyPrice}/mo`
                      : plan.purchasable
                        ? "—"
                        : plan.code === "free"
                          ? "Free"
                          : "Talk to us"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.title}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={plans.length + 1}
                    style={{
                      ...ROW_LABEL,
                      background: "#eef4f2",
                      fontFamily: FONT_MONO,
                      fontSize: 10.5,
                      letterSpacing: "0.12em",
                      color: PRIMARY,
                      textTransform: "uppercase",
                    }}
                  >
                    {section.title}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" style={{ ...ROW_LABEL, fontWeight: 400 }}>
                      <div style={{ fontWeight: 600 }}>{row.label}</div>
                      <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 1.45 }}>
                        {row.hint}
                      </div>
                    </th>
                    {plans.map((plan) => (
                      <td key={plan.code} style={CELL}>
                        <Value value={row.values[plan.code] ?? { kind: "excluded" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
