/** User-facing product identity and payment reference prefix (keep in sync with emails and narrations). */
export const PRODUCT_NAME = "AuraStores";
export const PRODUCT_NAME_SHORT = "AuraStores";
export const PRODUCT_TAGLINE = "Store management platform";

/** Prefix for mobile-money / card narration strings (short, ASCII). */
export const PAYMENT_REFERENCE_PREFIX = "AuraStores";

/** localStorage / IndexedDB keys — legacy keys read once then migrated. */
export const STORAGE_KEYS = {
  theme: "aurastores-theme",
  themeLegacy: "aurapharma-theme",
  reactQuery: "aurastores-react-query",
  reactQueryLegacy: "aurapharma-react-query",
  onboardingFurthest: "aurastores-onboarding-furthest",
  onboardingFurthestLegacy: "aurapharma-onboarding-furthest",
  outboxV1Legacy: "aurapharma-offbox-v1",
  outboxV2: "aurastores-offbox-v2",
  outboxV2Legacy: "aurapharma-offbox-v2",
} as const;

export const OUTBOX_CHANGED_EVENT = "aurastores:outbox-changed";
export const OUTBOX_CHANGED_EVENT_LEGACY = "aurapharma:outbox-changed";
