export type LipilaCollectionStatusResponse = {
  referenceId?: string;
  currency?: string;
  amount?: number;
  accountNumber?: string;
  status?: string;
  paymentType?: string;
  type?: string;
  ipAddress?: string;
  identifier?: string;
  externalId?: string;
  message?: string;
};

export type LipilaDisbursementResponse = LipilaCollectionStatusResponse & {
  createdAt?: string;
};

export type LipilaCardCollectionResponse = LipilaCollectionStatusResponse & {
  reference?: string;
  checkoutUrl?: string;
  url?: string;
  clientSecret?: string;
  data?: {
    referenceId?: string;
    checkoutUrl?: string;
    clientSecret?: string;
    message?: string;
  };
};

type LipilaClientConfig = {
  /** Example sandbox: https://api.lipila.dev ; production: https://blz.lipila.io */
  baseUrl: string;
  apiKey: string;
  apiKeyName?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} is not configured.`);
  }
  return v;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function compactHeaders(headers: Record<string, string | undefined> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const entries = Object.entries(headers).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
  );
  if (!entries.length) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

function shellEscape(value: string): string {
  // Minimal, safe shell escaping for copy/paste-able curl snippets.
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function maskSecret(value: string, tail = 4): string {
  if (!value) return value;
  if (value.length <= tail) return value;
  return `…${value.slice(-tail)}`;
}

function buildCurlCommand(input: {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string | undefined>;
  body?: unknown;
  /** If true, print secrets unmasked (NOT recommended). */
  revealSecrets?: boolean;
}): string {
  const reveal = !!input.revealSecrets;
  const normalizedHeaders: Record<string, string> = Object.fromEntries(
    Object.entries(compactHeaders(input.headers) ?? {}).map(([k, v]) => {
      const lk = k.toLowerCase();
      const shouldMask = !reveal && (lk === "x-api-key" || lk === "authorization");
      return [k, shouldMask ? (lk === "authorization" ? `Bearer ${maskSecret(v.replace(/^Bearer\s+/i, ""))}` : maskSecret(v)) : v];
    }),
  );

  const headerFlags = Object.entries(normalizedHeaders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `-H ${shellEscape(`${k}: ${v}`)}`)
    .join(" ");

  const dataFlag =
    input.method === "POST"
      ? ` --data-raw ${shellEscape(JSON.stringify(input.body ?? {}))}`
      : "";

  return `curl -i -X ${input.method} ${shellEscape(input.url)} ${headerFlags}${dataFlag}`;
}

export function getLipilaClientConfig(): LipilaClientConfig {
  const baseUrl = normalizeBaseUrl(process.env.LIPILA_BASE_URL?.trim() || "https://api.lipila.dev");
  const apiKey = requiredEnv("LIPILA_API_KEY");
  return { baseUrl, apiKey, apiKeyName: "LIPILA_API_KEY" };
}

export function getLipilaGlobalWalletClientConfig(): LipilaClientConfig {
  // Allow global wallet to target a different Lipila environment than collections.
  const baseUrl = normalizeBaseUrl(
    process.env.LIPILA_GLOBAL_WALLET_BASE_URL?.trim() ||
      process.env.LIPILA_BASE_URL?.trim() ||
      "https://api.lipila.dev",
  );
  const apiKey = requiredEnv("LIPILA_GLOBAL_WALLET_API_KEY");
  return { baseUrl, apiKey, apiKeyName: "LIPILA_GLOBAL_WALLET_API_KEY" };
}

export class LipilaClient {
  constructor(private readonly cfg: LipilaClientConfig) {}

  private authHeaders(): Record<string, string> {
    // Lipila docs specify `x-api-key`, but some gateway configs accept `Authorization: Bearer ...`.
    // Sending both improves compatibility across environments without leaking the raw key anywhere.
    return {
      "x-api-key": this.cfg.apiKey,
      authorization: `Bearer ${this.cfg.apiKey}`,
    };
  }

  private async readResponseBody(res: Response): Promise<{ text: string; json: unknown | null }> {
    const text = await res.text().catch(() => "");
    if (!text) return { text: "", json: null };
    try {
      return { text, json: JSON.parse(text) };
    } catch {
      return { text, json: null };
    }
  }

  private async getJson<T>(path: string, query?: Record<string, string>) {
    const url = new URL(`${this.cfg.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query ?? {})) {
      url.searchParams.set(k, v);
    }
    const requestUrl = url.toString();
    const requestHeaders = {
      accept: "application/json",
      ...this.authHeaders(),
    } as const;

    const res = await fetch(requestUrl, {
      method: "GET",
      headers: requestHeaders,
    });
    const { text, json } = await this.readResponseBody(res);
    const payload = (json ?? null) as (T & { error?: string }) | { error?: string } | null;
    if (!res.ok) {
      const details = payload ? JSON.stringify(payload) : text ? text.slice(0, 4000) : "(empty body)";
      const wwwAuth = res.headers.get("www-authenticate");
      const apiKeyHint = this.cfg.apiKey ? this.cfg.apiKey.slice(-4) : "";
      const cfgHint = ` (baseUrl: ${this.cfg.baseUrl}, apiKey: …${apiKeyHint}${this.cfg.apiKeyName ? ` from ${this.cfg.apiKeyName}` : ""})`;
      console.error("[lipila] request failed; replay with curl:", {
        status: res.status,
        url: requestUrl,
        curl: buildCurlCommand({
          method: "GET",
          url: requestUrl,
          headers: requestHeaders,
        }),
      });
      throw new Error(
        (payload && "error" in payload && payload.error)
          ? `Lipila error: ${payload.error}`
          : `Lipila request failed (${res.status}) for ${url.toString()}${cfgHint}${
              wwwAuth ? ` (www-authenticate: ${wwwAuth})` : ""
            }. ${details}`,
      );
    }
    if (!payload) {
      throw new Error("Empty Lipila response.");
    }
    return payload as T;
  }

  private async postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string | undefined>) {
    const url = `${this.cfg.baseUrl}${path}`;
    const compactExtra = compactHeaders(extraHeaders);
    const requestHeaders = {
      accept: "application/json",
      "content-type": "application/json",
      ...this.authHeaders(),
      ...(compactExtra ?? {}),
    } as const;
    const res = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });
    const { text, json } = await this.readResponseBody(res);
    const payload = (json ?? null) as (T & { error?: string }) | { error?: string } | null;
    if (!res.ok) {
      const details = payload ? JSON.stringify(payload) : text ? text.slice(0, 4000) : "(empty body)";
      const wwwAuth = res.headers.get("www-authenticate");
      const apiKeyHint = this.cfg.apiKey ? this.cfg.apiKey.slice(-4) : "";
      const cfgHint = ` (baseUrl: ${this.cfg.baseUrl}, apiKey: …${apiKeyHint}${this.cfg.apiKeyName ? ` from ${this.cfg.apiKeyName}` : ""})`;
      console.error("[lipila] request failed; replay with curl:", {
        status: res.status,
        url,
        curl: buildCurlCommand({
          method: "POST",
          url,
          headers: requestHeaders,
          body,
        }),
      });
      throw new Error(
        (payload && "error" in payload && payload.error)
          ? `Lipila error: ${payload.error}`
          : `Lipila request failed (${res.status}) for ${url}${cfgHint}${
              wwwAuth ? ` (www-authenticate: ${wwwAuth})` : ""
            }. ${details}`,
      );
    }
    if (!payload) {
      throw new Error("Empty Lipila response.");
    }
    return payload as T;
  }

  /**
   * Lipila docs: GET /api/v1/collections/check-status?referenceId=...
   * https://blaze-docs.lipila.dev/docs/collections/collection-status.html
   */
  checkCollectionStatus(referenceId: string) {
    return this.getJson<LipilaCollectionStatusResponse>("/api/v1/collections/check-status", { referenceId });
  }

  /**
   * Initiate a mobile money collection.
   * Note: Lipila initiation endpoints vary by product; we keep paths configurable.
   */
  startMobileMoneyCollection(body: unknown, opts?: { callbackUrl?: string }) {
    const path = process.env.LIPILA_MOMO_COLLECTIONS_PATH?.trim() || "/api/v1/collections/mobile-money";
    const callbackUrl = opts?.callbackUrl?.trim();
    return this.postJson<LipilaCollectionStatusResponse>(path, body, callbackUrl ? { callbackUrl } : undefined);
  }

  /**
   * Initiate a card collection using a PCI-safe, tokenized flow.
   * Note: Lipila initiation endpoints vary by product; we keep paths configurable.
   */
  startCardCollection(body: unknown) {
    const path = process.env.LIPILA_CARD_COLLECTIONS_PATH?.trim() || "/api/v1/collections/card";
    return this.postJson<LipilaCardCollectionResponse>(path, body);
  }

  /**
   * Initiate a mobile money disbursement from the configured Lipila wallet.
   * https://docs.lipila.dev/docs/disbursements/momodisbursements.html
   */
  startMobileMoneyDisbursement(body: unknown, opts?: { callbackUrl?: string }) {
    const path = process.env.LIPILA_MOMO_DISBURSEMENTS_PATH?.trim() || "/api/v1/disbursements/mobile-money";
    const callbackUrl = opts?.callbackUrl?.trim();
    return this.postJson<LipilaDisbursementResponse>(path, body, callbackUrl ? { callbackUrl } : undefined);
  }
}

export function createLipilaClient() {
  return new LipilaClient(getLipilaClientConfig());
}

export function createLipilaGlobalWalletClient() {
  return new LipilaClient(getLipilaGlobalWalletClientConfig());
}

