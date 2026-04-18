// ─────────────────────────────────────────────────────────────────
// generate-instagram-carousel.mjs — 6-slide IG carousel (Market pillar)
//
// Renders public/instagram/market-pillar/slide-{1..6}.png at
// 1080×1350 (Instagram 4:5 portrait). Same satori + resvg stack as
// generate-og.mjs so we don't need a headless browser.
//
// Live BTC data:
//   • spot price  — Binance ticker/price (Kraken fallback)
//   • 24h change  — Binance ticker/24hr
//   • 30d context — Binance klines (daily, interval=1d)
// Computes ann. vol and "position vs 30d mean" for the Market-regime
// narrative without running the full MMAR engine.
//
// Run: node scripts/generate-instagram-carousel.mjs
// ─────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Bundled history is used only when the live fetch fails (e.g.
// sandboxed CI without outbound crypto APIs). When this is hit, the
// slides are rendered with a "last close" label instead of "live".
const btcHistory = JSON.parse(fs.readFileSync(path.join(root, "src/data/btc-history.json"), "utf8"));

// ── Fonts ───────────────────────────────────────────────────────
const switzerBold      = fs.readFileSync(path.join(root, "scripts/Switzer-Bold.otf"));
const switzerExtrabold = fs.readFileSync(path.join(root, "scripts/Switzer-Extrabold.otf"));
const dmMonoReg        = fs.readFileSync(path.join(root, "node_modules/@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff"));

// ── Palette (matches src/theme/tokens.js DARK) ──────────────────
const C = {
  bg:     "#1A1B18",
  cream:  "#F0EDDF",
  dim:    "#B0AD9F",
  faint:  "#706E64",
  ghost:  "#3A3B36",
  border: "#2E2F2A",
  green:  "#27AE60",
  greenDark: "#1B8A4A",
  amber:  "#E8A838",
  orange: "#F2994A",
  red:    "#EB5757",
};

const W = 1080;
const H = 1350;

// ── Live BTC data ───────────────────────────────────────────────
async function fetchSpot() {
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = await r.json();
      const spot = parseFloat(j.price);
      if (spot > 1000) return { spot, source: "Binance" };
    }
  } catch (_) { /* fallthrough */ }
  try {
    const r = await fetch("https://api.kraken.com/0/public/Ticker?pair=XBTUSD", { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = await r.json();
      const spot = parseFloat(j.result?.XXBTZUSD?.c?.[0] || j.result?.XBTUSD?.c?.[0]);
      if (spot > 1000) return { spot, source: "Kraken" };
    }
  } catch (_) { /* both failed */ }
  return { spot: null, source: null };
}

async function fetch24h() {
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = await r.json();
      return {
        changePct: parseFloat(j.priceChangePercent),
        high: parseFloat(j.highPrice),
        low: parseFloat(j.lowPrice),
        volume: parseFloat(j.quoteVolume),
      };
    }
  } catch (_) { /* ignore */ }
  return null;
}

async function fetchKlines(days = 30) {
  try {
    const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${days}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const raw = await r.json();
      return raw.map(k => ({ date: new Date(k[0]).toISOString().slice(0, 10), close: parseFloat(k[4]) }));
    }
  } catch (_) { /* ignore */ }
  return [];
}

function computeContext(spot, k30) {
  if (!spot || k30.length < 10) return null;
  const closes = k30.map(k => k.close);
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  // Daily log returns → annualised realised vol
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const rMean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const rVar = rets.reduce((s, r) => s + (r - rMean) ** 2, 0) / (rets.length - 1);
  const dailyVol = Math.sqrt(rVar);
  const annVolPct = dailyVol * Math.sqrt(365) * 100;
  const posPct = ((spot - mean) / mean) * 100;
  const weekAgo = closes[Math.max(0, closes.length - 8)];
  const weekChangePct = ((spot - weekAgo) / weekAgo) * 100;
  const high = Math.max(...closes, spot);
  const low  = Math.min(...closes, spot);
  return {
    mean30: mean,
    posPct,
    annVolPct,
    weekChangePct,
    high30: high,
    low30: low,
  };
}

// Derive a playful "position zone" label from pos vs 30d mean.
// (Not a replacement for the real σ-based zone — just a carousel-
// friendly hint that tracks the same axis.)
function zoneFromPos(posPct) {
  if (posPct <= -10) return { id: "discount", label: "Discount",  color: C.green };
  if (posPct <= -3)  return { id: "cooling",  label: "Cooling",   color: C.greenDark };
  if (posPct <   3)  return { id: "fair",     label: "Fair value", color: C.amber };
  if (posPct <  10)  return { id: "warming",  label: "Warming",   color: C.orange };
  return { id: "elevated", label: "Elevated", color: C.red };
}

