export const ROUTES = {
  auth: {
    signIn: "/auth/sign-in",
    register: "/auth/register",
    changePassword: "/auth/change-password",
  },
  dashboard: {
    main: "/dashboard",
    stock: "/dashboard/stock",
    stockAdd: "/dashboard/stock/add",
    sales: "/dashboard/sales",
    salesAdd: "/dashboard/sales/add",
    insights: "/dashboard/insights",
    pay: "/dashboard/pay",
    onboarding: {
      root: "/dashboard/onboarding",
      pharmacyDetails: "/dashboard/onboarding/pharmacy-details",
      license: "/dashboard/onboarding/license",
      review: "/dashboard/onboarding/review",
    },
  },
  demoSuccess: "/dashboard/demo/success",
  settings: "/dashboard/settings",
  features: "/dashboard/features",
} as const;
