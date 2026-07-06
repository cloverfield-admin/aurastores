import { ImageResponse } from "next/og";
import { LOGO_MARK_SQUARE_SVG, svgDataUri } from "@/lib/brand-mark";

export const runtime = "edge";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img width={180} height={180} src={svgDataUri(LOGO_MARK_SQUARE_SVG)} alt="" />
      </div>
    ),
    { ...size },
  );
}
