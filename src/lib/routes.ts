export const ROUTES = {
  auth: {
    /**
     * Still live, but PLATFORM STAFF ONLY and deliberately unlinked: the web app is
     * now the admin console, and store operators use the mobile app. Nothing on the
     * marketing site points here — admins navigate to it directly.
     */
    signIn: "/auth/sign-in",
    verifyEmail: "/auth/verify-email",
    forgotPassword: "/auth/forgot-password",
    /** PKCE redirect target for `resetPasswordForEmail` (email link lands here). */
    recovery: "/auth/recovery",
    updatePassword: "/auth/update-password",
    /** @deprecated Use `updatePassword`; kept for bookmarks. */
    changePassword: "/auth/change-password",
    /** Explains why a disabled/suspended account can't reach the console. */
    accountDisabled: "/auth/account-disabled",
    /** Explains that the web app is platform-staff only, and offers a sign-out. */
    webAdminOnly: "/auth/web-admin-only",
    // NOTE: there is no `register`. Self-service signup is closed on the web —
    // store owners sign up in the mobile app, which registers against the Go engine.
  },
  /**
   * The AuraStores platform console (`aurastores_admin` only).
   *
   * A top-level group, NOT under /dashboard: the dashboard shell is tenant-scoped
   * (branch switcher, capability nav, onboarding redirect) and the platform owner
   * is not a store operator.
   */
  admin: {
    root: "/admin",
    companies: "/admin/companies",
    company: (orgId: string) => `/admin/companies/${orgId}`,
    companyView: (orgId: string) => `/admin/companies/${orgId}/view`,
    revenue: "/admin/revenue",
    growth: "/admin/growth",
    pricing: "/admin/pricing",
    audit: "/admin/audit",
  },
  marketing: {
    pricing: "/#pricing",
    privacy: "/privacy",
    terms: "/terms",
    security: "/security",
  },
  dashboard: {
    main: "/dashboard",
    staff: "/dashboard/staff",
    staffAdd: "/dashboard/staff/add",
    staffAddReview: "/dashboard/staff/add/review",
    staffEdit: (membershipId: string) => `/dashboard/staff/${membershipId}/edit`,
    stock: "/dashboard/stock",
    stockAdd: "/dashboard/stock/add",
    stockBulkAdd: "/dashboard/stock/bulk-add",
    stockBatch: (batchId: string) => `/dashboard/stock/batches/${batchId}`,
    stockProductEdit: (productId: string) => `/dashboard/stock/products/${productId}/edit`,
    stockExpiring: "/dashboard/stock/expiring",
    sales: "/dashboard/sales",
    salesAdd: "/dashboard/sales/add",
    salesUnitsSold: "/dashboard/sales/units-sold",
    insights: "/dashboard/insights",
    productCategories: "/dashboard/product-categories",
    pay: "/dashboard/pay",
    expenses: "/dashboard/expenses",
    payTransaction: (paymentId: string) => `/dashboard/pay/transactions/${paymentId}`,
    organization: "/dashboard/organization",
    organizationBranches: {
      new: "/dashboard/organization/branches/new",
      detail: (branchId: string) => `/dashboard/organization/branches/${branchId}`,
      edit: (branchId: string) => `/dashboard/organization/branches/${branchId}/edit`,
    },
    onboarding: {
      root: "/dashboard/onboarding",
      locationDetails: "/dashboard/onboarding/location-details",
      license: "/dashboard/onboarding/license",
      review: "/dashboard/onboarding/review",
    },
  },
  demoSuccess: "/dashboard/demo/success",
  settings: "/dashboard/settings",
  billingPortal: "/dashboard/settings/billing",
  features: "/dashboard/features",
} as const;
