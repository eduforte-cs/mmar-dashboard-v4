// ── Constants & helpers — zero external deps ──

export const GENESIS = new Date("2009-01-03").getTime();
export const MS_DAY = 86400000;

export function daysSinceGenesis(dateStr) {
  return (new Date(dateStr).getTime() - GENESIS) / MS_DAY;
}

export function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Formatters ──
export const fmt = (n, d = 2) => (n != null && isFinite(n)) ? n.toFixed(d) : "–";
export const fmtK = v => v != null && isFinite(v) ? (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`) : "–";
export const fmtPct = v => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;
export const fmtY = v => { const val = Math.pow(10, v); if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`; if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}k`; return `$${val.toFixed(0)}`; };

// ── Plain language helpers ──
export function getVerdictPlain(sig) {
  if (sig > 1.8) return { emoji: "🔴", label: "Overheated", desc: "Bitcoin is trading well above its long-term trend. Historically, these levels precede corrections.", color: "#EB5757" };
  if (sig > 1.0) return { emoji: "🟡", label: "Above trend", desc: "Price is above fair value and entering the overheated zone. Consider taking some profits.", color: "#E8A838" };
  if (sig > -0.5) return { emoji: "🟢", label: "Fair value", desc: "Bitcoin is trading near its structural equilibrium. A neutral position is reasonable.", color: "#27AE60" };
  if (sig > -1.0) return { emoji: "🔵", label: "Undervalued", desc: "Price is below the long-term trend. Approaching the structural support zone.", color: "#2F80ED" };
  return { emoji: "💎", label: "Deep value", desc: "Bitcoin is at or below its RANSAC support — the level that has held in every cycle since 2013. Historically the strongest buy signal.", color: "#6FCF97" };
}

export function getVolLabel(annVol) {
  if (annVol < 0.45) return { label: "Low", color: "#27AE60", desc: "Calm market" };
  if (annVol < 0.80) return { label: "Normal", color: "#828282", desc: "Typical conditions" };
  if (annVol < 1.20) return { label: "High", color: "#E8A838", desc: "Elevated volatility" };
  return { label: "Extreme", color: "#EB5757", desc: "Storm conditions" };
}
