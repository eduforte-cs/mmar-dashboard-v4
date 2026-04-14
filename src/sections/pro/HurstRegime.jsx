import React from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/I18nContext";
import { bd, mn } from "../../theme/tokens";
import { fmt } from "../../engine/constants.js";

// Returns i18n keys; resolved by the caller via tr().
function getComboSignalKey(sig, H) {
  const trending = H > 0.55, reverting = H < 0.48;
  const cheap = sig < -0.5, expensive = sig > 0.5, fair = !cheap && !expensive;

  if (cheap && trending)        return "strongAccum";
  if (cheap && reverting)       return "choppyDiscount";
  if (cheap)                    return "quietDiscount";
  if (expensive && trending)    return "momentumRally";
  if (expensive && reverting)   return "exhaustion";
  if (expensive)                return "elevated";
  if (fair && trending)         return "healthyTrend";
  if (fair && reverting)        return "consolidation";
  return "neutral";
}

function getVolSignalKey(ratio, H) {
  const compressed = ratio < 0.75, expanding = ratio > 1.25;
  const trending = H > 0.55, reverting = H < 0.48;

  if (compressed && trending)   return "silentAccum";
  if (compressed && reverting)  return "preBreakout";
  if (compressed)               return "quietCompression";
  if (expanding && trending)    return "trendAccel";
  if (expanding && reverting)   return "chaoticReversal";
  if (expanding)                return "volSpike";
  if (trending)                 return "healthyTrend";
  return "normal";
}

export default function HurstRegime({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!d?.rollingHurst?.length) return null;

  const { rollingHurst, sigmaFromPL: sig, H } = d;
  const cur = rollingHurst[rollingHurst.length - 1];
  if (!cur) return null;

  const curH = cur.H || H;
  const comboKey = getComboSignalKey(sig, curH);
  const ratio = cur.volRatio || 1;
  const volSignalKey = getVolSignalKey(ratio, curH);

  // H trend
  const hTrend = rollingHurst.length >= 6
    ? rollingHurst[rollingHurst.length - 1].H - rollingHurst[rollingHurst.length - 6].H
    : 0;

  // Helpers to classify Hurst into trending/reverting/neutral labels
  const hLabel = (h) => h > 0.55 ? tr("pro.hurst.trending") : h < 0.48 ? tr("pro.hurst.reverting") : tr("pro.hurst.neutral");

  return (
    <>
      {/* σ + H combo */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <div style={{ fontFamily: bd, fontSize: 18, fontWeight: 700, color: t.cream, marginBottom: 4 }}>{tr(`pro.hurst.combo.${comboKey}`)}</div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.5 }}>{tr(`pro.hurst.combo.${comboKey}Desc`)}</div>
      </div>

      {/* Multi-scale Hurst */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{tr("pro.multiScaleHurst")}</div>
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        {[
          { id: "h30",  l: tr("pro.hurst.h30"),  v: fmt(cur.h30, 3),         s: hLabel(cur.h30) },
          { id: "h90",  l: tr("pro.hurst.h90"),  v: fmt(cur.h90 || curH, 3), s: hLabel(curH) },
          { id: "h180", l: tr("pro.hurst.h180"), v: fmt(cur.h180, 3),        s: tr("pro.hurst.mediumTerm") },
          { id: "h365", l: tr("pro.hurst.h365"), v: fmt(cur.h365, 3),        s: tr("pro.hurst.longTerm") },
        ].map((m, i) => (
          <div key={m.id} style={{ padding: "12px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 16 : 0, paddingLeft: (i % 2 === 1) ? 16 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 1 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* H trend */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
        <span style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>{tr("pro.hTrend30d")}</span>
        <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 600, color: hTrend > 0.02 ? "#27AE60" : hTrend < -0.02 ? "#EB5757" : t.faint }}>
          {hTrend > 0 ? "+" : ""}{hTrend.toFixed(3)} ({hTrend > 0.02 ? tr("pro.hurst.strengthening") : hTrend < -0.02 ? tr("pro.hurst.weakening") : tr("pro.hurst.stable")})
        </span>
      </div>

      {/* Vol compression */}
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{tr("pro.volCompression")}</div>
      <div style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
        <div style={{ fontFamily: bd, fontSize: 16, fontWeight: 700, color: t.cream, marginBottom: 4 }}>{tr(`pro.hurst.vol.${volSignalKey}`)}</div>
        <div style={{ fontFamily: bd, fontSize: 13, color: t.dim, lineHeight: 1.5 }}>{tr(`pro.hurst.vol.${volSignalKey}Desc`)}</div>
      </div>

      <div className="grid-3" style={{ borderBottom: `1px solid ${t.borderFaint}` }}>
        {[
          { id: "v30",  l: tr("pro.hurst.vol30"), v: `${cur.vol30}%` },
          { id: "v90",  l: tr("pro.hurst.vol90"), v: `${cur.vol90}%` },
          { id: "rat",  l: tr("pro.hurst.ratio"), v: ratio.toFixed(2), s: ratio < 0.75 ? tr("pro.hurst.compressing") : ratio > 1.25 ? tr("pro.hurst.expanding") : tr("pro.hurst.normal") },
        ].map((m, i) => (
          <div key={m.id} style={{ padding: "12px 0", textAlign: "center", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 700, color: t.cream }}>{m.v}</div>
            {m.s && <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{m.s}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
