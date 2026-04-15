import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { createLipilaClient } from "@/lib/billing/lipila-client";

export async function GET(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const { searchParams } = new URL(request.url);
  const referenceId = searchParams.get("referenceId")?.trim();
  if (!referenceId) {
    return NextResponse.json({ error: "Missing referenceId." }, { status: 400 });
  }

  try {
    const lipila = createLipilaClient();
    const status = await lipila.checkCollectionStatus(referenceId);
    return NextResponse.json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not check collection status.";
    console.error("[billing] lipila status check failed", { referenceId, error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