function momFromWeek(wkPct) {
  if (wkPct <= -2) return { id: "negative", label: "Falling" };
  if (wkPct >=  2) return { id: "positive", label: "Rising" };
  return { id: "flat", label: "Flat" };
}

const fmtUSD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtPct = (n, d = 2) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";

// ── Slide primitives ────────────────────────────────────────────
// Satori accepts JSX-like plain objects. Keeping a tiny `el` helper
// so slide definitions stay readable.
const el = (type, style, children) => ({ type, props: { style, children } });
// Satori requires an explicit `display` on every div with >1 child.
// Applying flex-column by default is safe for single-child divs too
// and lets us stop threading `display` through every layout call.
function div(style, children) {
  const finalStyle = style.display ? style : { display: "flex", flexDirection: "column", ...style };
  return el("div", finalStyle, children);
}
const txt = (style, children) => div(style, children);

function frame(children, { accent = C.green } = {}) {
  return div(
    {
      width: `${W}px`,
      height: `${H}px`,
      backgroundColor: C.bg,
      display: "flex",
      flexDirection: "column",
      fontFamily: "Switzer",
      color: C.cream,
      position: "relative",
    },
    [
      // Top brand strip
      div(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "42px 56px 0 56px",
          fontFamily: "DM Mono",
          fontSize: "20px",
          color: C.dim,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        },
        [
          div({ display: "flex", alignItems: "center", gap: "14px" }, [
            div({ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: accent, boxShadow: `0 0 18px ${accent}` }),
            "MMAR · MARKET PILLAR",
          ]),
          div({}, "shouldibuybitcointoday.com"),
        ]
      ),
      // Body
      div({ flex: 1, display: "flex", flexDirection: "column", padding: "0 56px" }, children),
      // Footer pagination
      div(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 56px 38px 56px",
          fontFamily: "DM Mono",
          fontSize: "18px",
          color: C.faint,
          letterSpacing: "0.08em",
        },
        [
          div({}, "swipe >"),
          div({}, ""), // slide N / 6 is injected per slide
        ]
      ),
    ]
  );
}

// Build a slide by composing a frame with a per-slide child block and
// rewriting the footer's right-hand cell in-place with "N / 6".
function makeSlide(index, accent, body) {
  const f = frame(body, { accent });
  // Mutate footer "slide N / 6" text
  f.props.children[2].props.children[1] = div({}, `${index} / 6`);
  return f;
}

// ── Slide definitions ───────────────────────────────────────────
function slide1() {
  return makeSlide(1, C.green, [
    div({ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }, [
      txt(
        {
          fontSize: "34px",
          fontWeight: 500,
          color: C.dim,
          letterSpacing: "0.02em",
          marginBottom: "28px",
          fontFamily: "Switzer",
        },
        "The MMAR engine"
      ),
      txt(
        {
          fontSize: "150px",
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: "-0.045em",
          color: C.cream,
          display: "flex",
          flexDirection: "column",
        },
        [
          txt({}, "Where"),
          txt({}, "the market"),
          txt({ color: C.green }, "actually is."),
        ]
      ),
      txt(
        {
          marginTop: "42px",
          fontSize: "26px",
          color: C.dim,
          lineHeight: 1.5,
          maxWidth: "820px",
          fontFamily: "Switzer",
        },
        "The Market pillar fuses a Power-Law position and a fractal-momentum read into one regime call — then backtests it against every BTC cycle since 2013."
      ),
    ]),
  ]);
}

