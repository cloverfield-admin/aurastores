import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "AuraStores — Pharmacy management platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0fb9b1 0%, #6366f1 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            AuraStores
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 32,
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            Clarity across every sale
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
