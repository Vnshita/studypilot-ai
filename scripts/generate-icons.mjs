#!/usr/bin/env bun
/**
 * Generates every icon the app needs for Android and Apple devices, from one
 * drawing routine. Zero dependencies: PNG encoding lives in
 * scripts/lib/png-encoder.mjs (zlib deflate + CRC32 chunks).
 *
 * Outputs into public/:
 *   icon-192.png            Android home screen / manifest "any"
 *   icon-512.png            Android splash / manifest "any"
 *   icon-maskable-192.png   Android adaptive icon (safe-zone padded)
 *   icon-maskable-512.png   Android adaptive icon (safe-zone padded)
 *   apple-touch-icon.png    180px, opaque — iOS home screen
 *   favicon-32.png          browser tab
 *   favicon-16.png          browser tab
 *
 * Run with: bun scripts/generate-icons.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png-encoder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

// Brand palette — kept in sync with src/index.css and the logo SVG.
const INK = [0x29, 0x1f, 0x16, 0xff]; // #291F16
const IVORY = [0xf4, 0xee, 0xe2, 0xff]; // #F4EEE2
const CLEAR = [0, 0, 0, 0];

// The glyph from logo.svg, in its 96.81 x 96.81 view box.
const GLYPH = [
  { x: 24.67, y: 24.67, w: 47.47, h: 11.87 }, // top bar
  { x: 24.67, y: 36.54, w: 11.87, h: 35.61 }, // stem
  { x: 40.06, y: 39.98, w: 23.74, h: 11.87 }, // arm
  { x: 40.06, y: 51.85, w: 11.87, h: 20.3 }, // lower stem
];

function createCanvas(size) {
  const data = Buffer.alloc(size * size * 4);
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    const a = color[3] / 255;
    if (a >= 1) {
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
    } else {
      // Simple source-over blending for soft corners.
      const inv = 1 - a;
      data[i] = Math.round(color[0] * a + data[i] * inv);
      data[i + 1] = Math.round(color[1] * a + data[i + 1] * inv);
      data[i + 2] = Math.round(color[2] * a + data[i + 2] * inv);
      data[i + 3] = Math.min(255, data[i + 3] + color[3] * inv);
    }
  };
  return {
    data,
    fillRect(x, y, w, h, color) {
      for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
        for (let xx = Math.round(x); xx < Math.round(x + w); xx++) {
          setPixel(xx, yy, color);
        }
      }
    },
  };
}

/** Rounded-rectangle fill (anti-aliased corners via distance check). */
function fillRoundedRect(canvas, x, y, w, h, r, color) {
  const { data } = canvas;
  const size = Math.sqrt(data.length / 4);
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(size, Math.ceil(y + h)); yy++) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(size, Math.ceil(x + w)); xx++) {
      const dx = xx < x + r ? x + r - xx : xx >= x + w - r ? xx - (x + w - r - 1) : 0;
      const dy = yy < y + r ? y + r - yy : yy >= y + h - r ? yy - (y + h - r - 1) : 0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        canvas.fillRect(xx, yy, 1, 1, color);
      } else if (dist <= r + 1) {
        // One-pixel soft edge.
        const alpha = Math.round(color[3] * (r + 1 - dist));
        canvas.fillRect(xx, yy, 1, 1, [color[0], color[1], color[2], alpha]);
      }
    }
  }
}

/**
 * Draw the icon at `size`.
 * - rounded: transparent corners matching the SVG (browser/favicon use)
 * - square:  full-bleed background (maskable / adaptive icons)
 * - padding: fraction of the size kept clear around the glyph (safe zone)
 */
function drawIcon({ size, rounded, padding = 0 }) {
  const canvas = createCanvas(size);

  if (rounded) {
    fillRoundedRect(canvas, 0, 0, size, size, size * (18 / 96.81), INK);
  } else {
    canvas.fillRect(0, 0, size, size, INK);
  }

  const glyphBox = 96.81;
  const contentSize = size * (1 - 2 * padding);
  const scale = contentSize / glyphBox;
  const offset = (size - contentSize) / 2;

  for (const rect of GLYPH) {
    canvas.fillRect(
      offset + rect.x * scale,
      offset + rect.y * scale,
      rect.w * scale,
      rect.h * scale,
      IVORY,
    );
  }

  return canvas;
}

const outputs = [
  { name: "icon-192.png", size: 192, rounded: true, padding: 0 },
  { name: "icon-512.png", size: 512, rounded: true, padding: 0 },
  { name: "icon-maskable-192.png", size: 192, rounded: false, padding: 0.1 },
  { name: "icon-maskable-512.png", size: 512, rounded: false, padding: 0.1 },
  // iOS applies its own superellipse mask; opaque background required.
  { name: "apple-touch-icon.png", size: 180, rounded: false, padding: 0.06 },
  { name: "favicon-32.png", size: 32, rounded: true, padding: 0 },
  { name: "favicon-16.png", size: 16, rounded: true, padding: 0 },
];

for (const spec of outputs) {
  const canvas = drawIcon(spec);
  const png = encodePng(spec.size, spec.size, canvas.data);
  writeFileSync(path.join(outDir, spec.name), png);
  console.log(`✓ ${spec.name} (${spec.size}×${spec.size})`);
}

console.log(`\nWrote ${outputs.length} icons to public/`);
