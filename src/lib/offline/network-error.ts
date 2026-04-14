export function isLikelyNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    return true;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return false;
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes("failed to fetch") ||
      m.includes("networkerror") ||
      m.includes("load failed") ||
      m.includes("network request failed")
    );
  }
  return false;
}
