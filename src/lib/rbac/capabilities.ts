export const MEMBERSHIP_CAPABILITY_KEYS = [
  "stock",
  "sales",
  "insights",
  "catalog",
  "staff",
  "pay",
  "settings",
] as const;

export type MembershipCapability = (typeof MEMBERSHIP_CAPABILITY_KEYS)[number];

export type MembershipCapabilities = Record<MembershipCapability, boolean>;

export function fullCapabilities(): MembershipCapabilities {
  return {
    stock: true,
    sales: true,
    insights: true,
    catalog: true,
    staff: true,
    pay: true,
    settings: true,
  };
}

export function defaultCapabilitiesForAppRole(role: string): MembershipCapabilities {
  if (role === "owner" || role === "admin") {
    return fullCapabilities();
  }
  if (role === "pharmacist" || role === "manager") {
    return {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: false,
      pay: false,
      settings: false,
    };
  }
  if (role === "analyst") {
    return {
      stock: false,
      sales: false,
      insights: true,
      catalog: true,
      staff: false,
      pay: false,
      settings: false,
    };
  }
  return {
    stock: true,
    sales: true,
    insights: false,
    catalog: false,
    staff: false,
    pay: false,
    settings: false,
  };
}

export function hasCapability(capabilities: MembershipCapabilities, key: MembershipCapability): boolean {
  return Boolean(capabilities[key]);
}

export function normalizeStoredCapabilities(raw: unknown, roleFallback: string): MembershipCapabilities {
  const base = defaultCapabilitiesForAppRole(roleFallback);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }
  const o = raw as Record<string, unknown>;
  const next = { ...base };
  for (const key of MEMBERSHIP_CAPABILITY_KEYS) {
    if (key in o && typeof o[key] === "boolean") {
      next[key] = o[key] as boolean;
    }
  }
  return next;
}

export function mergeCapabilitiesFromInput(
  role: string,
  partial: Partial<MembershipCapabilities> | undefined | null,
): MembershipCapabilities {
  const base = defaultCapabilitiesForAppRole(role);
  if (!partial) {
    return base;
  }
  const next = { ...base };
  for (const key of MEMBERSHIP_CAPABILITY_KEYS) {
    if (key in partial && typeof partial[key] === "boolean") {
      next[key] = partial[key] as boolean;
    }
  }
  return next;
}

export function isOrgWideBranchRole(role: string): boolean {
  return role === "owner" || role === "admin";
}
