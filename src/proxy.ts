import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const BILLING_SIGN_IN = "/billing/sign-in";

// Cross-origin support for the Flutter **web** build, which is served from a
// random localhost port and calls the API cross-origin (native iOS/Android
// builds are not subject to CORS). Only `localhost` / `127.0.0.1` origins are
// ever echoed back, so this stays safe in production where real browsers never
// present a localhost origin.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
};

/** Returns the request origin when it is a local-development browser, else null. */
function localDevOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  } catch {
    // Not a parseable origin — treat as disallowed.
  }
  return null;
}

function applyCors(response: NextResponse, origin: string | null): NextResponse {
  if (!origin) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.append("Vary", "Origin");
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * The store dashboard is CLOSED. The web app is the platform admin console; store
 * operators run their business from the mobile app.
 *
 * Enforced here rather than only in the dashboard layout because this runs before
 * any page can render, needs no database round-trip, and catches every route under
 * /dashboard at once — including ones added later. `/admin` then applies the real
 * gate (it is the only thing that actually checks who you are), and bounces
 * non-admins to the explanation page, so this cannot loop.
 */
function dashboardIsClosed(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return null;
  const url = request.nextUrl.clone();
  url.pathname = "/admin";
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * `/billing/*` is the one part of the web app store operators may reach, and it
 * is useless without a session — the plan, the invoices and the checkout all
 * come from the engine under the caller's own token. Bounce anonymous visitors
 * to the portal's own sign-in rather than the console's, which would refuse
 * them anyway.
 *
 * This is a "are you signed in at all" gate. Whether the account is actually an
 * owner or manager is settled by the billing sign-in route and re-checked by the
 * engine on every request.
 */
function billingNeedsSignIn(request: NextRequest, signedIn: boolean): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/billing")) return null;
  if (signedIn || pathname.startsWith(BILLING_SIGN_IN)) return null;
  const url = request.nextUrl.clone();
  url.pathname = BILLING_SIGN_IN;
  url.search = "";
  return NextResponse.redirect(url);
}

async function handleProxy(request: NextRequest) {
  const closed = dashboardIsClosed(request);
  if (closed) return closed;

  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const corsOrigin = isApi ? localDevOrigin(request) : null;

  // Answer the CORS preflight directly — it carries no auth/session, so there
  // is no need to run the Supabase session refresh for it.
  if (isApi && request.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), corsOrigin);
  }

  const { response, user } = await updateSupabaseSession(request);

  const needsSignIn = billingNeedsSignIn(request, Boolean(user));
  if (needsSignIn) return needsSignIn;

  return isApi ? applyCors(response, corsOrigin) : response;
}

export { handleProxy as proxy };
export default handleProxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|swe-worker|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
