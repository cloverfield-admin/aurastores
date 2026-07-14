import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The client reads NEXT_PUBLIC_ENGINE_URL at module scope, and mints its bearer
// token from the browser Supabase client — both have to be in place before import.
vi.mock("@/lib/supabase/browser-client", () => ({
  getEngineAccessToken: vi.fn(),
}));

const ENGINE = "http://engine.test";
process.env.NEXT_PUBLIC_ENGINE_URL = ENGINE;

const { adminFetch, EngineApiError, setImpersonationTarget } = await import("@/lib/api/engine");
const { getEngineAccessToken } = await import("@/lib/supabase/browser-client");

const mockToken = vi.mocked(getEngineAccessToken);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("adminFetch", () => {
  beforeEach(() => {
    mockToken.mockResolvedValue("test-token");
    setImpersonationTarget(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setImpersonationTarget(null);
  });

  it("unwraps the {data} envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: { users: 42 } })),
    );

    await expect(adminFetch<{ users: number }>("/api/v1/admin/x")).resolves.toEqual({ users: 42 });
  });

  it("sends the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await adminFetch("/api/v1/admin/x");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${ENGINE}/api/v1/admin/x`);
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("turns an {error} envelope into a typed EngineApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "invalid_input",
              message: "Validation failed.",
              details: [{ field: "display_name", message: "Required." }],
            },
          },
          400,
        ),
      ),
    );

    const error = await adminFetch("/api/v1/admin/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineApiError);
    const engineError = error as InstanceType<typeof EngineApiError>;
    expect(engineError.status).toBe(400);
    expect(engineError.code).toBe("invalid_input");
    // The field map is what drives per-field form errors.
    expect(engineError.fieldErrors()).toEqual({ display_name: "Required." });
  });

  it("fails with 401 rather than an anonymous request when there is no session", async () => {
    mockToken.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const error = await adminFetch("/api/v1/admin/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineApiError);
    expect((error as InstanceType<typeof EngineApiError>).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns undefined for a 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(adminFetch("/api/v1/admin/x")).resolves.toBeUndefined();
  });

  // Impersonation is opt-in per call: a plain adminFetch must never carry the
  // header, or a console read meant for the admin's own context would silently
  // resolve against whichever store was last viewed.
  it("only sends the impersonation header when the call asks for it", async () => {
    // A fresh Response per call: a Response body can only be read once.
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: null })));
    vi.stubGlobal("fetch", fetchMock);
    setImpersonationTarget("org-123");

    await adminFetch("/api/v1/admin/metrics/overview");
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("X-Aura-Impersonate-Org")).toBeNull();

    await adminFetch("/api/v1/stock", { impersonate: true });
    expect((fetchMock.mock.calls[1][1].headers as Headers).get("X-Aura-Impersonate-Org")).toBe(
      "org-123",
    );
  });

  it("does not send the header once the store view is exited", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: null }));
    vi.stubGlobal("fetch", fetchMock);
    setImpersonationTarget("org-123");
    setImpersonationTarget(null);

    await adminFetch("/api/v1/stock", { impersonate: true });
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("X-Aura-Impersonate-Org")).toBeNull();
  });
});
