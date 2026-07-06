import { ImageResponse } from "next/og";
import { LOGO_MARK_SVG, svgDataUri } from "@/lib/brand-mark";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <img width={32} height={32} src={svgDataUri(LOGO_MARK_SVG)} alt="" />
      </div>
    ),
    { ...size },
  );
}
