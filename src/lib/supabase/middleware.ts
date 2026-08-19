import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { AUTH_PATHNAME_HEADER } from "@/lib/auth/safe-redirect";
import { supabasePkceAuthOptions } from "@/lib/supabase/auth-client-options";

function requestHeadersWithPathname(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(AUTH_PATHNAME_HEADER, request.nextUrl.pathname);
  return headers;
}

/**
 * Refreshes the Supabase session cookie and reports who the request belongs to.
 *
 * The user is returned as well as the response because the proxy gates
 * `/billing/*` on being signed in, and re-reading the session there would mean a
 * second round-trip on every request.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: requestHeadersWithPathname(request),
    },
  });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    ...supabasePkceAuthOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({
          request: {
            headers: requestHeadersWithPathname(request),
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as CookieOptions);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