function slide2(live) {
  const hasData = live && live.spot;
  const isLive = hasData && live.isLive;
  const changeColor = hasData && live.change24h >= 0 ? C.green : C.red;
  const weekColor  = hasData && live.ctx && live.ctx.weekChangePct >= 0 ? C.green : C.red;
  const dotColor = isLive ? C.green : C.amber;
  const badge = isLive ? "LIVE · BTC/USD" : "LAST CLOSE · BTC/USD";
  return makeSlide(2, dotColor, [
    div({ display: "flex", alignItems: "center", gap: "14px", marginTop: "18px" }, [
      div({ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: dotColor, boxShadow: `0 0 14px ${dotColor}` }),
      txt({ fontFamily: "DM Mono", fontSize: "18px", color: C.dim, letterSpacing: "0.14em", textTransform: "uppercase" }, badge),
    ]),
    txt(
      { fontSize: "40px", fontWeight: 700, color: C.cream, marginTop: "36px", letterSpacing: "-0.02em" },
      "Right now, the market reads:"
    ),
    div(
      { marginTop: "28px", display: "flex", flexDirection: "column" },
      [
        txt(
          {
            fontFamily: "DM Mono",
            fontSize: "138px",
            fontWeight: 500,
            color: C.cream,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          },
          hasData ? fmtUSD(live.spot) : "—"
        ),
        hasData
          ? txt(
              { fontFamily: "DM Mono", fontSize: "28px", color: changeColor, marginTop: "14px", letterSpacing: "0.02em" },
              `${fmtPct(live.change24h)} · 24h`
            )
          : txt({ fontSize: "22px", color: C.faint, marginTop: "12px" }, "(live feed unavailable — run online)"),
      ]
    ),
    // Stat grid
    div(
      {
        marginTop: "52px",
        display: "flex",
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      },
      [
        statCell("7-day", hasData && live.ctx ? fmtPct(live.ctx.weekChangePct, 1) : "—", hasData ? weekColor : C.dim, true),
        statCell("30d high", hasData && live.ctx ? fmtUSD(live.ctx.high30) : "—", C.cream, true),
        statCell("30d low",  hasData && live.ctx ? fmtUSD(live.ctx.low30)  : "—", C.cream, false),
      ]
    ),
    div({ flex: 1 }),
    txt(
      { fontFamily: "DM Mono", fontSize: "18px", color: C.faint, marginBottom: "30px", letterSpacing: "0.02em" },
      hasData ? `source: ${live.source} · fetched ${live.fetchedAt}` : "—"
    ),
  ]);
}

function statCell(label, value, color, withBorder) {
  return div(
    {
      flex: 1,
      padding: "26px 0",
      borderRight: withBorder ? `1px solid ${C.border}` : "none",
      paddingRight: withBorder ? "24px" : 0,
      paddingLeft: label === "7-day" ? 0 : "24px",
      display: "flex",
      flexDirection: "column",
    },
    [
      txt(
        { fontFamily: "DM Mono", fontSize: "16px", color: C.faint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "10px" },
        label
      ),
      txt(
        { fontFamily: "DM Mono", fontSize: "34px", color, fontWeight: 500, letterSpacing: "-0.01em" },
        value
      ),
    ]
  );
}

function slide3() {
  return makeSlide(3, C.amber, [
    div({ marginTop: "22px" }, [
      txt(
        { fontFamily: "DM Mono", fontSize: "18px", color: C.faint, letterSpacing: "0.14em", textTransform: "uppercase" },
        "HOW THE MARKET PILLAR READS THE MARKET"
      ),
    ]),
    txt(
      { fontSize: "96px", fontWeight: 800, color: C.cream, letterSpacing: "-0.04em", lineHeight: 0.95, marginTop: "32px" },
      "Two axes. Fifteen states."
    ),
    div({ marginTop: "48px", display: "flex", flexDirection: "column", gap: "26px" }, [
      axisRow("Position", "How far price sits from its Power-Law trendline, in sigma.", C.cream),
      axisRow("Direction", "Momentum from residual-return autocorrelation — are returns persisting or reverting?", C.cream),
    ]),
    txt(
      { marginTop: "44px", fontSize: "24px", color: C.dim, lineHeight: 1.55, fontFamily: "Switzer", maxWidth: "900px" },
      "Cross them and you get a 5×3 matrix: Capitulation, Accumulation, Bull Run, Euphoria, and eleven states in between."
    ),
    div({ flex: 1 }),
  ]);
}

function axisRow(name, desc, color) {
  return div(
    {
      display: "flex",
      flexDirection: "column",
      padding: "22px 26px",
      border: `1px solid ${C.border}`,
      borderRadius: "10px",
      backgroundColor: "rgba(255,255,255,0.02)",
    },
    [
      txt(
        { fontFamily: "Switzer", fontSize: "34px", fontWeight: 700, color, letterSpacing: "-0.01em" },
        name
      ),
      txt(
        { fontFamily: "Switzer", fontSize: "22px", color: C.dim, marginTop: "8px", lineHeight: 1.45 },
        desc
      ),
    ]
  );
}

