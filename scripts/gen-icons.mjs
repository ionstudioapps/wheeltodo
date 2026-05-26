#!/usr/bin/env node
// Generates PNG icons from apps/web/public/icon.svg
// Run from repo root: node scripts/gen-icons.mjs

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "../apps/web/node_modules/sharp/lib/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dir, "../apps/web/public");
const svgPath = resolve(publicDir, "icon.svg");
const svg = readFileSync(svgPath);

const sizes = [
  { name: "icon-192.png",       size: 192 },
  { name: "icon-512.png",       size: 512 },
  { name: "apple-touch-icon.png", size: 180 }, // iOS home screen
];

for (const { name, size } of sizes) {
  const out = resolve(publicDir, name);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("\nDone. Add to manifest.ts icons array:");
console.log('  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },');
console.log('  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },');
