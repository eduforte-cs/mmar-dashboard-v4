// ─────────────────────────────────────────────────────────────────
// generate-favicon-previews.mjs
//
// Renders 4 favicon design variants to PNG at 256×256 so the user
// can compare them visually before picking one. Switzer doesn't
// include the ₿ (U+20BF) glyph, so we fake it with a capital "B"
// plus two extended vertical stems drawn as SVG rects — matching
// how the real ₿ character looks in most fonts.
//
// Run: node scripts/generate-favicon-previews.mjs
// Output: public/favicon-previews/{a,b,c,d}.png
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

// ── Four variants as SVG strings, viewBox 128 × 128 ─────────────
// Bitcoin B is approximated as letter "B" + two vertical stems
// drawn as small rounded rectangles above and below the left side
// of the B. Position tuned for Switzer Extrabold.

// Variant A — "B?" side by side
const variantA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <g font-family="Switzer" font-weight="800" fill="${C.cream}">
    <text x="38" y="92" font-size="84" text-anchor="middle">B</text>
    <rect x="18" y="24" width="7" height="16" rx="2"/>
    <rect x="18" y="92" width="7" height="16" rx="2"/>
    <text x="88" y="92" font-size="84" text-anchor="middle">?</text>
  </g>
</svg>
`;

// Variant B — Stacked: ₿ top, ? bottom
const variantB = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <g font-family="Switzer" font-weight="800" fill="${C.cream}">
    <text x="64" y="56" font-size="58" text-anchor="middle">B</text>
    <rect x="44" y="16" width="6" height="12" rx="2"/>
    <rect x="44" y="50" width="6" height="12" rx="2"/>
    <text x="64" y="112" font-size="58" text-anchor="middle">?</text>
  </g>
</svg>
`;

// Variant C — Big ₿ centered, small ? green badge top-right
const variantC = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <g font-family="Switzer" font-weight="800" fill="${C.cream}">
    <text x="60" y="98" font-size="108" text-anchor="middle">B</text>
    <rect x="33" y="16" width="9" height="20" rx="2"/>
    <rect x="33" y="96" width="9" height="20" rx="2"/>
  </g>
  <circle cx="100" cy="28" r="20" fill="${C.green}"/>
  <text x="100" y="37" font-family="Switzer" font-weight="800" font-size="26" text-anchor="middle" fill="${C.bg}">?</text>
</svg>
`;

// Variant D — Big ? centered, small ₿ green badge top-right
const variantD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.bg}"/>
  <text x="64" y="100" font-family="Switzer" font-weight="800" font-size="110" text-anchor="middle" fill="${C.cream}">?</text>
  <circle cx="100" cy="28" r="20" fill="${C.green}"/>
  <g font-family="Switzer" font-weight="800" fill="${C.bg}">
    <text x="100" y="38" font-size="28" text-anchor="middle">B</text>
    <rect x="93" y="13" width="3" height="5" rx="1"/>
    <rect x="93" y="38" width="3" height="5" rx="1"/>
  </g>
</svg>
`;

// Variant E — Green background, cream glyphs, B? side by side
const variantE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="28" fill="${C.green}"/>
  <g font-family="Switzer" font-weight="800" fill="${C.bg}">
    <text x="38" y="92" font-size="84" text-anchor="middle">B</text>
    <rect x="18" y="24" width="7" height="16" rx="2"/>
    <rect x="18" y="92" width="7" height="16" rx="2"/>
    <text x="88" y="92" font-size="84" text-anchor="middle">?</text>
  </g>
</svg>
`;

// Load Switzer so resvg can render the "B" and "?" text
const switzerExtrabold = fs.readFileSync(path.join(root, "scripts/Switzer-Extrabold.otf"));

function render(name, svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    font: {
      fontBuffers: [switzerExtrabold],
      defaultFontFamily: "Switzer",
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
