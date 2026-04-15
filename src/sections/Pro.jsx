import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import { fmtK, fmt } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";
import { localizeVerdict } from "../i18n/localizeVerdict";
import Toggle from "../components/Toggle";
import CatLabel from "../components/CatLabel";
import Term from "../components/Term";
import { trackChartInteraction } from "../tracking";
import DriversPanel from "./pro/DriversPanel";
import TimeToFairValue from "./pro/TimeToFairValue";
import MarketRegime from "./pro/MarketRegime";
import HurstRegime from "./pro/HurstRegime";
import { RiskMatrix } from "./pro/DataTables";
import { MCChart, SigmaChart, MCHorizonTable } from "./pro/Charts";
import PowerLawChart from "./pro/PowerLawChart";

export default function Pro({ d, derived, setTab }) {
  const { t } = useTheme();
  const { t: tr, lang } = useI18n();
  if (!d || !derived) return null;

  const { H, lambda2, sigmaFromPL: sig, ouRegimes, r2, resMean, resStd, resFloor,
    ransac, evtCap, kappa, halfLife, annualVol, S0, a, b, t0,
    backtestResults, percentiles, percentiles3y, sigmaChart,
  } = d;
  const verdict = localizeVerdict(derived.verdict, d, lang);
  const { domRegime, mcLossHorizons, supportPrice, episode } = derived;

  const bt = backtestResults;

  // PL forecast data
  const plForecast3y = Array.from({ length: Math.ceil(365 * 3 / 5) + 1 }, (_, i) => ({ t: i * 5, pl: +plPrice(a, b, t0 + i * 5).toFixed(0) }));
  const last3y = percentiles3y[percentiles3y.length - 1];

  // Metrics strip. Stable `id` is used as the React key so it
  // doesn't depend on the (potentially translated) label string,
  // and the `l` field can now be a JSX node that includes a
  // glossary icon after the text.
  const metrics = [
    {
      id: "hurst",
      l: <>{tr("pro.hurst90d")} <Term id="hurst" iconSize={11} /></>,
      v: H.toFixed(2),
      s: H > 0.55 ? tr("pro.persistent") : tr("pro.meanReverting"),
    },
    {
      id: "lambda2",
      l: <>{tr("pro.metric.lambda2")} <Term id="lambda2" iconSize={11} /></>,
      v: lambda2.toFixed(2),
      s: tr("pro.metric.partitionFn"),
    },
    {
      id: "signal",
      l: <>{tr("pro.metric.signal")} <Term id="sigma" iconSize={11} /></>,
      v: verdict.subtitle,
      s: `σ = ${sig.toFixed(2)}`,
      color: verdict.subtitleColor,
    },
    {
      id: "regime",
      l: tr("pro.metric.regime"),
      v: domRegime.label,
      s: domRegime.zone || "",
      color: domRegime.zone === "Buy" || domRegime.zone === "Strong Buy" ? "#27AE60" : domRegime.zone === "Sell" ? "#EB5757" : domRegime.zone === "Reduce" ? "#F2994A" : t.cream,
    },
  ];

  // Key price levels
  const pl1y = plPrice(a, b, t0 + 365);
  const pl2y = plPrice(a, b, t0 + 730);
  const pl3y = plPrice(a, b, t0 + 1095);
  const supportAt = (days) => ransac ? Math.exp(ransac.a + ransac.b * Math.log(t0 + days) + ransac.floor) : supportPrice;
  // labelKey lets us i18n-resolve at render time and still detect the
  // "current price" row by id rather than by translated string.
  const keyLevels = [
    { id: "bubble",  labelKey: "pro.level.bubbleZone",   v: Math.exp(Math.log(plPrice(a, b, t0)) + resMean + 2 * resStd), color: "#EB5757" },
    { id: "ceiling", labelKey: "pro.level.cycleCeiling", v: Math.exp(Math.log(plPrice(a, b, t0)) + resMean + resStd),     color: "#F2994A" },
    { id: "fair",    labelKey: "pro.level.fairValue",    v: plPrice(a, b, t0),                                            color: t.cream  },
    { id: "current", labelKey: "pro.level.current",      v: S0,                                                            color: "#27AE60" },
    { id: "support", labelKey: "pro.level.supportFloor", v: supportPrice,                                                  color: "#27AE60" },
  ];

  // MC summary
  const last1y = percentiles[percentiles.length - 1];
  const pProfit1y = last1y ? Math.round(100 - (mcLossHorizons.find(h => h.days === 365)?.pLoss || 50)) : null;
  const pProfit3y = last3y ? Math.round(100 - (mcLossHorizons.find(h => h.days === 1095)?.pLoss || 50)) : null;

  // Percentile table rows. `id` lets us highlight the 3y row regardless of language.
  const pctRows = [
    { id: "3m", labelKey: "pro.horizon.3m", pcts: percentiles[Math.min(Math.floor(90 / 5), percentiles.length - 1)], pl: plPrice(a, b, t0 + 90) },
    { id: "6m", labelKey: "pro.horizon.6m", pcts: percentiles[Math.min(Math.floor(182 / 5), percentiles.length - 1)], pl: plPrice(a, b, t0 + 182) },
    { id: "1y", labelKey: "pro.horizon.1y", pcts: last1y, pl: pl1y },
    { id: "2y", labelKey: "pro.horizon.2y", pcts: percentiles3y[Math.min(Math.floor(730 / 5), percentiles3y.length - 1)], pl: pl2y },
    { id: "3y", labelKey: "pro.horizon.3y", pcts: last3y, pl: pl3y },
  ].filter(r => r.pcts);

  // Loss curve. The engine emits English labels; map them to i18n keys
  // by horizon length so the table renders in the active language.
  const horizonKeyByDays = { 30: "pro.horizon.1m", 90: "pro.horizon.3m", 182: "pro.horizon.6m", 365: "pro.horizon.1y", 1095: "pro.horizon.3y" };
  const lossCurve = mcLossHorizons.filter(h => h.days >= 30);

  // Model parameters
  const modelParams = [
    { l: "a (intercept)", v: fmt(a, 2), s: "WLS" },
    { l: "b (slope)", v: fmt(b, 2), s: "WLS" },
    { l: "R²", v: fmt(r2, 3), s: "Weighted" },
    { l: "σ residual", v: fmt(resStd, 2), s: "ln-space" },
    { l: "H (DFA-1)", v: fmt(H, 2), s: "90-day" },
    { l: "λ²", v: fmt(lambda2, 2), s: "Partition fn" },
    { l: "κ global", v: fmt(kappa, 4), s: "OU" },
    { l: "κ calm", v: fmt(ouRegimes.regimes[0]?.kappa, 4), s: "Regime 0" },
    { l: "κ volatile", v: fmt(ouRegimes.regimes[1]?.kappa || kappa, 4), s: "Regime 1" },
    { l: "Vol calm", v: `${fmt(ouRegimes.regimes[0]?.volScale, 2)}x`, s: "Scale" },
    { l: "Vol volatile", v: `${fmt(ouRegimes.regimes[1]?.volScale || 1, 2)}x`, s: "Scale" },
    { l: "EVT cap", v: `+${fmt(evtCap, 2)}σ`, s: "GPD P99.5" },
    { l: "RANSAC a", v: fmt(ransac?.a, 2), s: "Robust" },
    { l: "RANSAC b", v: fmt(ransac?.b, 2), s: "Robust" },
    { l: "RANSAC floor", v: fmt(ransac?.floor, 2), s: "ln-space" },
  ];

  // Helpers
  const gridCols4 = "1fr 1fr 1fr 1fr";
  const tableHead = { fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 8px", borderBottom: `1px solid ${t.border}` };
  const tableCell = { fontFamily: mn, fontSize: 13, color: t.cream, padding: "8px 8px", borderBottom: `1px solid ${t.borderFaint}` };

  return (
    <>
      {/* ── METRICS STRIP ── */}
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
        {metrics.map((m, i) => (
          <div key={m.id} style={{ padding: "18px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none", paddingRight: (i % 2 === 0) ? 24 : 0, paddingLeft: (i % 2 === 1) ? 24 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "flex", alignItems: "center" }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: m.color || t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* ═══ VERDICT ═══ */}
      <CatLabel label={tr("pro.verdict")} />

      <Toggle section="pro" label={tr("pro.longAnswer")} defaultOpen>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(verdict.parasLite || verdict.paras || []).map((p, i) => (
            <p key={i} style={{
              fontFamily: bd, fontSize: 17, fontWeight: 400,
              color: i % 2 === 0 ? t.cream : t.faint,
              lineHeight: 1.7, margin: 0,
            }}>{p}</p>
          ))}
        </div>
      </Toggle>

      <Toggle section="pro" label={tr("pro.driving")} badge={`σ = ${sig.toFixed(2)}`}>
        <DriversPanel verdict={verdict} sig={sig} backtestResults={bt} />
      </Toggle>

      <Toggle section="pro" label={tr("pro.marketRegime")} badge={domRegime.label}>
        <MarketRegime d={d} derived={derived} />
      </Toggle>

      <Toggle section="pro" label={tr("pro.hurstRegime")}>
        <HurstRegime d={d} />
      </Toggle>

      <Toggle section="pro" label={tr("pro.timeToFV")}>
        <TimeToFairValue sig={sig} episode={episode} />
      </Toggle>

      <Toggle section="pro" label={tr("pro.historicalDeviation")}>
        <SigmaChart sigmaChart={sigmaChart} t={t} />
      </Toggle>

      {/* ═══ MODELS ═══ */}
      <CatLabel label={tr("pro.models")} />

      {/* ── Power Law ── */}
      <Toggle section="pro" label={tr("pro.powerLaw")}>
        <PowerLawChart d={d} />

        {/* Key levels */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.keyPriceLevels")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[{ k: "pro.col.level", align: "left" }, { k: "pro.col.price", align: "right" }, { k: "pro.col.fromToday", align: "right" }].map(h => (
                  <th key={h.k} style={{ ...tableHead, textAlign: h.align }}>{tr(h.k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keyLevels.map(lv => (
                <tr key={lv.id} style={lv.id === "current" ? { background: t.bg === "#0D0D0B" ? "rgba(39,174,96,0.08)" : "rgba(39,174,96,0.06)" } : {}}>
                  <td style={{ ...tableCell, fontFamily: bd, fontWeight: lv.id === "current" ? 600 : 400, color: lv.id === "current" ? "#27AE60" : t.cream }}>
                    {lv.id === "current" ? tr("pro.level.currentRow").replace("{sig}", sig.toFixed(2)) : tr(lv.labelKey)}
                  </td>
                  <td style={{ ...tableCell, textAlign: "right", color: lv.color, fontWeight: lv.id === "current" ? 600 : 400 }}>{fmtK(lv.v)}</td>
                  <td style={{ ...tableCell, textAlign: "right", color: t.faint }}>
                    {lv.id !== "current" ? `${((lv.v - S0) / S0 * 100) >= 0 ? "+" : ""}${((lv.v - S0) / S0 * 100).toFixed(0)}%` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Forward projections */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.forwardProjections")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[{ k: "pro.horizon", align: "left" }, { k: "pro.col.fairValue", align: "right", literal: tr("hero.fairValue") }, { k: "pro.col.return", align: "right" }, { k: "pro.col.supportFloor", align: "right", literal: tr("hero.supportFloor") }].map((h, i) => (
                  <th key={i} style={{ ...tableHead, textAlign: h.align }}>{h.literal || tr(h.k)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { id: "1y", labelKey: "pro.horizon.1y", fv: pl1y, sup: supportAt(365) },
                { id: "2y", labelKey: "pro.horizon.2y", fv: pl2y, sup: supportAt(730) },
                { id: "3y", labelKey: "pro.horizon.3y", fv: pl3y, sup: supportAt(1095) },
              ].map(row => (
                <tr key={row.id}>
                  <td style={{ ...tableCell, fontFamily: bd, color: t.cream }}>{tr(row.labelKey)}</td>
                  <td style={{ ...tableCell, textAlign: "right" }}>{fmtK(row.fv)}</td>
                  <td style={{ ...tableCell, textAlign: "right", color: "#27AE60" }}>+{((row.fv - S0) / S0 * 100).toFixed(0)}%</td>
                  <td style={{ ...tableCell, textAlign: "right", color: t.faint }}>{fmtK(row.sup)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Full-screen portal */}
        {setTab && (
          <div onClick={() => { trackChartInteraction("power_law", "fullscreen"); setTab("pl"); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: bd, fontSize: 12, color: t.dim,
            padding: "12px 16px", marginTop: 16, cursor: "pointer",
            border: `1px solid ${t.border}`, borderRadius: 6,
          }}>
            <span style={{ fontSize: 14 }}>↗</span> {tr("pro.openPL")}
          </div>
        )}

        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 12 }}>
          {tr("pro.note.plMethod").replace("{r2}", r2.toFixed(3))}
        </div>
      </Toggle>

      {/* ── Monte Carlo (unified) ── */}
      <Toggle section="pro" label={tr("pro.monteCarlo")}>
        {/* Summary strip */}
        <div className="signal-cards" style={{ borderBottom: `1px solid ${t.border}`, marginBottom: 16 }}>
          {/* 1Y */}
          <div style={{ padding: "0 16px 14px 0", borderRight: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.outcome.1y")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr("pro.median")}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{last1y ? fmtK(last1y.p50) : "–"}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: "#27AE60" }}>{last1y ? `+${((last1y.p50 - S0) / S0 * 100).toFixed(0)}%` : ""}</div>
              </div>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr("pro.profitable")}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: "#27AE60" }}>{pProfit1y != null ? `${pProfit1y}%` : "–"}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>{tr("pro.outcome.ofSimulations")}</div>
              </div>
            </div>
          </div>
          {/* 3Y */}
          <div style={{ padding: "0 0 14px 16px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.outcome.3y")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr("pro.median")}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{last3y ? fmtK(last3y.p50) : "–"}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: "#27AE60" }}>{last3y ? `+${((last3y.p50 - S0) / S0 * 100).toFixed(0)}%` : ""}</div>
              </div>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tr("pro.profitable")}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: "#27AE60" }}>{pProfit3y != null ? `${pProfit3y}%` : "–"}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>{tr("pro.outcome.ofSimulations")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3Y fan chart */}
        <MCChart
          percentiles={percentiles3y}
          plForecast={plForecast3y}
          horizon="3Y"
          stats={[
            { label: tr("pro.bear"), value: fmtK(last3y?.p5) },
            { label: `${tr("pro.median")} (P50)`, value: fmtK(last3y?.p50) },
            { label: tr("pro.bull"), value: fmtK(last3y?.p95) },
            { label: tr("pro.plTarget"), value: fmtK(d.pl3y) },
          ]}
          t={t}
        />

        {/* Percentile table */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.percentileTable")}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr>
                  {[tr("pro.horizon"), tr("pro.bear"), "P25", tr("pro.median"), "P75", tr("pro.bull"), tr("pro.plTarget")].map((h, i) => (
                    <th key={h} style={{ ...tableHead, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pctRows.map(row => (
                  <tr key={row.id}>
                    <td style={{ ...tableCell, fontFamily: bd, color: row.id === "3y" ? t.cream : t.faint, fontWeight: row.id === "3y" ? 600 : 400 }}>{tr(row.labelKey)}</td>
                    <td style={{ ...tableCell, textAlign: "right", color: row.pcts.p5 < S0 ? "#EB5757" : t.cream }}>{fmtK(row.pcts.p5)}</td>
                    <td style={{ ...tableCell, textAlign: "right" }}>{fmtK(row.pcts.p25)}</td>
                    <td style={{ ...tableCell, textAlign: "right", fontWeight: 600 }}>{fmtK(row.pcts.p50)}</td>
                    <td style={{ ...tableCell, textAlign: "right" }}>{fmtK(row.pcts.p75)}</td>
                    <td style={{ ...tableCell, textAlign: "right", color: "#27AE60" }}>{fmtK(row.pcts.p95)}</td>
                    <td style={{ ...tableCell, textAlign: "right", color: t.faint }}>{fmtK(row.pl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loss curve */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{tr("pro.probabilityOfLoss")}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[tr("pro.horizon"), tr("pro.pLoss"), tr("pro.worst5"), tr("pro.median")].map((h, i) => (
                  <th key={h} style={{ ...tableHead, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lossCurve.map(row => (
                <tr key={row.days}>
                  <td style={{ ...tableCell, fontFamily: bd, color: t.faint }}>{horizonKeyByDays[row.days] ? tr(horizonKeyByDays[row.days]) : row.label}</td>
                  <td style={{ ...tableCell, textAlign: "right", color: row.pLoss > 20 ? "#EB5757" : row.pLoss > 10 ? "#F2994A" : "#27AE60" }}>{row.pLoss?.toFixed(0) || "–"}%</td>
                  <td style={{ ...tableCell, textAlign: "right", color: row.p5 < S0 ? "#EB5757" : t.cream }}>{row.p5 ? fmtK(row.p5) : "–"}</td>
                  <td style={{ ...tableCell, textAlign: "right" }}>{row.p50 ? fmtK(row.p50) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Full-screen portal */}
        {setTab && (
          <div onClick={() => { trackChartInteraction("monte_carlo", "fullscreen"); setTab("mc"); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: bd, fontSize: 12, color: t.dim,
            padding: "12px 16px", marginTop: 16, cursor: "pointer",
            border: `1px solid ${t.border}`, borderRadius: 6,
          }}>
            <span style={{ fontSize: 14 }}>↗</span> {tr("pro.openMC")}
          </div>
        )}

        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 12 }}>
          {tr("pro.note.mcMethod")}
        </div>
      </Toggle>

      <Toggle section="pro" label={tr("pro.riskMatrix")}>
        <RiskMatrix d={d} />
      </Toggle>

      <Toggle section="pro" label={tr("pro.modelParams")} badge={tr("common.advanced")}>
        <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {modelParams.map((dm, i) => (
            <div key={dm.l} style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}`, borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 20 : 0, paddingLeft: (i % 2 === 1) ? 20 : 0 }}>
              <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{dm.l}</div>
              <div style={{ fontFamily: mn, fontSize: 15, color: t.cream, fontWeight: 500 }}>{dm.v}</div>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{dm.s}</div>
            </div>
          ))}
        </div>

        {/* Burger comparison */}
        {(() => {
          const LN10 = Math.log(10);
          const a10 = a / LN10;
          const burgerA = -17.016, burgerB = 5.845;
          const deltaA = ((a10 - burgerA) / Math.abs(burgerA) * 100);
          const deltaB = ((b - burgerB) / burgerB * 100);
          const today = t0;
          const ourFV = plPrice(a, b, today);
          const burgerFV = Math.pow(10, burgerA + burgerB * Math.log10(today));
          const fvDelta = ((ourFV - burgerFV) / burgerFV * 100);
          const rows = [
            { id: "intercept", labelKey: "pro.cmp.intercept", burger: burgerA.toFixed(3), ours: a10.toFixed(3), delta: deltaA },
            { id: "slope",     labelKey: "pro.cmp.slope",     burger: burgerB.toFixed(3), ours: b.toFixed(3),    delta: deltaB },
            { id: "r2",        labelKey: "pro.cmp.r2",        burger: "0.931",            ours: fmt(r2, 4),      delta: null },
            { id: "fvToday",   labelKey: "pro.cmp.fvToday",   burger: fmtK(burgerFV),     ours: fmtK(ourFV),     delta: fvDelta },
          ];
          return (
            <div style={{ marginTop: 16, padding: "16px 0", borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                {tr("pro.note.burgerCompare")}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {[{ k: "pro.col.parameter", align: "left" }, { k: "pro.col.burgerOLS", align: "right" }, { k: "pro.col.oursWLS", align: "right" }, { k: "pro.col.deltaWord", align: "right" }].map(h => (
                      <th key={h.k} style={{ padding: "6px 8px", textAlign: h.align, fontFamily: bd, color: t.faint, fontWeight: 500, fontSize: 11 }}>{tr(h.k)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${t.borderFaint}` }}>
                      <td style={{ padding: "8px", fontFamily: bd, color: t.cream, fontWeight: 500 }}>{tr(row.labelKey)}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontFamily: mn, color: t.faint }}>{row.burger}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontFamily: mn, color: t.cream, fontWeight: 600 }}>{row.ours}</td>
                      <td style={{ padding: "8px", textAlign: "right", fontFamily: mn, fontSize: 11, color: row.delta === null ? t.faint : Math.abs(row.delta) < 5 ? "#27AE60" : Math.abs(row.delta) < 15 ? "#F2994A" : "#EB5757" }}>
                        {row.delta !== null ? `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}%` : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Toggle>
    </>
  );
}
