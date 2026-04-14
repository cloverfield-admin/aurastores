import type { QueryKey } from "@tanstack/react-query";

/**
 * Read-only dashboard keys persisted for offline viewing (IndexedDB).
 * Keep this list small and review before adding sensitive domains.
 */
export function shouldPersistQueryKey(queryKey: QueryKey): boolean {
  if (!Array.isArray(queryKey) || queryKey.length < 2) {
    return false;
  }
  const [a, b] = queryKey;
  if (a === "stock") {
    return b === "dashboard" || b === "catalog" || b === "branches" || b === "batch";
  }
  if (a === "sales") {
    return b === "dashboard" || b === "catalog";
  }
  if (a === "dashboard" && b === "network") {
    return true;
  }
  if (a === "staff" && b === "directory") {
    return true;
  }
  return false;
}
