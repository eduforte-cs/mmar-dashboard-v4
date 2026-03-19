import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK, fmt } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";
import Toggle from "../components/Toggle";
import CatLabel from "../components/CatLabel";
import DriversPanel from "./pro/DriversPanel";
import TimeToFairValue from "./pro/TimeToFairValue";
import MarketRegime from "./pro/MarketRegime";
import HurstRegime from "./pro/HurstRegime";
import { KeyLevels, ForwardProjections, RiskMatrix } from "./pro/DataTables";
import { MCChart, SigmaChart, MCHorizonTable } from "./pro/Charts";
import PowerLawChart from "./pro/PowerLawChart";
import ValidationPanel from "./pro/ValidationPanel";

function TextPlaceholder({ text }) {
  const { t } = useTheme();
  return <p style={{ fontFamily: bd, fontSize: 16, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>{text}</p>;
}

export default function Pro({ d, derived }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { H, lambda2, sigmaFromPL: sig, ouRegimes, r2, resMean, resStd, resFloor,
    ransac, evtCap, kappa, halfLife, annualVol, S0, a, b, t0,
    backtestResults, percentiles, percentiles3y, sigmaChart,
  } = d;
  const { verdict, domRegime, mcLossHorizons, supportPrice, udRatio, episode } = derived;

  // Compute PL forecast data for MC charts
  const plForecast365 = Array.from({ length: 74 }, (_, i) => ({ t: i * 5, pl: +plPrice(a, b, t0 + i * 5).toFixed(0) }));
  const plForecast3y = Array.from({ length: Math.ceil(365 * 3 / 5) + 1 }, (_, i) => ({ t: i * 5, pl: +plPrice(a, b, t0 + i * 5).toFixed(0) }));
  const last = percentiles[percentiles.length - 1];
  const last3y = percentiles3y[percentiles3y.length - 1];

  // Metrics strip
  const metrics = [
    { l: "Hurst (90d)", v: H.toFixed(2), s: H > 0.55 ? "Persistent" : "Mean-reverting" },
    { l: "λ² multifractal", v: lambda2.toFixed(2), s: "Partition fn" },
    { l: "Buy score", v: verdict.buyScore.toFixed(2), s: `Threshold ${(backtestResults?.scoringParams?.strongThresh || 1).toFixed(2)}` },
    { l: "Regime", v: domRegime.label.split(" ")[0], s: `${domRegime.score}/7 conditions` },
  ];

  // Temperature
  const tempLabel = Math.abs(sig) > 1.5 ? "Hot" : sig > 0.5 ? "Warm" : sig < -0.5 ? "Cool" : "Neutral";

  // MC loss display
  const mcLossDisplay = mcLossHorizons.filter(h => h.days >= 90);

  // PL bands at 1Y
  const pl1y = plPrice(a, b, t0 + 365);
  const plBands = [
    { l: "Bubble zone", v: fmtK(Math.exp(Math.log(pl1y) + resMean + 2 * resStd)), pct: `+${((Math.exp(Math.log(pl1y) + resMean + 2 * resStd) - S0) / S0 * 100).toFixed(0)}%` },
    { l: "Cycle ceiling", v: fmtK(Math.exp(Math.log(pl1y) + resMean + resStd)), pct: `+${((Math.exp(Math.log(pl1y) + resMean + resStd) - S0) / S0 * 100).toFixed(0)}%` },
    { l: "Fair value", v: fmtK(pl1y), pct: `${((pl1y - S0) / S0 * 100) >= 0 ? "+" : ""}${((pl1y - S0) / S0 * 100).toFixed(0)}%` },
    { l: "Mild discount", v: fmtK(Math.exp(Math.log(pl1y) + resMean - 0.5 * resStd)), pct: `${((Math.exp(Math.log(pl1y) + resMean - 0.5 * resStd) - S0) / S0 * 100).toFixed(0)}%` },
    { l: "Support floor", v: fmtK(ransac ? Math.exp(ransac.a + ransac.b * Math.log(t0 + 365) + ransac.floor) : supportPrice), pct: `${((supportPrice - S0) / S0 * 100).toFixed(0)}%` },
  ];

  // Backtest stats
  const bt = backtestResults;
  const btMetrics = bt ? [
    { l: "Buy accuracy", v: `${bt.precision || "–"}%`, s: `${bt.nYes} buy signals` },
    { l: "Avg return buy", v: `+${bt.avgReturnYes || "–"}%`, s: "12m horizon" },
    { l: "Return hold", v: `${bt.avgReturnHold >= 0 ? "+" : ""}${bt.avgReturnHold || "–"}%`, s: `${bt.nNo} hold periods` },
    { l: "Return sell", v: `${bt.avgReturnSell || "–"}%`, s: "6m after sell signal" },
  ] : [];

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

  return (
    <>
      {/* ── METRICS STRIP ── */}
      <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
        {metrics.map((m, i) => (
          <div key={m.l} style={{ padding: "18px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none", paddingRight: (i % 2 === 0) ? 24 : 0, paddingLeft: (i % 2 === 1) ? 24 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* ═══ VERDICT ═══ */}
      <CatLabel label="Verdict" />

      <Toggle label="The short answer" badge={verdict.subtitle} defaultOpen>
        <div className="inner-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, marginBottom: 24 }}>
          {verdict.horizonCards.map((c, i) => (
            <div key={c.horizon} style={{ padding: "20px 0", borderBottom: i === 0 ? `1px solid ${t.borderFaint}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <div>
                  <span style={{ fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.horizon}</span>
                  <span style={{ fontFamily: bd, fontSize: 30, fontWeight: 700, color: t.cream, marginLeft: 14, letterSpacing: "-0.03em" }}>{fmtK(c.plTarget)}</span>
                  <span style={{ fontFamily: mn, fontSize: 13, color: t.dim, marginLeft: 8 }}>{c.plReturn >= 0 ? "+" : ""}{c.plReturn.toFixed(0)}%</span>
                </div>
                <span style={{ fontFamily: bd, fontSize: 11, color: t.dim }}>{c.verdict}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                {[{ l: "Profit", v: `${c.pProfit.toFixed(0)}%` }, { l: "Loss", v: `${c.pLoss.toFixed(0)}%` }, { l: "Reaches FV", v: `${c.pFairValue.toFixed(0)}%` }, { l: "Worst case", v: fmtK(c.worstCase) }].map((s, j) => (
                  <div key={s.l} style={{ paddingRight: j < 3 ? 14 : 0, borderRight: j < 3 ? `1px solid ${t.borderFaint}` : "none", paddingLeft: j > 0 ? 14 : 0 }}>
                    <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
                    <div style={{ fontFamily: mn, fontSize: 15, color: t.cream, fontWeight: 500, marginTop: 2 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Backtest summary */}
        {bt && (
          <div style={{ padding: "14px 0", borderTop: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Walk-forward backtest</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: t.dim, lineHeight: 1.8 }}>
              Precision: {bt.precision}% · Avg return buy: +{bt.avgReturnYes}% · Hold: {bt.avgReturnHold >= 0 ? "+" : ""}{bt.avgReturnHold}% · n={bt.nYes + bt.nNo}
            </div>
          </div>
        )}
      </Toggle>

      <Toggle label="What's driving this" badge={verdict.buyScore.toFixed(2)}>
        <DriversPanel verdict={verdict} sig={sig} backtestResults={bt} />
      </Toggle>

      <Toggle label="The long answer" section="Narrative" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {verdict.paras.map((p, i) => (
            <p key={i} style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>{p}</p>
          ))}
          <p style={{ fontFamily: bd, fontSize: 12, color: t.faint, fontStyle: "italic", marginTop: 8 }}>
            Generated dynamically from Power Law + MMAR + Monte Carlo. Walk-forward validated.
          </p>
        </div>
      </Toggle>

      <Toggle label="Has this worked in the past?">
        <ValidationPanel bt={bt} calibratedWeights={d.calibratedWeights} />
      </Toggle>

      {/* ═══ MARKET ═══ */}
      <CatLabel label="Market" />

      <Toggle label="Live snapshot" badge="Live" defaultOpen>
        <div className="data-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 20 }}>
          {[
            { l: "Risk / Reward (1Y)", v: `${udRatio.toFixed(1)}x`, s: udRatio > 2 ? "Favorable asymmetry" : "Neutral" },
            { l: "Market temperature", v: tempLabel, s: `${sig >= 0 ? "Above" : "Below"} fair value zone` },
          ].map((dm, i) => (
            <div key={dm.l} style={{ padding: "14px 0", borderBottom: i === 0 ? `1px solid ${t.borderFaint}` : "none" }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{dm.l}</div>
              <div style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>{dm.v}</div>
              <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 2 }}>{dm.s}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Power Law — 1 Year Forward</div>
        {plBands.map(lv => (
          <div key={lv.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <span style={{ fontFamily: bd, fontSize: 13, color: t.cream, fontWeight: 400 }}>{lv.l}</span>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontFamily: mn, fontSize: 13, color: t.cream, fontWeight: 500 }}>{lv.v}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint, width: 48, textAlign: "right" }}>{lv.pct}</span>
            </div>
          </div>
        ))}
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 24, marginBottom: 10 }}>Probability of loss — Monte Carlo</div>
        {mcLossDisplay.map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <span style={{ fontFamily: bd, fontSize: 13, color: t.dim }}>{r.label}</span>
            <span style={{ fontFamily: mn, fontSize: 13, color: t.cream, fontWeight: 500 }}>{r.pLoss?.toFixed(0) || "–"}%</span>
          </div>
        ))}
      </Toggle>

      <Toggle label="Market Regime" badge={domRegime.label.split(" ")[0]}>
        <MarketRegime d={d} derived={derived} />
      </Toggle>

      <Toggle label="Hurst Regime — Trend Persistence">
        <HurstRegime d={d} />
      </Toggle>

      <Toggle label="Time to Fair Value">
        <TimeToFairValue sig={sig} episode={episode} />
      </Toggle>

      <Toggle label="Historical Deviation">
        <SigmaChart sigmaChart={sigmaChart} t={t} />
      </Toggle>

      {/* ═══ MODELS ═══ */}
      <CatLabel label="Models" />

      <Toggle label="Power Law Model">
        <PowerLawChart d={d} />
      </Toggle>

      <Toggle label="Key Price Levels">
        <KeyLevels d={d} />
      </Toggle>

      <Toggle label="Power Law — Forward Projections">
        <ForwardProjections d={d} />
      </Toggle>

      <Toggle label="Monte Carlo — 1 Year">
        <MCChart
          percentiles={percentiles}
          plForecast={plForecast365}
          horizon="1Y"
          stats={[
            { label: "Bear (P5)", value: fmtK(last?.p5) },
            { label: "Base (P50)", value: fmtK(last?.p50) },
            { label: "Bull (P95)", value: fmtK(last?.p95) },
            { label: "PL target", value: fmtK(d.pl1y) },
          ]}
          t={t}
        />
        <div style={{ marginTop: 16 }}>
          <MCHorizonTable d={d} t={t} />
        </div>
      </Toggle>

      <Toggle label="Monte Carlo — 3 Years">
        <MCChart
          percentiles={percentiles3y}
          plForecast={plForecast3y}
          horizon="3Y"
          stats={[
            { label: "Bear (P5)", value: fmtK(last3y?.p5) },
            { label: "Base (P50)", value: fmtK(last3y?.p50) },
            { label: "Bull (P95)", value: fmtK(last3y?.p95) },
            { label: "PL target", value: fmtK(d.pl3y) },
          ]}
          t={t}
        />
      </Toggle>

      <Toggle label="Risk Matrix — PL vs Monte Carlo">
        <RiskMatrix d={d} />
      </Toggle>

      <Toggle label="Model Parameters" badge="advanced">
        <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {modelParams.map((dm, i) => (
            <div key={dm.l} style={{ padding: "12px 0", borderBottom: `1px solid ${t.borderFaint}`, borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 20 : 0, paddingLeft: (i % 2 === 1) ? 20 : 0 }}>
              <div style={{ fontFamily: bd, fontSize: 8, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{dm.l}</div>
              <div style={{ fontFamily: mn, fontSize: 15, color: t.cream, fontWeight: 500 }}>{dm.v}</div>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, marginTop: 1 }}>{dm.s}</div>
            </div>
          ))}
        </div>
      </Toggle>
    </>
  );
}
