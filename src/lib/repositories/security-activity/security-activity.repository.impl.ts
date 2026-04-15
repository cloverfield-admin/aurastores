import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  mapAuditActionToUiItem,
  type SecurityActivityUiItem,
} from "@/lib/repositories/security-activity/security-activity.mapper";

const MAX_RECENT_ACTIVITY_EVENTS = 3;

type AuditRow = {
  id: string;
  payload: unknown;
  createdAt: Date | string;
};

export async function listSecurityActivityForUser(userId: string): Promise<SecurityActivityUiItem[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        id::text AS "id",
        payload AS "payload",
        created_at AS "createdAt"
      FROM auth.audit_log_entries
      WHERE (payload->>'user_id') = ${userId}
         OR (payload->>'actor_id') = ${userId}
      ORDER BY created_at DESC
      LIMIT ${MAX_RECENT_ACTIVITY_EVENTS}
    `);

    const rows = Array.from(result as unknown as Iterable<AuditRow>);

    return rows.map((row) => {
      const createdAt =
        row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
      const p = row.payload as Record<string, unknown> | null;
      const ipFromPayload =
        typeof p?.ip_address === "string"
          ? p.ip_address
          : typeof p?.ipAddress === "string"
            ? p.ipAddress
            : null;
      return mapAuditActionToUiItem({
        rowId: row.id,
        payload: row.payload,
        createdAt,
        ipAddress: ipFromPayload,
      });
    });
  } catch (e) {
    console.warn(
      "[security-activity] Could not read auth.audit_log_entries (missing grant or audit disabled in Postgres):",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}
