"use client";

import { useRef, useState } from "react";

export type SparkPoint = { label: string; value: number };

const TEAL = "rgb(15, 185, 177)";
const INDIGO = "rgb(99, 102, 241)";

/**
 * Hand-rolled SVG sparkline. Extracted from `aura-insights-content.tsx` so the
 * platform console draws the same chart rather than growing a second one.
 *
 * There is no chart library in this codebase, and this is why none is needed: a
 * line, a hover crosshair and a tooltip is the whole requirement.
 *
 * `compare` overlays a second series on the SAME scale — the admin console plots
 * user and company signups together, and separate scales would make five companies
 * look like fifty users.
 */
export function Sparkline({
  points,
  formatPoint,
  compare,
}: {
  points: SparkPoint[];
  formatPoint: (value: number) => string;
  compare?: { points: SparkPoint[]; label: string; formatPoint?: (value: number) => string };
}) {
  const width = 280;
  const height = 64;
  const padding = 6;

  const values = points.length ? points.map((p) => p.value) : [0, 0];
  const compareValues = compare?.points.map((p) => p.value) ?? [];

  // One shared scale across both series, so the two lines are comparable.
  const all = [...values, ...compareValues];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = Math.max(1e-9, max - min);

  const xFor = (i: number) => padding + (i * (width - padding * 2)) / Math.max(1, values.length - 1);
  const yFor = (v: number) => height - padding - ((v - min) * (height - padding * 2)) / range;
  const pathFor = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(v).toFixed(2)}`).join(" ");

  const latest = values[values.length - 1] ?? 0;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hovered = hoverIndex != null && points[hoverIndex] ? points[hoverIndex] : null;
  const hoveredCompare = hoverIndex != null ? compare?.points[hoverIndex] : undefined;
  const hoveredX = hoverIndex != null ? xFor(hoverIndex) : null;
  const hoveredY = hoverIndex != null ? yFor(values[hoverIndex] ?? 0) : null;

  function pick(clientX: number) {
    const el = containerRef.current;
    if (!el || points.length < 2) return;
    const rect = el.getBoundingClientRect();
    const t = (clientX - rect.left - padding) / Math.max(1, rect.width - padding * 2);
    const idx = Math.round(t * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, idx)));
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseLeave={() => setHoverIndex(null)}
      onMouseMove={(event) => pick(event.clientX)}
      onTouchStart={(event) => {
        const touch = event.touches.item(0);
        if (touch) pick(touch.clientX);
      }}
      onTouchMove={(event) => {
        const touch = event.touches.item(0);
        if (touch) pick(touch.clientX);
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" preserveAspectRatio="none" role="img">
        <title>{formatPoint(latest)}</title>
        {compare && compareValues.length ? (
          <path
            d={pathFor(compareValues)}
            fill="none"
            stroke={INDIGO}
            strokeWidth="2"
            strokeDasharray="3 3"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.8"
          />
        ) : null}
        <path
          d={pathFor(values)}
          fill="none"
          stroke={TEAL}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoveredX != null && hoveredY != null ? (
          <>
            <line x1={hoveredX} x2={hoveredX} y1={padding} y2={height - padding} stroke={TEAL} opacity="0.25" />
            <circle cx={hoveredX} cy={hoveredY} r="3" fill={TEAL} />
            <circle cx={hoveredX} cy={hoveredY} r="7" fill={TEAL} opacity="0.12" />
          </>
        ) : null}
      </svg>

      {hovered ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-1.5 text-[11px] text-[var(--app-text)] shadow-sm">
          <div className="font-semibold">{hovered.label}</div>
          <div className="text-[10px] text-[var(--app-text-muted)]">{formatPoint(hovered.value)}</div>
          {compare && hoveredCompare ? (
            <div className="text-[10px] text-[rgb(99,102,241)]">
              {compare.label}: {(compare.formatPoint ?? formatPoint)(hoveredCompare.value)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="absolute right-2 top-2 rounded-md bg-[var(--app-surface)]/90 px-2 py-1 text-[10px] font-semibold text-[var(--app-text-muted)]">
          {formatPoint(latest)}
        </div>
      )}
    </div>
  );
}
