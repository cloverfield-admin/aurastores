import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  // /auth/sign-in and /auth/register are deliberately absent. Registration is
  // closed, and sign-in is the platform console's door — it stays reachable by URL
  // for staff, but it is not something to publish to search engines.
  const publicPaths = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/security", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return publicPaths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
