#!/usr/bin/env bun
/**
 * Generates the store listings' graphic assets from the brand mark.
 * Zero dependencies (PNG writer in scripts/lib/png-encoder.mjs).
 *
 * Android (Google Play, aab requirements):
 *   launcher mipmaps: ic_launcher + ic_launcher_round at 48..192 px
 *     (written to android-store-assets/mipmap-mdpi ... mipmap-xxxhdpi)
 *   store/android/feature-graphic.png     1024x500
 *   store/android/high-res-icon-512.png   512x512
 *   store/android/splash.png              480x769 base
 * iOS (App Store):
 *   store/ios/AppIcon.appiconset/AppIcon-1024.png + Contents.json
 *
 * Run with: bun scripts/generate-store-assets.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png-encoder.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const INK = [0x29, 0x1f, 0x16, 0xff];
const IVORY = [0xf4, 0xee, 0xe2, 0xff];
const PAPER = [0xfa, 0xf7, 0xf0, 0xff];

const GLYPH = [
  { x: 24.67, y: 24.67, w: 47.47, h: 11.87 },
  { x: 24.67, y: 36.54, w: 11.87, h: 35.61 },
  { x: 40.06, y: 39.98, w: 23.74, h: 11.87 },
  { x: 40.06, y: 51.85, w: 11.87, h: 20.3 },
];

function canvas(w, h) {
  const data = Buffer.alloc(w * h * 4);
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = c[0];
    data[i + 1] = c[1];
    data[i + 2] = c[2];
    data[i + 3] = c[3];
  };
  return {
    data,
    w,
    h,
    fillRect(x, y, rw, rh, c) {
      for (let yy = Math.round(y); yy < Math.round(y + rh); yy++)
        for (let xx = Math.round(x); xx < Math.round(x + rw); xx++) put(xx, yy, c);
    },
  };
}

function drawGlyph(cv, pad) {
  const content = Math.min(cv.w, cv.h) * (1 - 2 * pad);
  const s = content / 96.81;
  const ox = (cv.w - content) / 2;
  const oy = (cv.h - content) / 2;
  for (const r of GLYPH) {
    cv.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s, IVORY);
  }
}

function icon(size) {
  const cv = canvas(size, size);
  cv.fillRect(0, 0, size, size, INK);
  drawGlyph(cv, 0.16);
  return cv;
}

/** Feature graphic: ink field, centered mark, subtle paper band. */
function featureGraphic() {
  const w = 1024;
  const h = 500;
  const cv = canvas(w, h);
  cv.fillRect(0, 0, w, h, INK);
  // Quiet paper band behind the mark.
  cv.fillRect(0, Math.round(h * 0.62), w, Math.round(h * 0.38), PAPER);
  const markSize = 220;
  const mark = icon(markSize);
  const mx = Math.round((w - markSize) / 2);
  const my = Math.round(h * 0.5 - markSize / 2);
  for (let y = 0; y < markSize; y++) {
    for (let x = 0; x < markSize; x++) {
      const si = (y * markSize + x) * 4;
      const alpha = mark.data[si + 3] / 255;
      if (alpha < 0.02) continue;
      const di = ((my + y) * w + (mx + x)) * 4;
      const inv = 1 - alpha;
      cv.data[di] = Math.round(mark.data[si] * alpha + cv.data[di] * inv);
      cv.data[di + 1] = Math.round(mark.data[si + 1] * alpha + cv.data[di + 1] * inv);
      cv.data[di + 2] = Math.round(mark.data[si + 2] * alpha + cv.data[di + 2] * inv);
      cv.data[di + 3] = 255;
    }
  }
  return cv;
}

const writes = [];

// --- Android launcher mipmaps ------------------------------------------------
const ANDROID_DENSITIES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};
for (const [dir, size] of Object.entries(ANDROID_DENSITIES)) {
  const dirPath = path.join(root, "android-store-assets", dir);
  mkdirSync(dirPath, { recursive: true });
  writes.push([path.join(dirPath, "ic_launcher.png"), icon(size)]);
  const round = canvas(size, size);
  // Launcher round: transparent outside a circle.
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      if (Math.sqrt(dx * dx + dy * dy) <= r - 0.5) {
        round.fillRect(x, y, 1, 1, INK);
      }
    }
  }
  drawGlyph(round, 0.16);
  writes.push([path.join(dirPath, "ic_launcher_round.png"), round]);
}

// --- Play Store listing -------------------------------------------------------
const storeDir = path.join(root, "store", "android");
mkdirSync(storeDir, { recursive: true });
writes.push([path.join(storeDir, "feature-graphic.png"), featureGraphic()]);
writes.push([path.join(storeDir, "high-res-icon-512.png"), icon(512)]);

// --- iOS App Icon (single 1024 asset, Xcode scales) ---------------------------
const iosIconDir = path.join(
  root,
  "store",
  "ios",
  "AppIcon.appiconset",
);
mkdirSync(iosIconDir, { recursive: true });
writes.push([path.join(iosIconDir, "AppIcon-1024.png"), icon(1024)]);
writes.push([
  path.join(iosIconDir, "Contents.json"),
  Buffer.from(
    JSON.stringify(
      {
        images: [
          {
            filename: "AppIcon-1024.png",
            idiom: "universal",
            platform: "ios",
            size: "1024x1024",
          },
        ],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    ) + "\n",
  ),
]);

// --- Splash base (Capacitor scales per device) --------------------------------
const splashW = 480;
const splashH = 769;
const splash = canvas(splashW, splashH);
splash.fillRect(0, 0, splashW, splashH, PAPER);
drawGlyph(splash, 0.3);
mkdirSync(path.join(root, "store", "android"), { recursive: true });
writes.push([path.join(storeDir, "splash.png"), splash]);

for (const [file, data] of writes) {
  if (Buffer.isBuffer(data)) {
    writeFileSync(file, data);
  } else {
    writeFileSync(file, data.data);
  }
  console.log(`✓ ${path.relative(root, file)}`);
}

console.log(`\nWrote ${writes.length} store assets.`);
console.log(
  "Copy launcher mipmaps into android/app/src/main/res/ after `npx cap add android`.",
);
