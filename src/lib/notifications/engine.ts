import "server-only";

/**
 * Client for the aurestores-engine notification service. The webapp's emit
 * points call {@link dispatchNotification} to hand an event to the engine, which
 * resolves recipients, persists in-app rows and sends push. Calls are
 * fire-and-forget: a notification failure must NEVER break the business flow
 * that triggered it.
 *
 * Configure via env:
 *   AURESTORES_ENGINE_URL   e.g. https://engine.aurastores.app
 *   ENGINE_INTERNAL_SECRET  shared secret (same value the engine verifies)
 * When either is unset the client is a no-op, so the webapp runs fine without
 * the engine deployed.
 */

/** Notification types the engine's catalog understands. */
export type EngineNotificationType =
  | "low_stock"
  | "out_of_stock"
  | "batch_expiry"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_dunning"
  | "subscription_paid"
  | "payout_settled"
  | "sale_voided"
  | "sale_refunded"
  | "sales_milestone"
  | "staff_invite_accepted"
  | "license_approved"
  | "license_rejected"
  | "compliance_expiry"
  | "new_feature";

export type DispatchNotificationInput = {
  type: EngineNotificationType;
  organizationId: string;
  /** Scopes capability-resolved recipients to one branch (optional). */
  branchId?: string;
  /** Targets these users directly instead of resolving by capability (optional). */
  recipientUserIds?: string[];
  /** Free-form context the engine's catalog renders into the title/body. */
  params?: Record<string, string>;
};

const ENGINE_URL = process.env.AURESTORES_ENGINE_URL?.replace(/\/+$/, "");
const ENGINE_SECRET = process.env.ENGINE_INTERNAL_SECRET;
const DISPATCH_TIMEOUT_MS = 2500;

/**
 * Sends an event to the engine's internal dispatch endpoint. Never throws and
 * never rejects — errors (timeout, engine down, misconfig) are swallowed so the
 * caller is unaffected.
 */
export async function dispatchNotification(input: DispatchNotificationInput): Promise<void> {
  if (!ENGINE_URL || !ENGINE_SECRET) {
    return; // engine not configured — no-op
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    await fetch(`${ENGINE_URL}/internal/v1/dispatch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-engine-secret": ENGINE_SECRET,
      },
      body: JSON.stringify({
        type: input.type,
        organization_id: input.organizationId,
        branch_id: input.branchId,
        recipient_user_ids: input.recipientUserIds,
        params: input.params ?? {},
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch {
    // Fire-and-forget: swallow all errors.
  } finally {
    clearTimeout(timer);
  }
}

/** Formats an integer cents amount as a display string, e.g. "ZMW 1,204.80". */
export function formatMoneyCents(cents: number, currency = "ZMW"): string {
  const major = (cents / 100).toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${major}`;
}
