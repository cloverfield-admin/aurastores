import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Read at module scope by the handler, so it has to be set before the import.
const ENGINE = "http://engine.test:9000";
process.env.ENGINE_ORIGIN = ENGINE;

const { GET, POST, DELETE } = await import("@/app/api/engine/[...path]/route");

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`https://www.aurastores.app/api/engine/${path}`, init);
}

/** The catch-all's `path` param: what the handler would receive for a given URL. */
function params(path: string) {
  return { params: Promise.resolve({ path: path.split("?")[0].split("/") }) };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("engine proxy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: { users: 42 } })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards the path, query and bearer token to the engine", async () => {
    const path = "api/v1/admin/metrics/growth?days=30";
    const response = await GET(
      request(path, { headers: { authorization: "Bearer test-token" } }),
      params(path),
    );

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`${ENGINE}/api/v1/admin/metrics/growth?days=30`);
    expect((init!.headers as Headers).get("authorization")).toBe("Bearer test-token");
    await expect(response.json()).resolves.toEqual({ data: { users: 42 } });
  });

  it("forwards the impersonation header", async () => {
    const path = "api/v1/stock";
    await GET(request(path, { headers: { "x-aura-impersonate-org": "org-123" } }), params(path));

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Headers).get("x-aura-impersonate-org")).toBe("org-123");
  });

  // The allow-list exists for these two. A Supabase session cookie is not the
  // engine's business, and X-Engine-Secret is the credential guarding the engine's
  // internal endpoints — a browser must never be able to put one on the wire.
  it("strips cookies and the engine secret", async () => {
    const path = "api/v1/admin/x";
    await GET(
      request(path, {
        headers: { cookie: "sb-access-token=secret", "x-engine-secret": "forged" },
      }),
      params(path),
    );

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init!.headers as Headers).get("cookie")).toBeNull();
    expect((init!.headers as Headers).get("x-engine-secret")).toBeNull();
  });

  it("refuses to proxy anything outside /api/v1, and does not call the engine", async () => {
    const path = "internal/v1/dispatch";
    const response = await POST(request(path, { method: "POST" }), params(path));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "The engine path /internal/v1/dispatch is not proxied." },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a request body untouched", async () => {
    const path = "api/v1/admin/organizations/org-1/status";
    await POST(
      request(path, { method: "POST", body: JSON.stringify({ status: "suspended" }) }),
      params(path),
    );

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new TextDecoder().decode(init!.body as ArrayBuffer)).toBe('{"status":"suspended"}');
  });

  // A 204 carrying a body is not a legal Response, and constructing one throws.
  it("passes a 204 through without a body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const path = "api/v1/admin/organizations/org-1/deletion";

    const response = await DELETE(request(path, { method: "DELETE" }), params(path));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("turns an unreachable engine into a 502 the console can render", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    const path = "api/v1/admin/x";

    const response = await GET(request(path), params(path));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: { code: "engine_unreachable", message: "The engine did not respond." },
    });
  });

  it("reports a missing ENGINE_ORIGIN rather than proxying to nowhere", async () => {
    vi.resetModules();
    delete process.env.ENGINE_ORIGIN;
    delete process.env.NEXT_PUBLIC_ENGINE_URL;
    const route = await import("@/app/api/engine/[...path]/route");

    const path = "api/v1/admin/x";
    const response = await route.GET(request(path), params(path));

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("engine_not_configured");
    expect(fetch).not.toHaveBeenCalled();

    process.env.ENGINE_ORIGIN = ENGINE;
  });
});
