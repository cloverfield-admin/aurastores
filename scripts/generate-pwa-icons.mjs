import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const teal = { r: 15, g: 185, b: 177 };
const indigo = { r: 99, g: 102, b: 241 };

/** 7 rows × 5 cols — letter A (matches icon.tsx “A” mark feel). */
const A_GRID = [
  "01110",
  "10001",
  "10001",
  "11111",
  "10001",
  "10001",
  "10001",
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawRoundedRectBackground(png, size, radiusPx) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ix = x < radiusPx ? radiusPx - x : x >= size - radiusPx ? x - (size - 1 - radiusPx) : 0;
      const iy = y < radiusPx ? radiusPx - y : y >= size - radiusPx ? y - (size - 1 - radiusPx) : 0;
      const corner =
        (x < radiusPx && y < radiusPx) ||
        (x >= size - radiusPx && y < radiusPx) ||
        (x < radiusPx && y >= size - radiusPx) ||
        (x >= size - radiusPx && y >= size - radiusPx);
      let inside = true;
      if (corner) {
        const cx = x < size / 2 ? radiusPx : size - 1 - radiusPx;
        const cy = y < size / 2 ? radiusPx : size - 1 - radiusPx;
        const dx = x - cx;
        const dy = y - cy;
        inside = dx * dx + dy * dy <= radiusPx * radiusPx;
      }
      const idx = (size * y + x) << 2;
      if (!inside) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }
      const t = (x / (size - 1) + y / (size - 1)) / 2;
      png.data[idx] = Math.round(lerp(teal.r, indigo.r, t));
      png.data[idx + 1] = Math.round(lerp(teal.g, indigo.g, t));
      png.data[idx + 2] = Math.round(lerp(teal.b, indigo.b, t));
      png.data[idx + 3] = 255;
    }
  }
}

function paintLetterA(png, size, cell, offsetX, offsetY) {
  const rows = A_GRID.length;
  const cols = A_GRID[0].length;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (A_GRID[gy][gx] !== "1") continue;
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = offsetX + gx * cell + dx;
          const y = offsetY + gy * cell + dy;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          const idx = (size * y + x) << 2;
          png.data[idx] = 255;
          png.data[idx + 1] = 255;
          png.data[idx + 2] = 255;
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

function buildIcon(size, { maskable } = { maskable: false }) {
  const png = new PNG({ width: size, height: size, colorType: 6, inputHasAlpha: true });
  const radius = Math.max(6, Math.round((6 / 32) * size));
  drawRoundedRectBackground(png, size, radius);

  const inset = maskable ? Math.round(size * 0.2) : Math.round(size * 0.12);
  const inner = size - inset * 2;
  const cols = A_GRID[0].length;
  const rows = A_GRID.length;
  const cell = Math.floor(inner / Math.max(cols, rows));
  const gridW = cols * cell;
  const gridH = rows * cell;
  const offsetX = Math.floor((size - gridW) / 2);
  const offsetY = Math.floor((size - gridH) / 2) - Math.round(cell * 0.15);
  paintLetterA(png, size, cell, offsetX, offsetY);

  return PNG.sync.write(png);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, "icon-192x192.png"), buildIcon(192, { maskable: false }));
fs.writeFileSync(path.join(publicDir, "icon-512x512.png"), buildIcon(512, { maskable: false }));
fs.writeFileSync(path.join(publicDir, "icon-maskable-512x512.png"), buildIcon(512, { maskable: true }));

console.log("Wrote public/icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png");
