import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { idempotencyRequests } from "@/lib/db/schema/idempotency.schema";

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * When `Idempotency-Key` is absent, runs `execute` once with no persistence.
 * When present, serializes by key and stores the JSON response for safe replays.
 */
export async function withIdempotentMutation(
  request: Request,
  organizationId: string,
  scope: string,
  body: unknown,
  execute: () => Promise<{ status: number; body: unknown }>,
): Promise<NextResponse> {
  const rawKey = request.headers.get("idempotency-key")?.trim();
  if (!rawKey) {
    const result = await execute();
    return NextResponse.json(result.body, { status: result.status });
  }

  const idempotencyKey = rawKey.slice(0, 255);
  const requestHash = hashRequestBody(body);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}::text || '|' || ${scope}::text || '|' || ${idempotencyKey}::text))`,
    );

    const existing = await tx
      .select()
      .from(idempotencyRequests)
      .where(
        and(
          eq(idempotencyRequests.organizationId, organizationId),
          eq(idempotencyRequests.scope, scope),
          eq(idempotencyRequests.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing[0]) {
      if (existing[0].requestHash !== requestHash) {
        return NextResponse.json(
          { error: "Idempotency key was already used with a different request body." },
          { status: 409 },
        );
      }
      return NextResponse.json(existing[0].responseBody, { status: existing[0].responseStatus });
    }

    const result = await execute();
    await tx.insert(idempotencyRequests).values({
      organizationId,
      scope,
      idempotencyKey,
      requestHash,
      responseStatus: result.status,
      responseBody: result.body,
    });

    return NextResponse.json(result.body, { status: result.status });
  });
}
