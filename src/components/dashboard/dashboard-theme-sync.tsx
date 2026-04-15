"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export type DashboardThemePreference = "light" | "dark" | "system";

type DashboardThemeSyncProps = {
  initialTheme: DashboardThemePreference;
};

/** Applies the server-known DB theme so it wins over stale localStorage after login. */
export function DashboardThemeSync({ initialTheme }: DashboardThemeSyncProps) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme, setTheme]);

  return null;
}
