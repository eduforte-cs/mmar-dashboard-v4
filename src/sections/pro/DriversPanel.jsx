import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";

export default function DriversPanel({ verdict, sig, backtestResults }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!verdict) return null;

  const thr = verdict.thresholds || { strongBuy: -1, buy: -0.5, reduce: 0.5, sell: 0.8 };

  return (
    <>
      {/* PL signals */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>
        Where you are today
      </div>
      {verdict.plSignals?.map(s => (
        <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
          <div>
            <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream }}>{s.name}</div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 1 }}>{s.detail}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: t.cream }}>{s.value}</span>
            <span style={{ fontFamily: mn, fontSize: 9, color: s.met ? "#27AE60" : t.faint }}>{s.met ? "✓" : "✗"}</span>
          </div>
        </div>
      ))}

      {/* MC signals */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginTop: 20, marginBottom: 10 }}>
        What the model expects
      </div>
      {verdict.mcSignals?.map(s => (
        <div key={s.name} style={{ padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream }}>{s.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: t.cream }}>{s.value}</span>
              <span style={{ fontFamily: mn, fontSize: 9, color: s.met ? "#27AE60" : t.faint }}>{s.met ? "✓" : "✗"}</span>
            </div>
          </div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>{s.detail}</div>
        </div>
      ))}

      {/* Signal structure */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
          Signal thresholds
        </div>

        {/* Sigma ruler */}
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
          {[
            { label: "Strong Buy", range: `σ < ${thr.strongBuy}`, color: "#1B8A4A", active: verdict.level === "strongBuy" },
            { label: "Buy", range: `${thr.strongBuy} ≤ σ < ${thr.buy}`, color: "#27AE60", active: verdict.level === "buy" },
            { label: "Hold", range: `${thr.buy} ≤ σ < ${thr.reduce}`, color: "#E8A838", active: verdict.level === "hold" },
            { label: "Reduce", range: `${thr.reduce} ≤ σ < ${thr.sell}`, color: "#F2994A", active: verdict.level === "reduce" },
            { label: "Sell", range: `σ ≥ ${thr.sell}`, color: "#EB5757", active: verdict.level === "sell" },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0",
              opacity: s.active ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, opacity: s.active ? 1 : 0.3 }} />
                <span style={{ fontFamily: bd, fontSize: 12, fontWeight: s.active ? 600 : 400, color: s.active ? s.color : t.faint }}>{s.label}</span>
                {s.active && <span style={{ fontFamily: mn, fontSize: 9, color: s.color }}>← current</span>}
              </div>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.dim }}>{s.range}</span>
            </div>
          ))}
        </div>

        {/* Internal sub-zone for hold */}
        {verdict.level === "hold" && verdict.internalLevel && (
          <div style={{ padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 4 }}>{tr("pro.holdSubZone")}</div>
            <div style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color:
              verdict.internalLevel === "accumulate" ? "#27AE60" :
              verdict.internalLevel === "caution" ? "#F2994A" : t.cream
            }}>
              {verdict.internalLevel === "accumulate" ? "Accumulate — historically 100% accuracy" :
               verdict.internalLevel === "caution" ? "Caution — coin flip territory (56%)" :
               "Neutral — odds favor you (83%) but downside appears"}
            </div>
          </div>
        )}

        {/* Current sigma */}
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>{tr("pro.currentSigma")}</span>
            <span style={{ fontFamily: mn, fontSize: 14, fontWeight: 600, color: t.cream }}>{sig.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Hurst divergences — diagnostic only */}
      {verdict.hurstDiv && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
            Momentum diagnostics (Hurst) — informational, not used for signal
          </div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, marginBottom: 10, lineHeight: 1.6 }}>
            Hurst divergences measure trend persistence breakdown. Shown for context — the sell signal uses σ thresholds only, validated out-of-sample.
          </div>
          {verdict.hurstDiv.detail && [
            { label: "Price rising, momentum falling", active: verdict.hurstDiv.d1, detail: `σ trend: ${verdict.hurstDiv.detail.sigmaDelta >= 0 ? "+" : ""}${verdict.hurstDiv.detail.sigmaDelta} · H90: ${verdict.hurstDiv.detail.h90} vs ${verdict.hurstDiv.detail.h90prev}` },
            { label: "Short-term momentum breaking", active: verdict.hurstDiv.d2, detail: `H30: ${verdict.hurstDiv.detail.h30} · H90: ${verdict.hurstDiv.detail.h90}` },
            { label: "Volatility expanding as trend weakens", active: verdict.hurstDiv.d3, detail: `Vol ratio: ${verdict.hurstDiv.detail.volRatio}` },
          ].map(d => (
            <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 11, color: t.dim }}>{d.label}</div>
                <div style={{ fontFamily: mn, fontSize: 9, color: t.faint, marginTop: 1 }}>{d.detail}</div>
              </div>
              <span style={{ fontFamily: mn, fontSize: 9, color: d.active ? "#F2994A" : t.faint }}>{d.active ? "Active" : "Clear"}</span>
            </div>
          ))}
          <div style={{ fontFamily: mn, fontSize: 10, color: t.dim, marginTop: 6 }}>
            Divergence score: {verdict.hurstDiv.score}/3
          </div>
        </div>
      )}

      {/* How to read */}
      <div style={{ marginTop: 16, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}` }}>
        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
          Buy and sell signals use pure σ thresholds validated by walk-forward backtest with local Power Law refit at each point. No weight optimization, no in-sample calibration. Buy at σ &lt; -0.5 has 100% historical accuracy. Sell at σ &gt; 0.8 has 0% accuracy at 12 months. MC probabilities are shown as context — they inform the narrative but don't drive the signal.
        </div>
      </div>
    </>
  );
}
