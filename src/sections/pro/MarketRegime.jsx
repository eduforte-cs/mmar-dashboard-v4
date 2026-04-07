import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

const MOM_LABELS = { negative: "Falling", flat: "Flat", positive: "Rising" };
const SIG_LABELS = { deepValue: "σ < -1.0", discount: "-1.0 to -0.5", fair: "-0.5 to 0.3", elevated: "0.3 to 0.8", overheated: "σ > 0.8" };
const SIG_ZONE_LABELS = { deepValue: "Deep value", discount: "Discount", fair: "Fair value", elevated: "Elevated", overheated: "Overheated" };
const ZONE_COLORS = { "Strong Buy": "#1B8A4A", "Buy": "#27AE60", "Hold": "#E8A838", "Reduce": "#F2994A", "Sell": "#EB5757" };

export default function MarketRegime({ d, derived }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!d || !derived) return null;

  const { H, annualVol, mom, halfLife, kappa, ouRegimes } = d;
  const { domRegime, regimeDiagnostics } = derived;
  const sig = d.sigmaFromPL;

  const narrative = domRegime.narrative || {};
  const zoneColor = ZONE_COLORS[domRegime.zone] || t.cream;

  // OU regime info
  const ouCalm = ouRegimes?.regimes?.[0];
  const ouVol = ouRegimes?.regimes?.[1];
  const currentOURegime = ouRegimes?.currentRegime === 1 ? "Volatile" : "Calm";
  const transProb = ouRegimes?.transitionProb;

  // Build the 5x3 matrix for display
  const sigZones = ["overheated", "elevated", "fair", "discount", "deepValue"];
  const momZones = ["negative", "flat", "positive"];
  const MATRIX = {
    deepValue:  { negative: "Capitulation", flat: "Deep value",      positive: "Early recovery" },
    discount:   { negative: "Bear market",  flat: "Accumulation",    positive: "Recovery" },
    fair:       { negative: "Cooling",      flat: "Ranging",         positive: "Warming" },
    elevated:   { negative: "Correcting",   flat: "Elevated",        positive: "Bull run" },
    overheated: { negative: "Crash",        flat: "Bubble plateau",  positive: "Euphoria" },
  };
  const SIG_ZONE_SIGNALS = { deepValue: "Strong Buy", discount: "Buy", fair: "Hold", elevated: "Reduce", overheated: "Sell" };

  return (
    <>
      {/* ── Dominant regime ── */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: bd, fontSize: 22, fontWeight: 700, color: t.cream }}>{domRegime.label}</span>
          <span style={{ fontFamily: bd, fontSize: 11, color: zoneColor, padding: "2px 8px", border: `1px solid ${zoneColor}`, borderRadius: 4 }}>{domRegime.zone}</span>
        </div>
        {narrative.desc && (
          <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.65, margin: 0 }}>{narrative.desc}</p>
        )}
      </div>

      {/* ── 2D Matrix ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Position × Direction matrix
      </div>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 6px", fontFamily: bd, fontSize: 9, color: t.faint, textAlign: "right", width: 90 }}></th>
              {momZones.map(mz => (
                <th key={mz} style={{ padding: "8px 6px", fontFamily: bd, fontSize: 10, color: mz === domRegime.momZone ? t.cream : t.faint, textAlign: "center", fontWeight: mz === domRegime.momZone ? 600 : 400 }}>
                  {MOM_LABELS[mz]}
                  <div style={{ fontFamily: mn, fontSize: 9, color: t.dim, fontWeight: 400 }}>{mz === "negative" ? "mom < -0.05" : mz === "positive" ? "mom > 0.05" : "|mom| < 0.05"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sigZones.map(sz => (
              <tr key={sz}>
                <td style={{ padding: "6px 6px", fontFamily: bd, fontSize: 10, color: sz === domRegime.sigZone ? t.cream : t.faint, textAlign: "right", fontWeight: sz === domRegime.sigZone ? 600 : 400, borderRight: `1px solid ${t.border}` }}>
                  {SIG_ZONE_LABELS[sz]}
                  <div style={{ fontFamily: mn, fontSize: 8, color: t.dim, fontWeight: 400 }}>{SIG_LABELS[sz]}</div>
                </td>
                {momZones.map(mz => {
                  const label = MATRIX[sz][mz];
                  const isActive = sz === domRegime.sigZone && mz === domRegime.momZone;
                  const zoneSignal = SIG_ZONE_SIGNALS[sz];
                  const bgColor = zoneSignal === "Strong Buy" || zoneSignal === "Buy" ? "rgba(39,174,96,0.05)" : zoneSignal === "Sell" ? "rgba(235,87,87,0.05)" : zoneSignal === "Reduce" ? "rgba(242,153,74,0.04)" : "transparent";
                  return (
                    <td key={mz} style={{
                      padding: "10px 6px", textAlign: "center",
                      background: bgColor,
                      border: isActive ? `2px solid ${t.cream}` : `0.5px solid ${t.borderFaint}`,
                      borderRadius: isActive ? 4 : 0,
                    }}>
                      <div style={{ fontFamily: bd, fontSize: isActive ? 12 : 11, fontWeight: isActive ? 600 : 400, color: isActive ? t.cream : t.dim }}>
                        {isActive && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: t.cream, marginRight: 4, verticalAlign: "middle" }} />}
                        {label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── How it's determined ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <div style={{ padding: "12px 14px 12px 0", borderRight: `1px solid ${t.borderFaint}` }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{tr("pro.positionSigma")}</div>
          <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 600, color: t.cream }}>{sig.toFixed(2)}σ</div>
          <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{SIG_ZONE_LABELS[domRegime.sigZone]} zone · Validated by backtest</div>
        </div>
        <div style={{ padding: "12px 0 12px 14px" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{tr("pro.directionMomentum")}</div>
          <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 600, color: t.cream }}>{mom?.toFixed(3) || "0"}</div>
          <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{MOM_LABELS[domRegime.momZone]} · Autocorrelation of residual returns</div>
        </div>
      </div>

      {/* ── Historical context ── */}
      {narrative.history && (
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.historicalContext")}</div>
          <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: 0 }}>{narrative.history}</p>
        </div>
      )}

      {/* ── Implication ── */}
      {narrative.implication && (
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.whatThisMeans")}</div>
          <p style={{ fontFamily: bd, fontSize: 14, color: t.cream, lineHeight: 1.65, margin: 0 }}>{narrative.implication}</p>
        </div>
      )}

      {/* ── Diagnostics ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Supporting diagnostics
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {(regimeDiagnostics || []).map((diag, i) => (
          <div key={diag.label} style={{ padding: "10px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 14 : 0, paddingLeft: (i % 2 === 1) ? 14 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{diag.label}</div>
            <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 600, color: t.cream }}>{diag.value}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{diag.interpretation}</div>
          </div>
        ))}
      </div>

      {/* ── OU Regime ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        Volatility regime (Ornstein-Uhlenbeck)
      </div>
      <div className="grid-4" style={{ marginBottom: 8 }}>
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

      {ouCalm && ouVol && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: `1px solid ${t.borderFaint}` }}>
          {[
            { label: "Calm regime", kappa: ouCalm.kappa, vol: ouCalm.volScale, active: ouRegimes.currentRegime === 0, transTo: transProb?.[0]?.[1] },
            { label: "Volatile regime", kappa: ouVol.kappa, vol: ouVol.volScale, active: ouRegimes.currentRegime === 1, transTo: transProb?.[1]?.[0] },
          ].map((r, i) => (
            <div key={r.label} style={{ padding: "10px 0", borderRight: i === 0 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i === 0 ? 14 : 0, paddingLeft: i === 1 ? 14 : 0 }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: r.active ? t.cream : t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {r.label} {r.active && <span style={{ color: "#27AE60" }}>← active</span>}
              </div>
              <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
                κ = {fmt(r.kappa, 4)} · Vol scale: {fmt(r.vol, 2)}x
                {r.transTo != null && <> · P(transition): {(r.transTo * 100).toFixed(1)}%</>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 8, lineHeight: 1.6 }}>
        Market regime is determined by two axes: position (σ from Power Law, validated by backtest) and direction (momentum autocorrelation). Hurst, volatility, and mean-reversion speed are shown as supporting diagnostics — they inform the narrative but don't determine the regime.
      </div>
    </>
  );
}
