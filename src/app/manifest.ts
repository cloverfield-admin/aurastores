import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AuraPharma",
    short_name: "AuraPharma",
    description:
      "Cloud-based pharmacy management with inventory, sales intelligence, and multi-branch sync.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#0fb9b1",
  };
}
