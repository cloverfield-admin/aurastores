"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const LIGHT = "#0fb9b1";
const DARK = "#0f766e";

/**
 * Syncs `<meta name="theme-color">` with resolved light/dark (PWA / mobile chrome).
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) {
      return;
    }
    const content = resolvedTheme === "dark" ? DARK : LIGHT;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }, [resolvedTheme]);

  return null;
}
