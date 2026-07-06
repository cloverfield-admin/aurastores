import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

/*
 * Renders the AuraStores monogram (deep-teal tile, white crossbar-less "A",
 * mint accent dot) to the PWA raster icons. Geometry mirrors
 * public/brand/logo-mark.svg (48×48 unit box). Antialiased via 4× supersampling.
 */

const TEAL = { r: 0x0d, g: 0x5c, b: 0x54 }; // #0d5c54 tile
const WHITE = { r: 0xff, g: 0xff, b: 0xff }; // glyph
const MINT = { r: 0xa9, g: 0xe3, b: 0xd6 }; // #a9e3d6 dot

// Monogram geometry in the 48×48 unit box.
const CHEVRON = [
  [24, 10.5],
  [37, 37.5],
  [30.8, 37.5],
  [24, 22.5],
  [17.2, 37.5],
  [11, 37.5],
];
const DOT = { cx: 24, cy: 32, r: 3.4 };

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function insideRoundedRect(px, py, size, r) {
  if (px < 0 || py < 0 || px > size || py > size) return false;
  if (r <= 0) return true;
  const min = r;
  const max = size - r;
  const cornerX = px < min || px > max;
  const cornerY = py < min || py > max;
  if (cornerX && cornerY) {
    const cx = px < min ? min : max;
    const cy = py < min ? min : max;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }
  return true;
}

/** Color of a single sample point, or null when outside the tile (transparent). */
function sampleColor(px, py, size, radius, poly, dot) {
  if (!insideRoundedRect(px, py, size, radius)) return null;
  const ddx = px - dot.cx;
  const ddy = py - dot.cy;
  if (ddx * ddx + ddy * ddy <= dot.r * dot.r) return MINT;
  if (pointInPolygon(px, py, poly)) return WHITE;
  return TEAL;
}

function buildIcon(size, { maskable } = { maskable: false }) {
  const png = new PNG({ width: size, height: size, colorType: 6, inputHasAlpha: true });
  // Rounded tile for standard icons; full-bleed square for maskable (launcher masks it).
  const radius = maskable ? 0 : Math.round((12 / 48) * size);
  // Content scale: keep the glyph inside the maskable safe zone, fuller otherwise.
  const contentFrac = maskable ? 0.62 : 0.78;
  const box = size * contentFrac;
  const scale = box / 48;
  const off = (size - box) / 2;
  const poly = CHEVRON.map(([x, y]) => [off + x * scale, off + y * scale]);
  const dot = { cx: off + DOT.cx * scale, cy: off + DOT.cy * scale, r: DOT.r * scale };

  const SS = 4;
  const samples = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let opaque = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const c = sampleColor(px, py, size, radius, poly, dot);
          if (!c) continue;
          sr += c.r;
          sg += c.g;
          sb += c.b;
          opaque++;
        }
      }
      const idx = (size * y + x) << 2;
      if (opaque === 0) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }
      png.data[idx] = Math.round(sr / opaque);
      png.data[idx + 1] = Math.round(sg / opaque);
      png.data[idx + 2] = Math.round(sb / opaque);
      png.data[idx + 3] = Math.round((opaque / samples) * 255);
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, "icon-192x192.png"), buildIcon(192, { maskable: false }));
fs.writeFileSync(path.join(publicDir, "icon-512x512.png"), buildIcon(512, { maskable: false }));
fs.writeFileSync(path.join(publicDir, "icon-maskable-512x512.png"), buildIcon(512, { maskable: true }));

console.log("Wrote public/icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png");