function slide4(live) {
  const hasData = !!(live && live.ctx);
  const zone = hasData ? zoneFromPos(live.ctx.posPct) : { label: "—", color: C.faint };
  const mom  = hasData ? momFromWeek(live.ctx.weekChangePct) : { label: "—" };

  // 5×3 matrix cells
  const sigs = ["overheated", "elevated", "fair", "discount", "deepValue"];
  const sigLabels = { overheated: "Overheated", elevated: "Elevated", fair: "Fair value", discount: "Discount", deepValue: "Deep value" };
  const moms = ["negative", "flat", "positive"];
  const momLabels = { negative: "Falling", flat: "Flat", positive: "Rising" };
  const matrix = {
    overheated: { negative: "Crash",       flat: "Plateau",     positive: "Euphoria" },
    elevated:   { negative: "Correcting",  flat: "Elevated",    positive: "Bull run" },
    fair:       { negative: "Cooling",     flat: "Ranging",     positive: "Warming" },
    discount:   { negative: "Bear",        flat: "Accumulation", positive: "Recovery" },
    deepValue:  { negative: "Capitulation", flat: "Deep value",  positive: "Early rec." },
  };
  const sigSignal = { overheated: "sell", elevated: "reduce", fair: "hold", discount: "buy", deepValue: "strongBuy" };
  const bgFor = (s) =>
    s === "strongBuy" || s === "buy" ? "rgba(39,174,96,0.08)" :
    s === "sell"   ? "rgba(235,87,87,0.08)" :
    s === "reduce" ? "rgba(242,153,74,0.06)" : "transparent";

  // Map current live position to the nearest σ-zone label so the
  // "active cell" highlight lines up with the pos-based zone id.
  const POS_TO_SIG = {
    discount: "discount", cooling: "fair", fair: "fair", warming: "elevated", elevated: "elevated",
  };
  const activeSig = hasData ? (POS_TO_SIG[zone.id] || "fair") : null;
  const activeMom = hasData ? mom.id : null;

  const rows = sigs.map((sz) =>
    div(
      {
        display: "flex",
        borderBottom: `1px solid ${C.border}`,
      },
      [
        div(
          {
            width: "220px",
            padding: "18px 16px",
            borderRight: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          },
          [
            txt({ fontFamily: "Switzer", fontSize: "20px", color: sz === activeSig ? C.cream : C.dim, fontWeight: sz === activeSig ? 700 : 500 }, sigLabels[sz]),
          ]
        ),
        ...moms.map((mz) => {
          const active = sz === activeSig && mz === activeMom;
          const baseBorder = `1px solid ${C.border}`;
          const activeBorder = `2px solid ${C.cream}`;
          return div(
            {
              flex: 1,
              padding: "18px 10px",
              textAlign: "center",
              backgroundColor: bgFor(sigSignal[sz]),
              borderTop: active ? activeBorder : "none",
              borderBottom: active ? activeBorder : "none",
              borderLeft: active ? activeBorder : "none",
              borderRight: active ? activeBorder : (mz !== "positive" ? baseBorder : "none"),
              borderRadius: active ? "6px" : 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
            [
              txt(
                {
                  fontFamily: "Switzer",
                  fontSize: active ? "22px" : "20px",
                  fontWeight: active ? 700 : 500,
                  color: active ? C.cream : C.dim,
                },
                matrix[sz][mz]
              ),
            ]
          );
        }),
      ]
    )
  );

  return makeSlide(4, zone.color, [
    div({ marginTop: "22px" }, [
      txt(
        { fontFamily: "DM Mono", fontSize: "18px", color: C.faint, letterSpacing: "0.14em", textTransform: "uppercase" },
        "Position × Direction · live"
      ),
    ]),
    txt(
      { fontSize: "74px", fontWeight: 800, color: C.cream, letterSpacing: "-0.04em", lineHeight: 0.95, marginTop: "26px" },
      "Today's regime read"
    ),
    // Callout
    div(
      { display: "flex", alignItems: "center", gap: "18px", marginTop: "24px", marginBottom: "28px" },
      [
        div(
          {
            padding: "6px 14px",
            border: `1px solid ${zone.color}`,
            borderRadius: "6px",
            fontFamily: "Switzer",
            fontSize: "22px",
            fontWeight: 700,
            color: zone.color,
            letterSpacing: "0.02em",
          },
          zone.label.toUpperCase()
        ),
        txt(
          { fontFamily: "Switzer", fontSize: "22px", color: C.dim },
          `momentum ${mom.label.toLowerCase()}`
        ),
      ]
    ),
    // Column headers
    div({ display: "flex", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, backgroundColor: "rgba(255,255,255,0.015)" }, [
      div({ width: "220px", padding: "12px 16px", borderRight: `1px solid ${C.border}` }, [
        txt({ fontFamily: "DM Mono", fontSize: "13px", color: C.faint, letterSpacing: "0.12em", textTransform: "uppercase" }, "Pos / Dir"),
      ]),
      ...moms.map((mz, i) => div(
        { flex: 1, padding: "12px 8px", textAlign: "center", borderRight: i < 2 ? `1px solid ${C.border}` : "none" },
        [
          txt({ fontFamily: "Switzer", fontSize: "18px", color: mz === activeMom ? C.cream : C.dim, fontWeight: mz === activeMom ? 700 : 500 }, momLabels[mz]),
        ]
      )),
    ]),
    ...rows,
    txt(
      {
        marginTop: "24px",
        fontFamily: "DM Mono",
        fontSize: "16px",
        color: C.faint,
        letterSpacing: "0.02em",
        lineHeight: 1.5,
      },
      hasData
        ? `pos vs 30d mean: ${fmtPct(live.ctx.posPct, 1)} · 7d: ${fmtPct(live.ctx.weekChangePct, 1)}`
        : "(live feed unavailable — run online)"
    ),
    div({ flex: 1 }),
  ]);
}

function slide5(live) {
  const hasData = !!(live && live.ctx);
  const annVol = hasData ? live.ctx.annVolPct : null;
  const volLabel = annVol == null ? "—" : annVol > 80 ? "High" : annVol > 40 ? "Normal" : "Low";
  const volColor = annVol == null ? C.dim : annVol > 80 ? C.orange : annVol > 40 ? C.green : C.green;
  return makeSlide(5, C.orange, [
    div({ marginTop: "22px" }, [
      txt(
        { fontFamily: "DM Mono", fontSize: "18px", color: C.faint, letterSpacing: "0.14em", textTransform: "uppercase" },
        "Supporting diagnostics"
      ),
    ]),
    txt(
      { fontSize: "92px", fontWeight: 800, color: C.cream, letterSpacing: "-0.04em", lineHeight: 0.95, marginTop: "28px" },
      "Calm or volatile?"
    ),
    txt(
      { marginTop: "22px", fontSize: "24px", color: C.dim, lineHeight: 1.5, maxWidth: "900px" },
      "A two-state Ornstein-Uhlenbeck process labels each day. The regime you're in controls how fast price is expected to mean-revert."
    ),
    // Two-column diagnostics
    div(
      {
        marginTop: "46px",
        display: "flex",
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      },
      [
        diagCell("Ann. vol (30d)", annVol == null ? "—" : `${annVol.toFixed(0)}%`, volLabel, volColor, true),
        diagCell("Half-life", "~42d", "speed of pull back", C.cream, false),
      ]
    ),
    div(
      {
        marginTop: "18px",
        display: "flex",
        borderBottom: `1px solid ${C.border}`,
      },
      [
        diagCell("Calm regime", "kappa ~ 0.018", "slow drift", C.green, true),
        diagCell("Volatile regime", "kappa ~ 0.006", "lingers longer", C.orange, false),
      ]
    ),
    div({ flex: 1 }),
    txt(
      {
        fontFamily: "DM Mono",
        fontSize: "16px",
        color: C.faint,
        letterSpacing: "0.02em",
        lineHeight: 1.5,
        marginBottom: "28px",
      },
      "Diagnostics inform the narrative — they don't decide the regime."
    ),
  ]);
}

function diagCell(label, value, sub, color, withBorder) {
  return div(
    {
      flex: 1,
      padding: "24px 0",
      borderRight: withBorder ? `1px solid ${C.border}` : "none",
      paddingRight: withBorder ? "28px" : 0,
      paddingLeft: withBorder ? 0 : "28px",
      display: "flex",
      flexDirection: "column",
    },
    [
      txt(
        { fontFamily: "DM Mono", fontSize: "15px", color: C.faint, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "12px" },
        label
      ),
      txt(
        { fontFamily: "DM Mono", fontSize: "44px", color, fontWeight: 500, letterSpacing: "-0.01em" },
        value
      ),
      txt(
        { fontFamily: "Switzer", fontSize: "20px", color: C.dim, marginTop: "8px" },
        sub
      ),
    ]
  );
}

function slide6() {
  return makeSlide(6, C.green, [
    div({ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }, [
      txt(
        { fontFamily: "DM Mono", fontSize: "20px", color: C.faint, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "28px" },
        "The whole engine · free"
      ),
      txt(
        {
          fontSize: "136px",
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: "-0.045em",
          color: C.cream,
          display: "flex",
          flexDirection: "column",
        },
        [
          txt({}, "See your"),
          txt({ color: C.green }, "regime live."),
        ]
      ),
      txt(
        { marginTop: "42px", fontSize: "28px", color: C.dim, lineHeight: 1.5, maxWidth: "900px" },
        "The 5×3 matrix, Power-Law position, Hurst momentum, OU regime and Monte-Carlo paths — updated every 60 seconds."
      ),
      div(
        {
          marginTop: "58px",
          padding: "22px 30px",
          border: `2px solid ${C.green}`,
          borderRadius: "10px",
          alignSelf: "flex-start",
          fontFamily: "Switzer",
          fontSize: "32px",
          fontWeight: 800,
          color: C.green,
          letterSpacing: "-0.01em",
        },
        "shouldibuybitcointoday.com"
      ),
      txt(
        { marginTop: "36px", fontFamily: "DM Mono", fontSize: "18px", color: C.faint, letterSpacing: "0.08em" },
        "backtested daily since 2013 · zero paywall"
      ),
    ]),
  ]);
}

// ── Render ──────────────────────────────────────────────────────
async function renderSlide(design, outPath) {
  const svg = await satori(design, {
    width: W,
    height: H,
    fonts: [
      { name: "Switzer", data: switzerBold,      weight: 700, style: "normal" },
      { name: "Switzer", data: switzerExtrabold, weight: 800, style: "normal" },
      { name: "DM Mono", data: dmMonoReg,        weight: 500, style: "normal" },
    ],
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: W }, background: C.bg }).render().asPng();
  fs.writeFileSync(outPath, png);
  return png.length;
}

