export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & {
        error?: string;
        code?: string;
        detail?: string;
        constraint?: string;
        table?: string;
        schema?: string;
      })
    | {
        error?: string;
        code?: string;
        detail?: string;
        constraint?: string;
        table?: string;
        schema?: string;
      }
    | null;

  if (!response.ok) {
    const details = [
      payload?.detail,
      payload?.constraint ? `constraint: ${payload.constraint}` : undefined,
      payload?.table ? `table: ${payload.table}` : undefined,
      payload?.schema ? `schema: ${payload.schema}` : undefined,
      payload?.code ? `code: ${payload.code}` : undefined,
    ].filter(Boolean);
    throw new Error(
      details.length > 0
        ? `${payload?.error ?? "Request failed."} (${details.join("; ")})`
        : (payload?.error ?? "Request failed."),
    );
  }

  if (payload === null) {
    throw new Error("Empty response.");
  }

  return payload as T;
}
