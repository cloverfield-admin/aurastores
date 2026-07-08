import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  const publicPaths = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/auth/sign-in", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/auth/register", priority: 0.5, changeFrequency: "monthly" as const },
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
