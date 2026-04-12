/**
 * PKCE is required for server-driven email flows (signup confirmation, recovery)
 * so the auth code in the email link can be exchanged for a session.
 */
export const supabasePkceAuthOptions = {
  auth: {
    flowType: "pkce" as const,
  },
} as const;
