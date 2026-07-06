import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

/*
 * Builds src/app/favicon.ico from the AuraStores monogram (16/32/48 px PNGs
 * packed into an ICO). Geometry mirrors public/brand/logo-mark.svg. This is the
 * legacy tab-icon fallback; app/icon.tsx serves the primary PNG favicon.
 */

const TEAL = { r: 0x0d, g: 0x5c, b: 0x54 };
const WHITE = { r: 0xff, g: 0xff, b: 0xff };
const MINT = { r: 0xa9, g: 0xe3, b: 0xd6 };

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
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function insideRoundedRect(px, py, size, r) {
  if (px < 0 || py < 0 || px > size || py > size) return false;
  if (r <= 0) return true;
  const min = r;
  const max = size - r;
  if ((px < min || px > max) && (py < min || py > max)) {
    const cx = px < min ? min : max;
    const cy = py < min ? min : max;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  }
  return true;
}

function renderPng(size) {
  const png = new PNG({ width: size, height: size, colorType: 6, inputHasAlpha: true });
  const radius = Math.round((12 / 48) * size);
  const box = size * 0.82;
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
          if (!insideRoundedRect(px, py, size, radius)) continue;
          let c = TEAL;
          if ((px - dot.cx) ** 2 + (py - dot.cy) ** 2 <= dot.r * dot.r) c = MINT;
          else if (pointInPolygon(px, py, poly)) c = WHITE;
          sr += c.r;
          sg += c.g;
          sb += c.b;
          opaque++;
        }
      }
      const idx = (size * y + x) << 2;
      if (opaque === 0) {
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

function packIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dir = [];
  const images = [];
  let offset = 6 + entries.length * 16;
  for (const { size, buffer } of entries) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buffer.length, 8);
    e.writeUInt32LE(offset, 12);
    dir.push(e);
    images.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...dir, ...images]);
}

const entries = [16, 32, 48].map((size) => ({ size, buffer: renderPng(size) }));
const ico = packIco(entries);
const out = path.join(process.cwd(), "src", "app", "favicon.ico");
fs.writeFileSync(out, ico);
console.log(`Wrote ${out} (${ico.length} bytes, sizes ${entries.map((e) => e.size).join("/")})`);
