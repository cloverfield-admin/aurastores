export type SecurityActivityIcon = "shield" | "login" | "logout" | "key" | "notifications" | "palette";

export type SecurityActivityUiItem = {
  id: string;
  action: string;
  title: string;
  description: string;
  occurredAt: string;
  icon: SecurityActivityIcon;
};

function parsePayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function actionFromPayload(p: Record<string, unknown>): string {
  const a = p.action;
  return typeof a === "string" ? a : "";
}

function userAgentFromPayload(p: Record<string, unknown>): string | undefined {
  const ua = p.user_agent ?? p.userAgent;
  return typeof ua === "string" ? ua : undefined;
}

function providerFromPayload(p: Record<string, unknown>): string | undefined {
  const m = p.metadata;
  if (m && typeof m === "object" && !Array.isArray(m)) {
    const prov = (m as Record<string, unknown>).provider;
    return typeof prov === "string" ? prov : undefined;
  }
  return undefined;
}

/** Maps Supabase Auth audit `action` values to dashboard copy. */
export function mapAuditActionToUiItem(params: {
  rowId: string;
  payload: unknown;
  createdAt: Date | string;
  ipAddress: string | null | undefined;
}): SecurityActivityUiItem {
  const p = parsePayload(params.payload);
  const action = actionFromPayload(p);
  const ua = userAgentFromPayload(p);
  const provider = providerFromPayload(p);
  const ipFromPayload = typeof p.ip_address === "string" ? p.ip_address.trim() : undefined;
  const ip = (params.ipAddress?.trim() || ipFromPayload) || undefined;

  const occurredAt =
    typeof params.createdAt === "string" ? params.createdAt : params.createdAt.toISOString();

  const base = {
    id: params.rowId,
    action,
    occurredAt,
    icon: "shield" as SecurityActivityIcon,
    title: "Account activity",
    description: "An authentication event was recorded for your account.",
  };

  switch (action) {
    case "user_updated_password":
      return {
        ...base,
        icon: "shield",
        title: "Password updated",
        description:
          "Your account password was changed. If this was not you, reset your password and contact support immediately.",
      };
    case "user_recovery_requested":
      return {
        ...base,
        icon: "key",
        title: "Password reset requested",
        description: "A password reset was requested for your email address.",
      };
    case "login":
      return {
        ...base,
        icon: "login",
        title: "Sign-in",
        description: [
          provider ? `Signed in via ${provider}.` : "Signed in to your account.",
          ip ? `IP: ${ip}.` : null,
          ua ? `Device: ${ua.slice(0, 120)}${ua.length > 120 ? "…" : ""}` : null,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "logout":
      return {
        ...base,
        icon: "logout",
        title: "Signed out",
        description: "You were signed out of your account.",
      };
    case "token_refreshed":
      return {
        ...base,
        icon: "notifications",
        title: "Session refreshed",
        description: "Your session was extended automatically.",
      };
    case "user_signedup":
      return {
        ...base,
        icon: "shield",
        title: "Account created",
        description: "Your AuraPharma account was registered.",
      };
    case "user_confirmation_requested":
      return {
        ...base,
        icon: "palette",
        title: "Verification requested",
        description: "A confirmation email was sent for your account.",
      };
    default:
      return {
        ...base,
        title: action ? `Security: ${action.replace(/_/g, " ")}` : base.title,
        description: [ip ? `IP: ${ip}.` : null, ua ? ua.slice(0, 160) : null].filter(Boolean).join(" ") || base.description,
      };
  }
}
