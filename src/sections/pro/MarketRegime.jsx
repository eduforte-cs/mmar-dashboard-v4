import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

// SIG_LABELS are pure σ ranges (no language) so we keep them as constants.
const SIG_LABELS = { deepValue: "σ < -1.0", discount: "-1.0 to -0.5", fair: "-0.5 to 0.3", elevated: "0.3 to 0.8", overheated: "σ > 0.8" };
// Map the old English ZONE_COLORS keys to the new id-based keys so we
// can look up colours regardless of the displayed language.
const ZONE_COLORS = { strongBuy: "#1B8A4A", buy: "#27AE60", hold: "#E8A838", reduce: "#F2994A", sell: "#EB5757" };
// id → i18n key for momentum labels
const MOM_KEYS = { negative: "pro.regime.mom.falling", flat: "pro.regime.mom.flat", positive: "pro.regime.mom.rising" };
// id → i18n key for sigma-zone labels
const SIG_ZONE_KEYS = { deepValue: "pro.regime.zone.deepValue", discount: "pro.regime.zone.discount", fair: "pro.regime.zone.fair", elevated: "pro.regime.zone.elevated", overheated: "pro.regime.zone.overheated" };
// id → matrix cell key (15 cells)
const MATRIX_KEYS = {
  deepValue:  { negative: "pro.regime.matrix.capitulation", flat: "pro.regime.matrix.deepValue",     positive: "pro.regime.matrix.earlyRecovery" },
  discount:   { negative: "pro.regime.matrix.bearMarket",   flat: "pro.regime.matrix.accumulation",  positive: "pro.regime.matrix.recovery" },
  fair:       { negative: "pro.regime.matrix.cooling",      flat: "pro.regime.matrix.ranging",       positive: "pro.regime.matrix.warming" },
  elevated:   { negative: "pro.regime.matrix.correcting",   flat: "pro.regime.matrix.elevated",      positive: "pro.regime.matrix.bullRun" },
  overheated: { negative: "pro.regime.matrix.crash",        flat: "pro.regime.matrix.bubblePlateau", positive: "pro.regime.matrix.euphoria" },
};
// Maps a sigma zone to its semantic signal id (used for the cell tint)
const SIG_ZONE_SIGNALS = { deepValue: "strongBuy", discount: "buy", fair: "hold", elevated: "reduce", overheated: "sell" };

