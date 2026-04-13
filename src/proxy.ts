import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

async function handleProxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export { handleProxy as proxy };
export default handleProxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
