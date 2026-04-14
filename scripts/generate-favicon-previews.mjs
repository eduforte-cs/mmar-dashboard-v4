// ─────────────────────────────────────────────────────────────────
// generate-favicon-previews.mjs
//
// Renders 5 favicon design variants to PNG at 16/32/64/128/256 px
// so the user can compare them at real browser-tab sizes.
//
// Font strategy:
//   • Noto Sans 800 (latin-ext) — used for BOTH the ₿ (U+20BF) and
//     the ? glyphs. Switzer Extrabold doesn't ship the ₿ codepoint,
//     and the previous fake-₿ (letter B + two floating stems) read
//     as a broken B instead of a Bitcoin symbol. Using Noto Sans
//     with the real ₿ glyph is the clean fix.
//
// Run: node scripts/generate-favicon-previews.mjs
// Output: public/favicon-previews/{A..E}-{16,32,64,128,256}.png
// ─────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "favicon-previews");
fs.mkdirSync(outDir, { recursive: true });

// Theme colours
const C = {
  bg:    "#1A1B18",
  cream: "#F0EDDF",
  green: "#27AE60",
};

// ── SVG variants (viewBox 128 × 128) ────────────────────────────
// All text uses font-family="Noto" — the NotoSans-ExtraBold buffer
// loaded into resvg is registered under that name.

// A — ₿? side by side
const variantA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="38" y="96" font-family="Noto" font-weight="800" font-size="96" text-anchor="middle" fill="${C.cream}">₿</text>
  <text x="92" y="96" font-family="Noto" font-weight="800" font-size="96" text-anchor="middle" fill="${C.cream}">?</text>
</svg>
`;

// B — Stacked: ₿ top, ? bottom
const variantB = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="64" y="62" font-family="Noto" font-weight="800" font-size="68" text-anchor="middle" fill="${C.cream}">₿</text>
  <text x="64" y="118" font-family="Noto" font-weight="800" font-size="68" text-anchor="middle" fill="${C.cream}">?</text>
</svg>
`;

// C — Big ₿ centered, small ? green badge top-right
const variantC = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="64" y="102" font-family="Noto" font-weight="800" font-size="116" text-anchor="middle" fill="${C.cream}">₿</text>
  <circle cx="102" cy="28" r="22" fill="${C.green}"/>
  <text x="102" y="39" font-family="Noto" font-weight="800" font-size="30" text-anchor="middle" fill="${C.bg}">?</text>
</svg>
`;

// D — Big ? centered, small ₿ green badge top-right
const variantD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="64" y="102" font-family="Noto" font-weight="800" font-size="116" text-anchor="middle" fill="${C.cream}">?</text>
  <circle cx="102" cy="28" r="22" fill="${C.green}"/>
  <text x="102" y="39" font-family="Noto" font-weight="800" font-size="30" text-anchor="middle" fill="${C.bg}">₿</text>
</svg>
`;

// E — ₿? side by side, green bg
const variantE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.green}"/>
  <text x="38" y="96" font-family="Noto" font-weight="800" font-size="96" text-anchor="middle" fill="${C.bg}">₿</text>
  <text x="92" y="96" font-family="Noto" font-weight="800" font-size="96" text-anchor="middle" fill="${C.bg}">?</text>
</svg>
`;

// Load Noto Sans 800 latin-ext (the subset that contains U+20BF)
const notoExtraBold = fs.readFileSync(
  path.join(root, "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-800-normal.woff")
);

function render(name, svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: {
      fontBuffers: [notoExtraBold],
      defaultFontFamily: "Noto Sans",
      loadSystemFonts: false,
    },
    background: "transparent",
  });
  const png = resvg.render().asPng();
  const outPath = path.join(outDir, `${name}-${size}.png`);
  fs.writeFileSync(outPath, png);
  return outPath;
}

const variants = { A: variantA, B: variantB, C: variantC, D: variantD, E: variantE };
const sizes = [16, 32, 64, 128, 256];

for (const [name, svg] of Object.entries(variants)) {
  for (const size of sizes) {
    const p = render(name, svg, size);
    console.log(`✓ ${path.relative(root, p)}`);
  }
}
