/** Human-readable app role for UI (e.g. `pharmacist` → `Pharmacist`). */
export function formatMembershipRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

/** Organization roles that may manage subscription / billing in the app UI. */
export function isOrganizationOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}
