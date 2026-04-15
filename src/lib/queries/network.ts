"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { NetworkDashboardData } from "@/lib/repositories/network/network.repository";

export const networkDashboardQueryKey = ["dashboard", "network"] as const;

export function useNetworkDashboardQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: networkDashboardQueryKey,
    queryFn: () => fetchJson<NetworkDashboardData>(apiUrl("/dashboard/network"), { method: "GET" }),
    enabled: options?.enabled ?? true,
  });
}
