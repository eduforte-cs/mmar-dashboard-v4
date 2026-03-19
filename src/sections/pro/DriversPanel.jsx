import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";

export default function DriversPanel({ verdict, sig, backtestResults }) {
  const { t } = useTheme();
  if (!verdict) return null;

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
            <span style={{ fontFamily: mn, fontSize: 9, color: t.faint }}>{s.threshold}</span>
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
              <span style={{ fontFamily: mn, fontSize: 9, color: s.met ? "#27AE60" : t.faint }}>{s.met ? "✓" : "✗"} {s.threshold?.replace("weight: ", "w:")}</span>
            </div>
          </div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>{s.detail}</div>
        </div>
      ))}

      {/* How to read */}
      <div style={{ marginTop: 16, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}` }}>
        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
          The buy signal scores four factors using weights calibrated by backtest. The sell signal is separate: σ above threshold (Power Law) or Hurst momentum divergences. Either sell path alone is sufficient.
        </div>
      </div>

      {/* Sell warning signals */}
      {verdict.hurstDiv && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
            Sell warning signals — two independent paths
          </div>

          {/* Path 1: Power Law bubble */}
          <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: bd, fontSize: 13, fontWeight: 600, color: t.cream }}>Path 1 — Power Law overextension</span>
              <span style={{ fontFamily: mn, fontSize: 11, fontWeight: 600, color: verdict.isBubble ? "#EB5757" : verdict.isWarmBubble ? "#F2994A" : t.faint }}>
                {verdict.isBubble ? "Sell" : verdict.isWarmBubble ? "Reduce" : "Clear"}
              </span>
            </div>
            <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
              Sell: σ &gt; {verdict.bubbleSigThr} · Reduce: σ &gt; {backtestResults?.calibratedReduceSig ?? 0.5} · Current: {sig.toFixed(2)}
            </div>
          </div>

          {/* Path 2: Hurst divergences */}
          <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontFamily: bd, fontSize: 13, fontWeight: 600, color: t.cream }}>Path 2 — Momentum divergences · {verdict.hurstDiv.score}/3</span>
              <span style={{ fontFamily: mn, fontSize: 11, fontWeight: 600, color: verdict.isSellHurst ? "#EB5757" : verdict.isReduceHurst ? "#F2994A" : t.faint }}>
                {verdict.isSellHurst ? "Sell" : verdict.isReduceHurst ? "Reduce" : "Clear"}
              </span>
            </div>
            {[
              { label: "Price rising, momentum falling", active: verdict.hurstDiv.d1, detail: `σ trend: ${verdict.hurstDiv.detail.sigmaDelta >= 0 ? "+" : ""}${verdict.hurstDiv.detail.sigmaDelta} · H90: ${verdict.hurstDiv.detail.h90} vs ${verdict.hurstDiv.detail.h90prev}` },
              { label: "Short-term momentum breaking", active: verdict.hurstDiv.d2, detail: `H30: ${verdict.hurstDiv.detail.h30} · H90: ${verdict.hurstDiv.detail.h90}` },
              { label: "Volatility expanding as trend weakens", active: verdict.hurstDiv.d3, detail: `Vol ratio: ${verdict.hurstDiv.detail.volRatio}` },
            ].map(d => (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <div>
                  <div style={{ fontFamily: bd, fontSize: 12, fontWeight: 500, color: t.cream }}>{d.label}</div>
                  <div style={{ fontFamily: mn, fontSize: 10, color: t.faint, marginTop: 1 }}>{d.detail}</div>
                </div>
                <span style={{ fontFamily: mn, fontSize: 10, fontWeight: 600, color: d.active ? "#EB5757" : t.faint }}>{d.active ? "Active" : "Clear"}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, marginTop: 10, lineHeight: 1.7 }}>
            {verdict.isBubble || verdict.isSellHurst
              ? `Sell triggered via ${verdict.isBubble && verdict.isSellHurst ? "both paths" : verdict.isBubble ? "Power Law overextension" : "momentum divergences"}. Either path alone is sufficient.`
              : verdict.isWarmBubble || verdict.isReduceHurst
              ? "Reduce signal — approaching but not yet at sell territory."
              : "No sell signals active. Both paths are clear."}
          </div>
        </div>
      )}
    </>
  );
}
