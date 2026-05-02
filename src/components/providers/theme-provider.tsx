"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { STORAGE_KEYS } from "@/lib/brand";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEYS.theme}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
