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

export function getLipilaClientConfig(): LipilaClientConfig {
  const baseUrl = normalizeBaseUrl(process.env.LIPILA_BASE_URL?.trim() || "https://api.lipila.dev");
  const apiKey = requiredEnv("LIPILA_API_KEY");
  return { baseUrl, apiKey };
}

export function getLipilaGlobalWalletClientConfig(): LipilaClientConfig {
  const baseUrl = normalizeBaseUrl(process.env.LIPILA_BASE_URL?.trim() || "https://api.lipila.dev");
  const apiKey = requiredEnv("LIPILA_GLOBAL_WALLET_API_KEY");
  return { baseUrl, apiKey };
}

export class LipilaClient {
  constructor(private readonly cfg: LipilaClientConfig) {}

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
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": this.cfg.apiKey,
      },
    });
    const { text, json } = await this.readResponseBody(res);
    const payload = (json ?? null) as (T & { error?: string }) | { error?: string } | null;
    if (!res.ok) {
      const details = payload ? JSON.stringify(payload) : text ? text.slice(0, 4000) : "(empty body)";
      const wwwAuth = res.headers.get("www-authenticate");
      throw new Error(
        (payload && "error" in payload && payload.error)
          ? `Lipila error: ${payload.error}`
          : `Lipila request failed (${res.status}) for ${url.toString()}${wwwAuth ? ` (www-authenticate: ${wwwAuth})` : ""}. ${details}`,
      );
    }
    if (!payload) {
      throw new Error("Empty Lipila response.");
    }
    return payload as T;
  }

  private async postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string | undefined>) {
    const url = `${this.cfg.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": this.cfg.apiKey,
        ...(extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });
    const { text, json } = await this.readResponseBody(res);
    const payload = (json ?? null) as (T & { error?: string }) | { error?: string } | null;
    if (!res.ok) {
      const details = payload ? JSON.stringify(payload) : text ? text.slice(0, 4000) : "(empty body)";
      const wwwAuth = res.headers.get("www-authenticate");
      throw new Error(
        (payload && "error" in payload && payload.error)
          ? `Lipila error: ${payload.error}`
          : `Lipila request failed (${res.status}) for ${url}${wwwAuth ? ` (www-authenticate: ${wwwAuth})` : ""}. ${details}`,
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

