// ── Formatting helpers ──
const GENESIS = new Date("2009-01-03").getTime();
const MS_DAY = 86400000;

export function fmtPrice(n, lang) {
  const rounded = Math.round(n);
  return lang === "es"
    ? rounded.toLocaleString("es-ES") + " USD"
    : "$" + rounded.toLocaleString("en-US");
}

export function fmtPct(n) {
  return Math.abs(Math.round(n)) + "%";
}

export function fmtVol(v) {
  return Math.round(v * 100) + "%";
}

// Convert days-since-genesis to "early/mid/late YYYY"
function daysToDate(t) {
  return new Date(GENESIS + t * MS_DAY);
}

export function fmtDateFromDays(t, lang) {
  const d = daysToDate(t);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (lang === "es") {
    const p = m <= 4 ? "principios de" : m <= 8 ? "mediados de" : "finales de";
    return `${p} ${y}`;
  }
  const p = m <= 4 ? "early" : m <= 8 ? "mid-" : "late";
  return `${p}${p === "mid-" ? "" : " "}${y}`;
}

// ── Signal classification ──
export function classifySignal(sigma) {
  if (sigma < -1.0) return { level: "strongBuy", answer: "yes", confidence: "high" };
  if (sigma < -0.5) return { level: "buy", answer: "yes", confidence: "high" };
  if (sigma < 0.3)  return { level: "hold", answer: "hold", confidence: "moderate" };
  if (sigma < 0.5)  return { level: "caution", answer: "hold", confidence: "low" };
  if (sigma < 0.8)  return { level: "reduce", answer: "no", confidence: "moderate" };
  return { level: "sell", answer: "no", confidence: "high" };
}

// ── Power Law date projections ──
// When does the fair value curve cross a target price?
// plPrice = exp(a + b * ln(t))  →  t = exp((ln(target) - a) / b)
// floorPrice = exp(ra + rb * ln(t) + rf)  →  t = exp((ln(target) - ra - rf) / rb)
export function dateWhenPriceReaches(target, a, b, ra, rb, rf) {
  const tFV = Math.exp((Math.log(target) - a) / b);
  const tFloor = rb ? Math.exp((Math.log(target) - ra - rf) / rb) : null;
  return { fairValueDays: tFV, floorDays: tFloor };
}

// Current support floor price
export function supportFloorPrice(ra, rb, rf, t0) {
  if (!ra || !rb) return null;
  return Math.exp(ra + rb * Math.log(t0) + rf);
}

// Deviation percentage from fair value
export function deviation(spot, fairValue) {
  return ((spot - fairValue) / fairValue) * 100;
}
