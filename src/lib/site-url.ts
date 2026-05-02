/**
 * Canonical site origin for metadata, sitemap, and robots.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://example.com).
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getMetadataBase(): URL {
  const origin = getSiteUrl();
  return new URL(`${origin}/`);
}
