import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import { fmtK } from "../../engine/constants.js";
import { plPrice } from "../../engine/powerlaw.js";
import { normInv } from "../../engine/stats.js";
import { keyLevels, allBands, supportFloor } from "../../engine/bands.js";

export function KeyLevels({ d }) {
  const { t } = useTheme();
  const { S0, a, b, t0, resMean, resStd, resFloor, ransac } = d;
  const levels = keyLevels(t0, S0, { a, b, resMean, resStd, resFloor, ransac });

  return (
    <>
      <p style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
        Structurally important price levels from the Power Law model. They act as gravitational anchors across market cycles.
      </p>
      {levels.map((lv, i) => {
        const pct = ((lv.price - S0) / S0 * 100);
        return (
          <div key={lv.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <div>
              <span style={{ fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream }}>{lv.label}</span>
              <span style={{ fontFamily: mn, fontSize: 10, color: t.faint, marginLeft: 8 }}>{lv.sigma}</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: t.cream }}>{fmtK(lv.price)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: pct >= 0 ? "#27AE60" : "#EB5757", width: 48, textAlign: "right" }}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function ForwardProjections({ d }) {
  const { t } = useTheme();
  const { S0, a, b, t0, resMean, resStd, resFloor, ransac } = d;

  const horizons = [
    { label: "1 month", days: 30 },
    { label: "3 months", days: 90 },
    { label: "6 months", days: 182 },
    { label: "1 year", days: 365 },
    { label: "3 years", days: 1095 },
  ].map(h => {
    const bParams = { a, b, resMean, resStd, resFloor, ransac };
    const bl = allBands(t0 + h.days, bParams);
    return {
      ...h, plF: bl.fair,
      support: bl.support,
      discount: bl.discount,
      ceiling: bl.ceiling,
      bubble: bl.bubble,
    };
  });

  const pct = (price) => {
    const p = ((price - S0) / S0 * 100);
    return `${p >= 0 ? "+" : ""}${p.toFixed(0)}%`;
  };

  return (
    <>
      <p style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
        Power Law fair value at each horizon with the full σ-band structure. All percentages relative to today's {fmtK(S0)}.
      </p>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${t.border}`, minWidth: 500 }}>
        {["Horizon", "Support", "Discount", "Fair Value", "Ceiling", "Bubble"].map(h => (
          <div key={h} style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h === "Horizon" ? "left" : "right" }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      {horizons.map(h => (
        <div key={h.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}`, minWidth: 500 }}>
          <div style={{ fontFamily: bd, fontSize: 12, fontWeight: 500, color: t.cream }}>{h.label}</div>
          {[h.support, h.discount, h.plF, h.ceiling, h.bubble].map((price, i) => (
            <div key={i} style={{ textAlign: "right" }}>
              <div style={{ fontFamily: mn, fontSize: 11, color: t.cream, fontWeight: i === 2 ? 600 : 400 }}>{fmtK(price)}</div>
              <div style={{ fontFamily: mn, fontSize: 9, color: t.faint }}>{pct(price)}</div>
            </div>
          ))}
        </div>
      ))}
      </div>
    </>
  );
}

export function RiskMatrix({ d }) {
  const { t } = useTheme();
  const { S0, a, b, t0, resMean, resStd, resFloor, percentiles } = d;

  const riskLevels = [5, 10, 25, 50, 75, 90, 95];
  const pl1y = plPrice(a, b, t0 + 365);

  const rows = riskLevels.map(rl => {
    const z = normInv(rl / 100);
    const res = Math.max(resFloor, resMean + z * resStd);
    const plP = Math.exp(Math.log(pl1y) + res);
    const idx = Math.min(Math.floor(365 / 5), percentiles.length - 1);
    const row = percentiles[idx] || {};
    const mcP = rl === 5 ? row.p5 : rl === 25 ? row.p25 : rl === 50 ? row.p50 : rl === 75 ? row.p75 : rl === 95 ? row.p95 : rl === 10 ? (row.p5 + row.p25) / 2 : (row.p75 + row.p95) / 2;
    const diff = mcP ? ((mcP - plP) / plP * 100) : 0;
    return { rl, plP, mcP: mcP || plP, diff };
  });

  return (
    <>
      <p style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.6, margin: "0 0 14px" }}>
        Power Law statistical distribution vs Monte Carlo simulation at each percentile (1Y horizon).
      </p>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${t.border}`, minWidth: 360 }}>
        {["Percentile", "PL + σ", "Monte Carlo", "Δ"].map(h => (
          <div key={h} style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h === "Percentile" ? "left" : "right" }}>{h}</div>
        ))}
      </div>
      {rows.map(r => (
        <div key={r.rl} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}`, minWidth: 360 }}>
          <div style={{ fontFamily: mn, fontSize: 12, color: r.rl < 25 ? "#EB5757" : r.rl > 75 ? "#27AE60" : t.cream, fontWeight: r.rl === 50 ? 600 : 400 }}>P{r.rl}</div>
          <div style={{ fontFamily: mn, fontSize: 12, color: t.cream, textAlign: "right" }}>{fmtK(r.plP)}</div>
          <div style={{ fontFamily: mn, fontSize: 12, color: t.cream, textAlign: "right", fontWeight: r.rl === 50 ? 600 : 400 }}>{fmtK(r.mcP)}</div>
          <div style={{ fontFamily: mn, fontSize: 11, color: r.diff >= 0 ? "#27AE60" : "#EB5757", textAlign: "right" }}>{r.diff >= 0 ? "+" : ""}{r.diff.toFixed(1)}%</div>
        </div>
      ))}
      </div>
    </>
  );
}