export default function MarketRegime({ d, derived }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!d || !derived) return null;

  const { H, annualVol, mom, halfLife, kappa, ouRegimes } = d;
  const { domRegime, regimeDiagnostics } = derived;
  const sig = d.sigmaFromPL;

  const narrative = domRegime.narrative || {};
  // domRegime.zone comes from the engine in English ("Buy", "Strong Buy",
  // "Hold", "Reduce", "Sell"). Convert it to our id-based key so the
  // colour map keeps working in either language.
  const zoneId = ({ "Strong Buy": "strongBuy", "Buy": "buy", "Hold": "hold", "Reduce": "reduce", "Sell": "sell" })[domRegime.zone] || null;
  const zoneColor = ZONE_COLORS[zoneId] || t.cream;
  // Localised version of the zone label for display
  const zoneLabel = zoneId ? tr(`zone.${zoneId}`) : (domRegime.zone || "");

  // OU regime info
  const ouCalm = ouRegimes?.regimes?.[0];
  const ouVol = ouRegimes?.regimes?.[1];
  const currentOUKey = ouRegimes?.currentRegime === 1 ? "ouVolatile" : "ouCalm";
  const currentOURegime = tr(`pro.regime.${currentOUKey}`);
  const transProb = ouRegimes?.transitionProb;

  // Build the 5x3 matrix for display
  const sigZones = ["overheated", "elevated", "fair", "discount", "deepValue"];
  const momZones = ["negative", "flat", "positive"];

  return (
    <>
      {/* ── Dominant regime ── */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: bd, fontSize: 22, fontWeight: 700, color: t.cream }}>{domRegime.label}</span>
          <span style={{ fontFamily: bd, fontSize: 11, color: zoneColor, padding: "2px 8px", border: `1px solid ${zoneColor}`, borderRadius: 4 }}>{zoneLabel}</span>
        </div>
        {narrative.desc && (
          <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.65, margin: 0 }}>{narrative.desc}</p>
        )}
      </div>

      {/* ── 2D Matrix ── */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {tr("pro.regime.matrixTitle")}
      </div>
      <div style={{ overflowX: "auto", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ padding: "8px 6px", fontFamily: bd, fontSize: 9, color: t.faint, textAlign: "right", width: 90 }}></th>
              {momZones.map(mz => (
                <th key={mz} style={{ padding: "8px 6px", fontFamily: bd, fontSize: 10, color: mz === domRegime.momZone ? t.cream : t.faint, textAlign: "center", fontWeight: mz === domRegime.momZone ? 600 : 400 }}>
                  {tr(MOM_KEYS[mz])}
                  <div style={{ fontFamily: mn, fontSize: 9, color: t.dim, fontWeight: 400 }}>{mz === "negative" ? "mom < -0.05" : mz === "positive" ? "mom > 0.05" : "|mom| < 0.05"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sigZones.map(sz => (
              <tr key={sz}>
                <td style={{ padding: "6px 6px", fontFamily: bd, fontSize: 10, color: sz === domRegime.sigZone ? t.cream : t.faint, textAlign: "right", fontWeight: sz === domRegime.sigZone ? 600 : 400, borderRight: `1px solid ${t.border}` }}>
                  {tr(SIG_ZONE_KEYS[sz])}
                  <div style={{ fontFamily: mn, fontSize: 8, color: t.dim, fontWeight: 400 }}>{SIG_LABELS[sz]}</div>
                </td>
                {momZones.map(mz => {
                  const label = tr(MATRIX_KEYS[sz][mz]);
                  const isActive = sz === domRegime.sigZone && mz === domRegime.momZone;
                  const zoneSignal = SIG_ZONE_SIGNALS[sz];
                  const bgColor = zoneSignal === "strongBuy" || zoneSignal === "buy" ? "rgba(39,174,96,0.05)" : zoneSignal === "sell" ? "rgba(235,87,87,0.05)" : zoneSignal === "reduce" ? "rgba(242,153,74,0.04)" : "transparent";
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
          <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{tr("pro.regime.zoneValidated").replace("{zone}", tr(SIG_ZONE_KEYS[domRegime.sigZone]))}</div>
        </div>
        <div style={{ padding: "12px 0 12px 14px" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{tr("pro.directionMomentum")}</div>
          <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 600, color: t.cream }}>{mom?.toFixed(3) || "0"}</div>
          <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{tr("pro.regime.autocorr").replace("{label}", tr(MOM_KEYS[domRegime.momZone]))}</div>
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
        {tr("pro.regime.supportingDiag")}
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
        {tr("pro.regime.ouTitle")}
      </div>
      <div className="grid-4" style={{ marginBottom: 8 }}>
        {[
          { id: "state",   label: tr("pro.regime.ouCurrentState"), value: currentOURegime, color: currentOUKey === "ouVolatile" ? "#F2994A" : "#27AE60" },
          { id: "halflife", label: tr("pro.regime.ouHalfLife"), value: `${halfLife}d`, sub: halfLife < 30 ? tr("pro.regime.ouFastReversion") : halfLife < 90 ? tr("pro.regime.ouModerate") : tr("pro.regime.ouSlow") },
          { id: "kappa",   label: tr("pro.regime.ouKappaSpeed"), value: fmt(kappa, 4), sub: tr("pro.regime.ouGlobal") },
          { id: "annvol",  label: tr("pro.regime.ouAnnVol"), value: `${(annualVol * 100).toFixed(0)}%`, sub: annualVol > 0.8 ? tr("pro.regime.ouHigh") : annualVol > 0.4 ? tr("pro.regime.ouNormal") : tr("pro.regime.ouLow") },
        ].map((s, i) => (
          <div key={s.id} style={{ padding: "10px 0", borderRight: i < 3 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 3 ? 12 : 0, paddingLeft: i > 0 ? 12 : 0 }}>
            <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontFamily: mn, fontSize: 15, fontWeight: 500, color: s.color || t.cream }}>{s.value}</div>
            {s.sub && <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {ouCalm && ouVol && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: `1px solid ${t.borderFaint}` }}>
          {[
            { id: "calm", labelKey: "pro.regime.ouCalmRegime", kappa: ouCalm.kappa, vol: ouCalm.volScale, active: ouRegimes.currentRegime === 0, transTo: transProb?.[0]?.[1] },
            { id: "vol",  labelKey: "pro.regime.ouVolRegime",  kappa: ouVol.kappa,  vol: ouVol.volScale,  active: ouRegimes.currentRegime === 1, transTo: transProb?.[1]?.[0] },
          ].map((r, i) => (
            <div key={r.id} style={{ padding: "10px 0", borderRight: i === 0 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i === 0 ? 14 : 0, paddingLeft: i === 1 ? 14 : 0 }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: r.active ? t.cream : t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                {tr(r.labelKey)} {r.active && <span style={{ color: "#27AE60" }}>{tr("pro.regime.ouActive")}</span>}
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
        {tr("pro.regime.bottomNote")}
      </div>
    </>
  );
}
