import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

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

async function handleProxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const corsOrigin = isApi ? localDevOrigin(request) : null;

  // Answer the CORS preflight directly — it carries no auth/session, so there
  // is no need to run the Supabase session refresh for it.
  if (isApi && request.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), corsOrigin);
  }

  const response = await updateSupabaseSession(request);
  return isApi ? applyCors(response, corsOrigin) : response;
}

export { handleProxy as proxy };
export default handleProxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|swe-worker|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
