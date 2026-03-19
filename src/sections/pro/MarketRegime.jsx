import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

export default function MarketRegime({ d, derived }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { H, annualVol, mom, halfLife } = d;
  const { domRegime, volInfo } = derived;

  const momDir = mom > 0.05 ? "Persistent" : mom < -0.05 ? "Reversing" : "Neutral";

  // Reconstruct all regimes for the grid
  const sig = d.sigmaFromPL;
  const lambda2 = d.lambda2;
  const regimes = [
    { id: "bear", label: "Bear", score: [sig < -0.8, sig < -1.2, mom < -0.06, mom < -0.10, H > 0.60, annualVol >= 0.80, halfLife > 120].filter(Boolean).length },
    { id: "range", label: "Ranging", score: [Math.abs(sig) < 0.4, Math.abs(sig) < 0.2, Math.abs(mom) < 0.05, Math.abs(mom) < 0.03, H < 0.58, lambda2 < 0.12, annualVol < 0.45].filter(Boolean).length },
    { id: "accum", label: "Accum", score: [sig < -0.7, sig < -1.0, mom > -0.04, H < 0.62, annualVol < 0.80, halfLife < 200, lambda2 < 0.20].filter(Boolean).length },
    { id: "recov", label: "Recovery", score: [sig < 0.2, mom > 0.04, mom > 0.08, H > 0.55, annualVol < 0.80, sig > -1.0, halfLife < 180].filter(Boolean).length },
    { id: "bull", label: "Bull", score: [sig > 0.5, sig > 1.0, mom > 0.08, mom > 0.12, H > 0.58, H > 0.65, annualVol >= 0.45].filter(Boolean).length },
  ];

  return (
    <>
      {/* Dominant callout */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <div style={{ fontFamily: bd, fontSize: 18, fontWeight: 700, color: t.cream, marginBottom: 4 }}>{domRegime.label}</div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.dim }}>{domRegime.desc} — {domRegime.score}/7 conditions met</div>
      </div>

      {/* Regime grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {regimes.map(r => {
          const isActive = r.id === domRegime.id;
          return (
            <div key={r.id} style={{ padding: "14px 0", textAlign: "center", borderTop: isActive ? `2px solid ${t.cream}` : `2px solid transparent` }}>
              <div style={{ fontFamily: bd, fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? t.cream : t.faint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{r.label}</div>
              <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 700, color: isActive ? t.cream : t.ghost }}>{r.score}<span style={{ fontSize: 11, fontWeight: 400 }}>/7</span></div>
            </div>
          );
        })}
      </div>

      {/* Supporting signals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        {[
          { label: "Momentum", value: momDir, sub: `AC: ${fmt(mom, 3)}` },
          { label: "Volatility", value: volInfo.label, sub: volInfo.desc },
          { label: "Trend persistence", value: `H = ${fmt(H, 3)}`, sub: H > 0.65 ? "Strong memory" : H > 0.55 ? "Moderate" : "Weak" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "12px 0", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 600, color: t.cream }}>{s.value}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
