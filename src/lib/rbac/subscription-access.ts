/**
 * Who may manage an organization's subscription on the web.
 *
 * This is a ROLE check rather than a capability check, deliberately. The natural
 * capability would be `organization`, but a manager does not have it (see
 * defaultCapabilitiesForAppRole) and the plan page is explicitly meant to include
 * managers. Worse, capabilities are intersected with the PLAN's capabilities — so
 * gating billing on one would let a downgrade lock the org out of the page it needs
 * to undo the downgrade.
 *
 * Mirrored in the engine as the RequireRole guard on
 * POST/DELETE /api/v1/billing/subscription/downgrade — keep the two in sync.
 */
export const SUBSCRIPTION_MANAGER_ROLES = ["owner", "admin", "manager"] as const;

export function canManageSubscription(role: string): boolean {
  return (SUBSCRIPTION_MANAGER_ROLES as readonly string[]).includes(role);
}
