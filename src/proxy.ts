import type { NextRequest } from "next/server";
import { adapter as proxyNodeAdapter } from "next/dist/server/web/adapter";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Node middleware entry: Next calls `default` with `{ handler, request, page }`.
 * A file that only named-exports `proxy` leaves `default` unset, so
 * `middlewareModule.default || middlewareModule` is the module object and throws
 * "adapterFn is not a function".
 */
export default proxyNodeAdapter;

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
