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
        {tr("pro.driver.whereYouAre")}
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
        {tr("pro.driver.modelExpects")}
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
          {tr("pro.driver.signalThresholds")}
        </div>

        {/* Sigma ruler */}
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
          {[
            { id: "strongBuy", labelKey: "zone.strongBuy", range: `σ < ${thr.strongBuy}`, color: "#1B8A4A", active: verdict.level === "strongBuy" },
            { id: "buy",       labelKey: "zone.buy",       range: `${thr.strongBuy} ≤ σ < ${thr.buy}`, color: "#27AE60", active: verdict.level === "buy" },
            { id: "hold",      labelKey: "signal.hold",    range: `${thr.buy} ≤ σ < ${thr.reduce}`,    color: "#E8A838", active: verdict.level === "hold" },
            { id: "reduce",    labelKey: "zone.reduce",    range: `${thr.reduce} ≤ σ < ${thr.sell}`,   color: "#F2994A", active: verdict.level === "reduce" },
            { id: "sell",      labelKey: "zone.sell",      range: `σ ≥ ${thr.sell}`,                   color: "#EB5757", active: verdict.level === "sell" },
          ].map(s => (
            <div key={s.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "6px 0",
              opacity: s.active ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, opacity: s.active ? 1 : 0.3 }} />
                <span style={{ fontFamily: bd, fontSize: 12, fontWeight: s.active ? 600 : 400, color: s.active ? s.color : t.faint }}>{tr(s.labelKey)}</span>
                {s.active && <span style={{ fontFamily: mn, fontSize: 9, color: s.color }}>{tr("pro.driver.currentArrow")}</span>}
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
              {verdict.internalLevel === "accumulate" ? tr("pro.driver.holdAccumulate") :
               verdict.internalLevel === "caution" ? tr("pro.driver.holdCaution") :
               tr("pro.driver.holdNeutral")}
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
            {tr("pro.driver.hurstDiagTitle")}
          </div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, marginBottom: 10, lineHeight: 1.6 }}>
            {tr("pro.driver.hurstDiagDesc")}
          </div>
          {verdict.hurstDiv.detail && [
            { id: "d1", labelKey: "pro.driver.divPriceMomentum",  active: verdict.hurstDiv.d1, detail: `σ trend: ${verdict.hurstDiv.detail.sigmaDelta >= 0 ? "+" : ""}${verdict.hurstDiv.detail.sigmaDelta} · H90: ${verdict.hurstDiv.detail.h90} vs ${verdict.hurstDiv.detail.h90prev}` },
            { id: "d2", labelKey: "pro.driver.divShortBreaking",  active: verdict.hurstDiv.d2, detail: `H30: ${verdict.hurstDiv.detail.h30} · H90: ${verdict.hurstDiv.detail.h90}` },
            { id: "d3", labelKey: "pro.driver.divVolExpanding",   active: verdict.hurstDiv.d3, detail: `Vol ratio: ${verdict.hurstDiv.detail.volRatio}` },
          ].map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 11, color: t.dim }}>{tr(d.labelKey)}</div>
                <div style={{ fontFamily: mn, fontSize: 9, color: t.faint, marginTop: 1 }}>{d.detail}</div>
              </div>
              <span style={{ fontFamily: mn, fontSize: 9, color: d.active ? "#F2994A" : t.faint }}>{d.active ? tr("pro.driver.active") : tr("pro.driver.clear")}</span>
            </div>
          ))}
          <div style={{ fontFamily: mn, fontSize: 10, color: t.dim, marginTop: 6 }}>
            {tr("pro.driver.divergenceScore").replace("{score}", verdict.hurstDiv.score)}
          </div>
        </div>
      )}

      {/* How to read */}
      <div style={{ marginTop: 16, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}` }}>
        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
          {tr("pro.driver.howToRead")}
        </div>
      </div>
    </>
  );
}
