"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Wrapper element (defaults to a div). */
  as?: ElementType;
  /** Stagger the reveal, in ms. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Fades + lifts its children into view the first time they approach the
 * viewport. Content renders visible during SSR and is only hidden (via the
 * imperative `data-reveal` attribute) once JS confirms the block is still
 * below the fold — so nothing above the fold ever flashes, and no-JS /
 * reduced-motion users always see the content. Reveal state is driven through
 * DOM attributes rather than React state to avoid re-render churn on scroll.
 */
export function Reveal({ children, as, delay = 0, className, style }: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") return;

    // Already on-screen at mount → keep it visible (never hide, no animation).
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    // Below the fold → arm the hidden state and animate in on entry.
    node.setAttribute("data-reveal", "");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "");
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </Tag>
  );
}
