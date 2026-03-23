import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(ROUTES.auth.signIn, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

export async function GET() {
  return signOut();
}

export async function POST() {
  return signOut();
}
