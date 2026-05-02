export function buildLipilaReference(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function maskAccountNumber(value: string, head = 4, tail = 2): string {
  const trimmed = value.trim();
  if (trimmed.length <= head + tail) {
    return trimmed;
  }
  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}

export function hasValidLipilaCallbackToken(request: Request): boolean {
  const expected = process.env.LIPILA_CALLBACK_TOKEN;
  if (!expected) {
    return true;
  }

  const headerToken = request.headers.get("x-lipila-callback-token")?.trim();
  if (headerToken && headerToken === expected) {
    return true;
  }

  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === expected;
  }

  return false;
}

export function unwrapLipilaCallbackPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const maybeWrapped = raw as Record<string, unknown>;
  if (maybeWrapped.body && typeof maybeWrapped.body === "object") {
    return maybeWrapped.body;
  }

  return raw;
}
