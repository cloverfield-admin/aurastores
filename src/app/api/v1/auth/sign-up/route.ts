import { NextResponse } from "next/server";

/**
 * Self-service signup is CLOSED on the web.
 *
 * The web app is the platform admin console now. Store owners create their store in
 * the AuraStores mobile app, which registers against the Go engine — not this route
 * — so closing this breaks nothing for them. Platform-admin accounts are provisioned
 * out of band by granting an `aurastores_admin` membership; there is deliberately no
 * self-service path to a superuser.
 *
 * This answers 410 Gone rather than 404: the endpoint existed and is intentionally
 * retired, and a stale client deserves to be told that instead of left guessing at a
 * mistyped URL.
 */
function gone() {
  return NextResponse.json(
    {
      error:
        "Signing up on the web is no longer available. Download the AuraStores mobile app to create your store.",
      code: "SIGNUP_CLOSED" as const,
    },
    { status: 410 },
  );
}

export async function POST() {
  return gone();
}

export async function GET() {
  return gone();
}
