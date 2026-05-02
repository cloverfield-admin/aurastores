"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { DashboardDateRangeValue } from "@/lib/dashboard/dashboard-date-range-value";
import type { NetworkDashboardData } from "@/lib/repositories/network/network.repository";

export const networkDashboardQueryKey = ["dashboard", "network"] as const;

export function useNetworkDashboardQuery(options: { enabled?: boolean; range: DashboardDateRangeValue }) {
  const { enabled = true, range } = options;
  const qs = new URLSearchParams({ start: range.start, end: range.end });
  return useQuery({
    queryKey: [...networkDashboardQueryKey, range.start, range.end],
    queryFn: () =>
      fetchJson<NetworkDashboardData>(`${apiUrl("/dashboard/network")}?${qs.toString()}`, { method: "GET" }),
    enabled,
  });
}
