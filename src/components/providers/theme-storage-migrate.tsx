"use client";

import { useLayoutEffect } from "react";
import { STORAGE_KEYS } from "@/lib/brand";

/** Copies theme preference from pre-rebrand localStorage key before next-themes reads storage. */
export function ThemeStorageMigrate() {
  useLayoutEffect(() => {
    try {
      const legacy = localStorage.getItem(STORAGE_KEYS.themeLegacy);
      if (legacy != null && legacy !== "" && localStorage.getItem(STORAGE_KEYS.theme) == null) {
        localStorage.setItem(STORAGE_KEYS.theme, legacy);
      }
    } catch {
      // ignore
    }
  }, []);
  return null;
}
