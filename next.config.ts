import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

function getSerwistRevision(): string {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercel) return vercel;
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  const hash = result.stdout?.trim();
  if (hash) return hash;
  return `dev-${Date.now()}`;
}

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: getSerwistRevision() }],
});

const supabaseImageHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.52"],
  async redirects() {
    return [
      {
        source: "/dashboard/onboarding/pharmacy-details",
        destination: "/dashboard/onboarding/location-details",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      ...(supabaseImageHost
        ? ([
            {
              protocol: "https" as const,
              hostname: supabaseImageHost,
              pathname: "/**",
            },
          ] as const)
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};


export default withSerwist(nextConfig);
