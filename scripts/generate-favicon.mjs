// ─────────────────────────────────────────────────────────────────
// generate-favicon.mjs — builds the final favicon set
//
// Renders the "Variant C" favicon design (big ₿ centered, small ?
// green badge top-right, dark rounded-square background) into every
// format a modern website needs:
//
//   public/favicon.ico              → 16 + 32 + 48 multi-size ICO for
//                                     legacy browsers and bookmarks
//   public/favicon-16.png           → 16×16 PNG fallback
//   public/favicon-32.png           → 32×32 PNG fallback
//   public/favicon-48.png           → 48×48 PNG fallback
//   public/apple-touch-icon.png     → 180×180 PNG for iOS home screen
//   public/android-chrome-192.png   → 192×192 PWA icon
//   public/android-chrome-512.png   → 512×512 PWA icon
//
// No favicon.svg is produced — the design depends on the Noto Sans
// ₿ glyph, which most browsers don't ship, so a static SVG wouldn't
// render portably without embedding the entire font (~50 KB). The
// PNG + ICO set covers every real-world browser.
//
// Run: node scripts/generate-favicon.mjs
// ─────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

// Theme colours (matches src/theme/tokens.js DARK)
const C = {
  bg:    "#1A1B18",
  cream: "#F0EDDF",
  green: "#27AE60",
};

// Variant C: big ₿ center, green ? badge top-right.
// The {SIZE} token is replaced with the target pixel size at
// rasterisation time — resvg honours explicit width/height but
// its `fitTo: width` option doesn't downscale the rendered raster
// reliably when the SVG has no explicit size, so we bake the size
// into the SVG string itself.
const svgTemplate = `
<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="64" y="102" font-family="Noto" font-weight="800" font-size="116" text-anchor="middle" fill="${C.cream}">₿</text>
  <circle cx="102" cy="28" r="22" fill="${C.green}"/>
  <text x="102" y="39" font-family="Noto" font-weight="800" font-size="30" text-anchor="middle" fill="${C.bg}">?</text>
</svg>
`;

// Load Noto Sans 800 latin-ext (the subset that includes U+20BF)
const notoExtraBold = fs.readFileSync(
  path.join(root, "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-800-normal.woff")
);

function rasterise(size) {
  const sizedSvg = svgTemplate.replaceAll("{SIZE}", String(size));
  const resvg = new Resvg(sizedSvg, {
    font: {
      fontBuffers: [notoExtraBold],
      defaultFontFamily: "Noto Sans",
      loadSystemFonts: false,
    },
    background: "transparent",
  });
  return resvg.render().asPng();
}

// ── Render each target size ─────────────────────────────────────
const targets = [
  { size: 16,  name: "favicon-16.png" },
  { size: 32,  name: "favicon-32.png" },
  { size: 48,  name: "favicon-48.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "android-chrome-192.png" },
  { size: 512, name: "android-chrome-512.png" },
];

const pngs = {};
for (const { size, name } of targets) {
  const buf = rasterise(size);
  pngs[size] = buf;
  fs.writeFileSync(path.join(publicDir, name), buf);
  console.log(`✓ public/${name}  (${size}×${size}, ${(buf.length / 1024).toFixed(1)} KB)`);
}

// ── Build multi-size favicon.ico from 16 + 32 + 48 ──────────────
const ico = await pngToIco([pngs[16], pngs[32], pngs[48]]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), ico);
console.log(`✓ public/favicon.ico  (16+32+48, ${(ico.length / 1024).toFixed(1)} KB)`);
