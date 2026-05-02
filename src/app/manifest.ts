import type { MetadataRoute } from "next";

const THEME_COLOR = "#0fb9b1";
const BG = "#fafafa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AuraStores — Pharmacy management platform",
    short_name: "AuraStores",
    description:
      "Cloud-based pharmacy management with inventory, sales intelligence, and multi-branch sync.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: BG,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