function fallbackFromHistory() {
  const all = [...(btcHistory.early || []), ...(btcHistory.history || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(d => d.price > 0);
  if (all.length < 31) return null;
  const tail = all.slice(-31);
  const k30 = tail.slice(-30).map(d => ({ date: d.date, close: d.price }));
  const spot = tail[tail.length - 1].price;
  const prev = tail[tail.length - 2]?.price ?? spot;
  return {
    spot,
    source: "bundled history",
    change24h: ((spot - prev) / prev) * 100,
    k30,
    asOf: tail[tail.length - 1].date,
    isLive: false,
  };
}

async function main() {
  console.log("→ Fetching live BTC data…");
  const [{ spot, source }, t24, k30] = await Promise.all([fetchSpot(), fetch24h(), fetchKlines(30)]);

  let live;
  if (spot) {
    live = {
      spot,
      source: source || "—",
      change24h: t24 ? t24.changePct : 0,
      ctx: computeContext(spot, k30),
      fetchedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
      isLive: true,
    };
  } else {
    const fb = fallbackFromHistory();
    if (fb) {
      live = {
        spot: fb.spot,
        source: fb.source,
        change24h: fb.change24h,
        ctx: computeContext(fb.spot, fb.k30),
        fetchedAt: `close ${fb.asOf}`,
        isLive: false,
      };
      console.log("  (live fetch blocked — using bundled history as fallback)");
    }
  }

  if (live) {
    console.log(`  spot:         ${fmtUSD(live.spot)}  (${live.source})`);
    console.log(`  24h change:   ${fmtPct(live.change24h)}`);
    if (live.ctx) {
      console.log(`  pos vs 30d:   ${fmtPct(live.ctx.posPct, 1)}`);
      console.log(`  7d change:    ${fmtPct(live.ctx.weekChangePct, 1)}`);
      console.log(`  ann. vol:     ${live.ctx.annVolPct.toFixed(1)}%`);
    }
  } else {
    console.log("  (no price data available)");
  }

  const outDir = path.join(root, "public", "instagram", "market-pillar");
  fs.mkdirSync(outDir, { recursive: true });

  const slides = [slide1(), slide2(live), slide3(), slide4(live), slide5(live), slide6()];
  for (let i = 0; i < slides.length; i++) {
    const out = path.join(outDir, `slide-${i + 1}.png`);
    const bytes = await renderSlide(slides[i], out);
    console.log(`✓ ${out} (${(bytes / 1024).toFixed(1)} KB)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
