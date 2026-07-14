import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy to the Go engine (`aurestores-engine`).
 *
 * The admin console used to call the engine straight from the browser. That works
 * on localhost and nowhere else: the engine serves plain HTTP on :9000, and an
 * HTTPS page may not issue http:// requests — the browser blocks them as mixed
 * content before they ever leave. Sending them through this handler makes the
 * browser's hop same-origin HTTPS, and Node makes the cleartext hop to the engine.
 *
 * Everything after /api/engine is the engine's path, verbatim, so the console's
 * `/api/v1/...` call sites are unchanged. Two things fall away as a side effect:
 * there is no CORS preflight, so the engine's ALLOWED_ORIGINS no longer has to
 * list this origin, and the engine's address is no longer baked into client JS.
 *
 * This is a stopgap for the browser only. The engine is still reachable — and
 * still used by the mobile app — over cleartext HTTP; the real fix is TLS on the
 * engine, at which point this file should go away.
 */

export const runtime = "nodejs";

/**
 * Falls back to the old client-side variable so the deployed console keeps working
 * without a dashboard change. Rename it to ENGINE_ORIGIN when convenient: it is
 * read on the server now, and the NEXT_PUBLIC_ prefix says the opposite.
 */
const ENGINE_ORIGIN = (process.env.ENGINE_ORIGIN ?? process.env.NEXT_PUBLIC_ENGINE_URL ?? "").replace(
  /\/+$/,
  "",
);

/**
 * Only the versioned public API is proxied. The engine also serves
 * `/internal/v1/dispatch`, which is gated by a shared secret rather than a user
 * token and has no business being reachable through a browser origin.
 */
const PROXIED_PREFIX = "api/v1/";

/**
 * An allow-list, not a deny-list, and deliberately so: `Cookie` would hand the
 * engine a Supabase session it has no use for, and `X-Engine-Secret` must never be
 * something a browser gets to set. Mirrors the engine's own CORS Allow-Headers.
 */
const FORWARDED_REQUEST_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "idempotency-key",
  "x-aura-impersonate-org",
  "x-correlation-id",
];

/** Content-Encoding is not forwarded: fetch has already decompressed the body. */
const FORWARDED_RESPONSE_HEADERS = ["content-type", "x-correlation-id"];

/** The engine's own error shape, so the client unwraps this like any other reply. */
function engineError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function proxy(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!ENGINE_ORIGIN) {
    return engineError(
      503,
      "engine_not_configured",
      "ENGINE_ORIGIN is not set, so the admin console has no backend to talk to.",
    );
  }

  const { path } = await ctx.params;
  const enginePath = path.join("/");
  if (!enginePath.startsWith(PROXIED_PREFIX)) {
    return engineError(404, "not_found", `The engine path /${enginePath} is not proxied.`);
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  // Proxy hygiene, and inert today: the engine runs with TRUST_PROXY=false, because
  // it is also reachable directly, where an X-Forwarded-For would be caller-chosen
  // fiction. So admin_audit_log rows now record this proxy's egress IP rather than
  // the admin's own. Forwarded anyway, so the chain is already right the day
  // something trustworthy fronts the engine and TRUST_PROXY can be turned on.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    headers.set("x-forwarded-for", forwardedFor);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  let response: Response;
  try {
    response = await fetch(`${ENGINE_ORIGIN}/${enginePath}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      // The raw bytes, rather than a parsed-and-reserialised JSON round trip.
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    // A dead engine, a wrong ENGINE_ORIGIN, a VM that lost its public IP: all
    // arrive here as an opaque fetch failure, and all mean the same thing upstream.
    return engineError(502, "engine_unreachable", "The engine did not respond.");
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }
  responseHeaders.set("cache-control", "no-store");

  // 204/304 may not carry a body, and constructing a Response that does throws.
  const body = response.status === 204 || response.status === 304 ? null : response.body;

  return new NextResponse(body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
