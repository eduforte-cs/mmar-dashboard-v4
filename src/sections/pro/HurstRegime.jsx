import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

function getComboSignal(sig, H) {
  const trending = H > 0.55, reverting = H < 0.48;
  const cheap = sig < -0.5, expensive = sig > 0.5, fair = !cheap && !expensive;

  if (cheap && trending) return { label: "Strong accumulation", desc: "Undervalued with persistent upward trend. Historically the best entry zone." };
  if (cheap && reverting) return { label: "Choppy discount", desc: "Below fair value but no clear trend. Good for patient DCA." };
  if (cheap) return { label: "Quiet discount", desc: "Undervalued in a neutral trend. Accumulation is reasonable." };
  if (expensive && trending) return { label: "Momentum rally", desc: "Above fair value with persistent trend. Can run further but risk is elevated." };
  if (expensive && reverting) return { label: "Exhaustion", desc: "Overvalued and losing momentum. Historically precedes corrections." };
  if (expensive) return { label: "Elevated", desc: "Above fair value, trend neutral. Caution warranted." };
  if (fair && trending) return { label: "Healthy trend", desc: "Near fair value with momentum. A constructive environment." };
  if (fair && reverting) return { label: "Consolidation", desc: "Range-bound near fair value. No strong edge either way." };
  return { label: "Neutral", desc: "No strong signal from the σ + Hurst combination." };
}

function getVolSignal(ratio, H) {
  const compressed = ratio < 0.75, expanding = ratio > 1.25;
  const trending = H > 0.55, reverting = H < 0.48;

  if (compressed && trending) return { label: "Silent accumulation", desc: "Volatility compressing while trend persists. Classic institutional footprint." };
  if (compressed && reverting) return { label: "Pre-breakout compression", desc: "Low volatility, no trend. The spring is coiling." };
  if (compressed) return { label: "Quiet compression", desc: "Volatility dropping, trend neutral. Something is building." };
  if (expanding && trending) return { label: "Trend acceleration", desc: "Volatility expanding with trend. Late-stage momentum." };
  if (expanding && reverting) return { label: "Chaotic reversal", desc: "Volatility spiking with no direction. High risk." };
  if (expanding) return { label: "Volatility spike", desc: "Vol expanding but no clear trend. Reduce position size." };
  if (trending) return { label: "Healthy trend", desc: "Normal volatility with persistent trend." };
  return { label: "Normal conditions", desc: "No vol compression or expansion, no strong trend." };
}

export default function HurstRegime({ d }) {
  const { t } = useTheme();
  if (!d?.rollingHurst?.length) return null;

  const { rollingHurst, sigmaFromPL: sig, H } = d;
  const cur = rollingHurst[rollingHurst.length - 1];
  if (!cur) return null;

  const curH = cur.H || H;
  const combo = getComboSignal(sig, curH);
  const ratio = cur.volRatio || 1;
  const volSignal = getVolSignal(ratio, curH);

  // H trend
  const hTrend = rollingHurst.length >= 6
    ? rollingHurst[rollingHurst.length - 1].H - rollingHurst[rollingHurst.length - 6].H
    : 0;

  return (
    <>
      {/* σ + H combo */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <div style={{ fontFamily: bd, fontSize: 18, fontWeight: 700, color: t.cream, marginBottom: 4 }}>{combo.label}</div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.5 }}>{combo.desc}</div>
      </div>

      {/* Multi-scale Hurst */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Multi-scale Hurst</div>
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {[
          { l: "H (30d)", v: fmt(cur.h30, 3), s: cur.h30 > 0.55 ? "Trending" : cur.h30 < 0.48 ? "Reverting" : "Neutral" },
          { l: "H (90d)", v: fmt(cur.h90 || curH, 3), s: curH > 0.55 ? "Trending" : curH < 0.48 ? "Reverting" : "Neutral" },
          { l: "H (180d)", v: fmt(cur.h180, 3), s: "Medium-term" },
          { l: "H (365d)", v: fmt(cur.h365, 3), s: "Long-term" },
        ].map((m, i) => (
          <div key={m.l} style={{ padding: "12px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 16 : 0, paddingLeft: (i % 2 === 1) ? 16 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 1 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* H trend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <span style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>H trend (30d)</span>
        <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 600, color: hTrend > 0.02 ? "#27AE60" : hTrend < -0.02 ? "#EB5757" : t.faint }}>
          {hTrend > 0 ? "+" : ""}{hTrend.toFixed(3)} ({hTrend > 0.02 ? "strengthening" : hTrend < -0.02 ? "weakening" : "stable"})
        </span>
      </div>

      {/* Vol compression */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Volatility compression + trend</div>
      <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
        <div style={{ fontFamily: bd, fontSize: 16, fontWeight: 700, color: t.cream, marginBottom: 4 }}>{volSignal.label}</div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.5 }}>{volSignal.desc}</div>
      </div>

      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {[
          { l: "Vol 30d", v: `${cur.vol30}%` },
          { l: "Vol 90d", v: `${cur.vol90}%` },
          { l: "Ratio", v: ratio.toFixed(2), s: ratio < 0.75 ? "Compressing" : ratio > 1.25 ? "Expanding" : "Normal" },
        ].map((m, i) => (
          <div key={m.l} style={{ padding: "12px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 700, color: t.cream }}>{m.v}</div>
            {m.s && <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{m.s}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
