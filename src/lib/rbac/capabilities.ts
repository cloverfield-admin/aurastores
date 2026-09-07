export const MEMBERSHIP_CAPABILITY_KEYS = [
  "stock",
  "sales",
  "insights",
  "catalog",
  "staff",
  "pay",
  /**
   * Gates the expenses module. Deliberately separate from `pay`, which it used to
   * ride on: `pay` also unlocks the Aura Pay wallet and withdrawals, so selling
   * expenses in Pro by flipping `pay` would hand every Pro org the withdrawal rail.
   */
  "expenses",
  /**
   * Gates seeing how the business is PERFORMING — revenue, COGS, margin, profit
   * — as opposed to doing the work that generates it.
   *
   * Split out of `sales`, which conflated ringing up a sale with reading the
   * store's financial position. A cashier needs the till; showing them COGS
   * hands out supplier pricing and per-item margin.
   */
  "financials",
  "organization",
] as const;

export type MembershipCapability = (typeof MEMBERSHIP_CAPABILITY_KEYS)[number];

export type MembershipCapabilities = Record<MembershipCapability, boolean>;

const MEMBERSHIP_CAPABILITY_LABELS: Record<MembershipCapability, string> = {
  stock: "Stock & inventory",
  sales: "Sales & performance",
  insights: "Insights & analytics",
  catalog: "Product catalog & categories",
  staff: "Staff management",
  pay: "Aura Pay & payments",
  expenses: "Expenses",
  financials: "Revenue, cost & profit figures",
  organization: "Organization management",
};

/** Short, user-facing name for permission / access messages. */
export function membershipCapabilityLabel(key: MembershipCapability): string {
  return MEMBERSHIP_CAPABILITY_LABELS[key];
}

export function fullCapabilities(): MembershipCapabilities {
  return {
    stock: true,
    sales: true,
    insights: true,
    catalog: true,
    staff: true,
    pay: true,
    expenses: true,
    financials: true,
    organization: true,
  };
}

export function defaultCapabilitiesForAppRole(role: string): MembershipCapabilities {
  if (role === "owner" || role === "admin" || role === "aurastores_admin") {
    return fullCapabilities();
  }
  if (role === "manager") {
    /** Runs a branch and is answerable for its numbers. */
    return {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: false,
      pay: false,
      expenses: false,
      financials: true,
      organization: false,
    };
  }
  if (role === "pharmacist") {
    /** Clinical and dispensing: sells and manages stock, but the store's margin
     * is not their job — same reasoning as the cashier. */
    return {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: false,
      pay: false,
      expenses: false,
      financials: false,
      organization: false,
    };
  }
  if (role === "analyst") {
    /** Exists to read the numbers; holds no operational capability at all. */
    return {
      stock: false,
      sales: false,
      insights: true,
      catalog: true,
      staff: false,
      pay: false,
      expenses: false,
      financials: true,
      organization: false,
    };
  }
  /** Cashier and any unknown role: the till, not the books. */
  return {
    stock: true,
    sales: true,
    insights: false,
    catalog: false,
    staff: false,
    pay: false,
    expenses: false,
    financials: false,
    organization: false,
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
  /** Legacy DB payloads used `settings` for org-level access before `organization` existed. */
  if (typeof o.settings === "boolean" && !("organization" in o)) {
    next.organization = o.settings as boolean;
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
  const loose = partial as Partial<MembershipCapabilities> & { settings?: boolean };
  const normalized: Partial<MembershipCapabilities> = { ...partial };
  if (typeof loose.settings === "boolean" && normalized.organization === undefined) {
    normalized.organization = loose.settings;
  }
  const next = { ...base };
  for (const key of MEMBERSHIP_CAPABILITY_KEYS) {
    if (key in normalized && typeof normalized[key] === "boolean") {
      next[key] = normalized[key] as boolean;
    }
  }
  return next;
}

/** Roles that default to all org branches when no `branch_staff_assignments` rows exist. */
export function isOrgWideBranchRole(role: string): boolean {
  return role === "owner" || role === "admin" || role === "aurastores_admin" || role === "manager";
}
