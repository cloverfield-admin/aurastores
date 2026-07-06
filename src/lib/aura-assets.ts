/** Self-hosted marketing and dashboard imagery (local `public/aura`). */
export const AURA_ASSETS = {
  /** Primary brand mark — deep-teal monogram tile (crossbar-less "A" + mint dot). */
  logoMark: "/brand/logo-mark.svg",
  /** Brand mark for dark surfaces — mint tile, dark glyph. */
  logoMarkDark: "/brand/logo-mark-dark.svg",
  /** Glyph only (no tile) for light surfaces. */
  logoGlyph: "/brand/logo-glyph.svg",
  /** Glyph only (no tile) for colored / dark surfaces. */
  logoGlyphWhite: "/brand/logo-glyph-white.svg",
  /** @deprecated Legacy wordmark (viewBox 680×420); superseded by the monogram lockup in `AppLogo`. */
  appLogoWordmark: "/aura_stores_logo.svg",
  heroDashboard: "/aura/hero-dashboard.svg",
  featurePharmacy: "/aura/feature-pharmacy.svg",
  featureAnalytics: "/aura/feature-analytics.svg",
  mapMain: "/aura/map-main.svg",
  mapEast: "/aura/map-east.svg",
  mapWarehouse: "/aura/map-warehouse.svg",
} as const;
