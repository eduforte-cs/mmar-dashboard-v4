import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

export default function MarketRegime({ d, derived }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { H, annualVol, mom, halfLife, kappa, ouRegimes } = d;
  const { domRegime, volInfo } = derived;
  const sig = d.sigmaFromPL;

  const momDir = mom > 0.05 ? "Persistent" : mom < -0.05 ? "Reversing" : "Neutral";

  // Narrative from domRegime
  const narrative = domRegime.narrative || {};

  // OU regime info
  const ouCalm = ouRegimes?.regimes?.[0];
  const ouVol = ouRegimes?.regimes?.[1];
  const currentOURegime = ouRegimes?.currentRegime === 1 ? "Volatile" : "Calm";
  const transProb = ouRegimes?.transitionProb;

  return (
    <>
      {/* ── Dominant regime callout ── */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <div style={{ fontFamily: bd, fontSize: 22, fontWeight: 700, color: t.cream, marginBottom: 6 }}>{domRegime.label}</div>
        {narrative.desc && (
          <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.65, margin: 0 }}>{narrative.desc}</p>
        )}
      </div>

      {/* ── Regime scores grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {["bull", "bear", "accum", "recov", "range"].map(id => {
          const r = (derived._allRegimes || []).find(r => r.id === id) || { id, label: id, score: 0 };
          const labels = { bull: "Bull", bear: "Bear", accum: "Accum", recov: "Recovery", range: "Ranging" };
          const isActive = id === domRegime.id;
          return (
            <div key={id} style={{ padding: "14px 0", textAlign: "center", borderTop: isActive ? `2px solid ${t.cream}` : `2px solid transparent` }}>
              <div style={{ fontFamily: bd, fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? t.cream : t.faint, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                {labels[id] || id}
              </div>
              <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 700, color: isActive ? t.cream : t.ghost }}>{r.score}</div>
            </div>
          );
        })}
      </div>

      {/* ── Conditions checklist (for dominant regime) ── */}
      {domRegime.conditions?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Why {domRegime.label}
          </div>
          {domRegime.conditions.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 13, color: c.test ? t.cream : t.dim }}>{c.label}</div>
                <div style={{ fontFamily: mn, fontSize: 10, color: t.faint, marginTop: 1 }}>{c.detail}</div>
              </div>
              <span style={{ fontFamily: mn, fontSize: 12, fontWeight: 600, color: c.test ? "#27AE60" : t.ghost }}>{c.test ? "✓" : "✗"}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Historical context ── */}
      {narrative.history && (
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Historical context
          </div>
          <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: 0 }}>{narrative.history}</p>
        </div>
      )}

      {/* ── Implication ── */}
      {narrative.implication && (
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            What this means for you
          </div>
          <p style={{ fontFamily: bd, fontSize: 14, color: t.cream, lineHeight: 1.65, margin: 0 }}>{narrative.implication}</p>
        </div>
      )}

      {/* ── Supporting signals ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Supporting signals
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {[
          { label: "Momentum", value: momDir, sub: `AC: ${fmt(mom, 3)}` },
          { label: "Volatility", value: volInfo?.label || "–", sub: volInfo?.desc || `${(annualVol * 100).toFixed(0)}% annualized` },
          { label: "Trend persistence", value: `H = ${fmt(H, 3)}`, sub: H > 0.65 ? "Strong memory" : H > 0.55 ? "Moderate" : "Weak / mean-reverting" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "12px 0", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 600, color: t.cream }}>{s.value}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── OU Regime diagnostic ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Mean-reversion diagnostic (Ornstein-Uhlenbeck)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, marginBottom: 8 }}>
        {[
          { label: "Current state", value: currentOURegime, color: currentOURegime === "Volatile" ? "#F2994A" : "#27AE60" },
          { label: "Half-life", value: `${halfLife}d`, sub: halfLife < 30 ? "Fast reversion" : halfLife < 90 ? "Moderate" : "Slow" },
          { label: "κ (speed)", value: fmt(kappa, 4), sub: "Global" },
          { label: "Ann. volatility", value: `${(annualVol * 100).toFixed(0)}%`, sub: annualVol > 0.8 ? "High" : annualVol > 0.4 ? "Normal" : "Low" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "10px 0", borderRight: i < 3 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 3 ? 12 : 0, paddingLeft: i > 0 ? 12 : 0 }}>
            <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontFamily: mn, fontSize: 15, fontWeight: 500, color: s.color || t.cream }}>{s.value}</div>
            {s.sub && <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* OU regime details */}
      {ouCalm && ouVol && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: `1px solid ${t.borderFaint}` }}>
          {[
            { label: "Calm regime", kappa: ouCalm.kappa, vol: ouCalm.volScale, active: ouRegimes.currentRegime === 0 },
            { label: "Volatile regime", kappa: ouVol.kappa, vol: ouVol.volScale, active: ouRegimes.currentRegime === 1 },
          ].map((r, i) => (
            <div key={r.label} style={{ padding: "10px 0", borderRight: i === 0 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i === 0 ? 14 : 0, paddingLeft: i === 1 ? 14 : 0 }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: r.active ? t.cream : t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {r.label} {r.active && <span style={{ color: "#27AE60" }}>← active</span>}
              </div>
              <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
                κ = {fmt(r.kappa, 4)} · Vol scale: {fmt(r.vol, 2)}x
                {transProb && i === 0 && <> · P(→ volatile): {(transProb[0]?.[1] * 100 || 0).toFixed(1)}%</>}
                {transProb && i === 1 && <> · P(→ calm): {(transProb[1]?.[0] * 100 || 0).toFixed(1)}%</>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 8, lineHeight: 1.6 }}>
        Regime detection combines σ position, momentum autocorrelation, Hurst persistence, volatility level, and mean-reversion speed. The OU process models how fast deviations from fair value tend to correct — shorter half-life means faster reversion.
      </div>
    </>
  );
}
