/**
 * Inline SVG sources for the AuraStores monogram — a crossbar-less "A" with a
 * mint accent dot. Used by the favicon / app-icon generators (`app/icon.tsx`,
 * `app/apple-icon.tsx`) so the raster icons stay in sync with the SVG brand kit
 * in `public/brand/`.
 */

/** Rounded-tile mark: deep-teal tile, white glyph, mint dot. */
export const LOGO_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#0d5c54"/><path d="M24 10.5 L37 37.5 H30.8 L24 22.5 L17.2 37.5 H11 Z" fill="#ffffff"/><circle cx="24" cy="32" r="3.4" fill="#a9e3d6"/></svg>';

/** Full-bleed square mark (no corner rounding) — iOS applies its own mask. */
export const LOGO_MARK_SQUARE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#0d5c54"/><path d="M24 10.5 L37 37.5 H30.8 L24 22.5 L17.2 37.5 H11 Z" fill="#ffffff"/><circle cx="24" cy="32" r="3.4" fill="#a9e3d6"/></svg>';

/** Encode an SVG string as an inline data URI (safe for `<img src>` in next/og). */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
