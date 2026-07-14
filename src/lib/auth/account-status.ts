/**
 * Account/organization status gates.
 *
 * These mirror `assertAccountUsable` in the Go engine
 * (aurestores-engine/internal/adapter/repository/postgres/appctx_repo.go) — same
 * conditions, same order, same codes. Both must agree: the store dashboard is
 * served by Next.js while the engine serves the mobile app and the admin console,
 * so enforcing in only one of them would leave a disabled account still able to
 * use the other.
 */

import { ROUTES } from "@/lib/routes";

export type AccountStatusCode =
  | "account_disabled"
  | "organization_suspended"
  | "organization_archived"
  | "membership_suspended";

const MESSAGES: Record<AccountStatusCode, string> = {
  account_disabled: "This account has been disabled. Contact support.",
  organization_suspended: "This store has been suspended. Contact support.",
  organization_archived: "This store has been archived.",
  membership_suspended: "Your access to this store has been revoked.",
};

/**
 * Thrown (not returned as null) on purpose: `null` from findByAuthUserId already
 * means "no account", and every caller redirects that to sign-in — which would
 * put a disabled user in an infinite sign-in loop with no explanation.
 */
export class AccountStatusError extends Error {
  readonly code: AccountStatusCode;

  constructor(code: AccountStatusCode) {
    super(MESSAGES[code]);
    this.name = "AccountStatusError";
    this.code = code;
  }
}

export function isAccountStatusError(error: unknown): error is AccountStatusError {
  return error instanceof AccountStatusError;
}

export function accountStatusMessage(code: AccountStatusCode): string {
  return MESSAGES[code];
}

export function parseAccountStatusCode(value: string | null | undefined): AccountStatusCode | null {
  return value && value in MESSAGES ? (value as AccountStatusCode) : null;
}

/** The page that explains a block, rather than bouncing the user back to sign-in. */
export function accountDisabledUrl(code: AccountStatusCode): string {
  return `${ROUTES.auth.accountDisabled}?reason=${code}`;
}

/**
 * Returns the blocking status, or null when the account may load.
 *
 * Two states deliberately do NOT block: membership `invited` (the live
 * staff-invite flow signs in to set a password) and `deletionScheduledAt` (there
 * is a 30-day window in which the user can sign in and cancel).
 *
 * Platform admins are exempt from the three tenant-state checks — suspending an
 * org must never lock an admin out of the console that suspends orgs. Only
 * `users.status` can lock an admin out, which makes it the kill switch for a
 * compromised admin account.
 */
export function accountStatusBlock(params: {
  userStatus: string;
  organizationStatus: string;
  membershipStatus: string;
  isPlatformAdmin: boolean;
}): AccountStatusCode | null {
  if (params.userStatus === "disabled") {
    return "account_disabled";
  }
  if (params.isPlatformAdmin) {
    return null;
  }
  if (params.organizationStatus === "suspended") {
    return "organization_suspended";
  }
  if (params.organizationStatus === "archived") {
    return "organization_archived";
  }
  if (params.membershipStatus === "suspended" || params.membershipStatus === "removed") {
    return "membership_suspended";
  }
  return null;
}
