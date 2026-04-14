// ─────────────────────────────────────────────────────────────────
// generate-og.mjs — builds public/og-image.png
//
// Uses satori (JSX → SVG) + @resvg/resvg-js (SVG → PNG) to render
// the B2 variant of the Open Graph image without needing a headless
// browser. Chosen over puppeteer because the sandbox has no chromium
// and satori's entire stack weighs ~20 MB vs puppeteer's ~200 MB.
//
// Font stack:
//   • Switzer Bold / Extrabold (OTF) — the live site's brand font.
//     Shipped as local files in scripts/ because Fontshare's CDN is
//     blocked from the sandbox. Download refresh: grab new TTF/OTF
//     from https://www.fontshare.com/fonts/switzer and drop into
//     scripts/.
//   • DM Mono (via @fontsource/dm-mono) — matches the live site's
//     monospace used for data and captions.
//
// Run with: node scripts/generate-og.mjs
// ─────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ── Load fonts as ArrayBuffers ──────────────────────────────────
function loadLocal(relPath) {
  return fs.readFileSync(path.join(root, relPath));
}
function loadModule(relPath) {
  return fs.readFileSync(path.join(root, "node_modules", relPath));
}

// Switzer OTF files live under scripts/ (committed to the repo).
const switzerBold      = loadLocal("scripts/Switzer-Bold.otf");
const switzerExtrabold = loadLocal("scripts/Switzer-Extrabold.otf");
// DM Mono from @fontsource (WOFF; satori accepts WOFF too).
const dmMonoReg        = loadModule("@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff");

// ── Colour palette (matches src/theme/tokens.js DARK) ───────────
const C = {
  bg:     "#1A1B18",
  cream:  "#F0EDDF",
  dim:    "#B0AD9F",
  faint:  "#706E64",
  ghost:  "#3A3B36",
  border: "#2E2F2A",
  green:  "#27AE60",
};

// ── B2 design as JSX ────────────────────────────────────────────
const design = {
  type: "div",
  props: {
    style: {
      width: "1200px",
      height: "630px",
      backgroundColor: C.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: "Switzer",
    },
    children: [
      // ── Header strip ────────────────────────────────────────
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            alignItems: "stretch",
            borderBottom: `1px solid ${C.border}`,
            height: "130px",
          },
          children: [
            // Brand cell
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  padding: "0 64px",
                  borderRight: `1px solid ${C.border}`,
                },
                children: {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "56px",
                      fontWeight: 800,
                      color: C.cream,
                      letterSpacing: "-0.03em",
                    },
                    children: "CommonSense",
                  },
                },
              },
            },
            // Right side — Live + FREE
            {
              type: "div",
              props: {
                style: {
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 64px",
                },
                children: [
                  // Live indicator — kept short so it can't collide
                  // with FREE on the right. The "updates every 60s"
                  // fact lives in the footer where there's room.
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        fontSize: "26px",
                        fontWeight: 700,
                        color: C.dim,
                        letterSpacing: "0.12em",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              backgroundColor: C.green,
                              boxShadow: `0 0 22px ${C.green}`,
                            },
                          },
                        },
                        "LIVE",
                      ],
                    },
                  },
                  // FREE
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "92px",
                        fontWeight: 800,
                        color: C.green,
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      },
                      children: "FREE",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      // ── Content area ────────────────────────────────────────
      {
        type: "div",
        props: {
          style: {
            flex: 1,
            padding: "60px 64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
          children: [
            // Question
            {
              type: "div",
              props: {
                style: {
                  fontSize: "134px",
                  fontWeight: 800,
                  lineHeight: 0.95,
                  letterSpacing: "-0.045em",
                  color: C.cream,
                  display: "flex",
                  flexDirection: "column",
                },
                children: [
                  { type: "div", props: { children: "Should I buy" } },
                  { type: "div", props: { children: "Bitcoin today?" } },
                ],
              },
            },
            // Footer
            {
              type: "div",
              props: {
                style: {
                  fontFamily: "DM Mono",
                  fontSize: "15px",
                  color: C.faint,
                  letterSpacing: "0.03em",
                },
                children: "real-time · updates every 60s · backtested daily since 2017 · shouldibuybitcointoday.com",
              },
            },
          ],
        },
      },
    ],
  },
};

// ── Render ──────────────────────────────────────────────────────
console.log("→ Running satori…");
const svg = await satori(design, {
  width: 1200,
  height: 630,
  fonts: [
    { name: "Switzer", data: switzerBold,      weight: 700, style: "normal" },
    { name: "Switzer", data: switzerExtrabold, weight: 800, style: "normal" },
    { name: "DM Mono", data: dmMonoReg,        weight: 500, style: "normal" },
  ],
});

console.log("→ Rasterising SVG to PNG with resvg…");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: C.bg,
});
const png = resvg.render().asPng();

const outPath = path.join(root, "public", "og-image.png");
fs.writeFileSync(outPath, png);
console.log(`✓ Wrote ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
