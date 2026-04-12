/** Set on the forwarded request in `updateSupabaseSession` for auth layout branching. */
export const AUTH_PATHNAME_HEADER = "x-pathname";

/**
 * Returns `next` only if it is a safe same-origin path (no open redirects).
 */
export function safeInternalNextPath(next: string | null | undefined): string | null {
  if (next == null || next === "") {
    return null;
  }
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  if (trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://")) {
    return null;
  }
  return trimmed;
}
