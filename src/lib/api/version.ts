export const API_VERSION = "v1" as const;

/**
 * Build a versioned app API path, e.g. apiUrl("/stock") -> "/api/v1/stock".
 */
export function apiUrl(path: string): string {
  const segment = path.startsWith("/") ? path : `/${path}`;
  return `/api/${API_VERSION}${segment}`;
}
