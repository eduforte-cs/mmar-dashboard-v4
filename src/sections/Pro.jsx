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
import { RiskMatrix } from "./pro/DataTables";
import { MCChart, SigmaChart, MCHorizonTable } from "./pro/Charts";
import PowerLawChart from "./pro/PowerLawChart";

export default function Pro({ d, derived, setTab }) {
  const { t } = useTheme();
  if (!d || !derived) return null;

  const { H, lambda2, sigmaFromPL: sig, ouRegimes, r2, resMean, resStd, resFloor,
    ransac, evtCap, kappa, halfLife, annualVol, S0, a, b, t0,
    backtestResults, percentiles, percentiles3y, sigmaChart,
  } = d;
  const { verdict, domRegime, mcLossHorizons, supportPrice, episode } = derived;

  const bt = backtestResults;

  // PL forecast data
  const plForecast3y = Array.from({ length: Math.ceil(365 * 3 / 5) + 1 }, (_, i) => ({ t: i * 5, pl: +plPrice(a, b, t0 + i * 5).toFixed(0) }));
  const last3y = percentiles3y[percentiles3y.length - 1];

  // Metrics strip
  const metrics = [
    { l: "Hurst (90d)", v: H.toFixed(2), s: H > 0.55 ? "Persistent" : "Mean-reverting" },
    { l: "λ² multifractal", v: lambda2.toFixed(2), s: "Partition fn" },
    { l: "Signal", v: verdict.subtitle, s: `σ = ${sig.toFixed(2)}`, color: verdict.subtitleColor },
    { l: "Regime", v: domRegime.label, s: domRegime.zone || "", color: domRegime.zone === "Buy" || domRegime.zone === "Strong Buy" ? "#27AE60" : domRegime.zone === "Sell" ? "#EB5757" : domRegime.zone === "Reduce" ? "#F2994A" : t.cream },
  ];

  // Key price levels
  const pl1y = plPrice(a, b, t0 + 365);
  const pl2y = plPrice(a, b, t0 + 730);
  const pl3y = plPrice(a, b, t0 + 1095);
  const supportAt = (days) => ransac ? Math.exp(ransac.a + ransac.b * Math.log(t0 + days) + ransac.floor) : supportPrice;
  const keyLevels = [
    { l: "Bubble zone (+2σ)", v: Math.exp(Math.log(plPrice(a, b, t0)) + resMean + 2 * resStd), color: "#EB5757" },
    { l: "Cycle ceiling (+1σ)", v: Math.exp(Math.log(plPrice(a, b, t0)) + resMean + resStd), color: "#F2994A" },
    { l: "Fair value", v: plPrice(a, b, t0), color: t.cream },
    { l: "current", v: S0, color: "#27AE60" },
    { l: "Support floor", v: supportPrice, color: "#27AE60" },
  ];

  // MC summary
  const last1y = percentiles[percentiles.length - 1];
  const pProfit1y = last1y ? Math.round(100 - (mcLossHorizons.find(h => h.days === 365)?.pLoss || 50)) : null;
  const pProfit3y = last3y ? Math.round(100 - (mcLossHorizons.find(h => h.days === 1095)?.pLoss || 50)) : null;

  // Percentile table rows
  const pctRows = [
    { label: "3 months", pcts: percentiles[Math.min(Math.floor(90 / 5), percentiles.length - 1)], pl: plPrice(a, b, t0 + 90) },
    { label: "6 months", pcts: percentiles[Math.min(Math.floor(182 / 5), percentiles.length - 1)], pl: plPrice(a, b, t0 + 182) },
    { label: "1 year", pcts: last1y, pl: pl1y },
    { label: "2 years", pcts: percentiles3y[Math.min(Math.floor(730 / 5), percentiles3y.length - 1)], pl: pl2y },
    { label: "3 years", pcts: last3y, pl: pl3y },
  ].filter(r => r.pcts);

  // Loss curve
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
          <div key={m.l} style={{ padding: "18px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.border}` : "none", paddingRight: (i % 2 === 0) ? 24 : 0, paddingLeft: (i % 2 === 1) ? 24 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: m.color || t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* ═══ VERDICT ═══ */}
      <CatLabel label="Verdict" />

      <Toggle label="The long answer" defaultOpen>
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

      <Toggle label="What's driving this" badge={`σ = ${sig.toFixed(2)}`}>
        <DriversPanel verdict={verdict} sig={sig} backtestResults={bt} />
      </Toggle>

      <Toggle label="Market Regime" badge={domRegime.label}>
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

      {/* ── Power Law ── */}
      <Toggle label="Power Law">
        <PowerLawChart d={d} />

        {/* Key levels */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Key price levels</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Level", "Price", "From today"].map(h => (
                  <th key={h} style={{ ...tableHead, textAlign: h === "Level" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keyLevels.map(lv => (
                <tr key={lv.l} style={lv.l === "current" ? { background: t.bg === "#0D0D0B" ? "rgba(39,174,96,0.08)" : "rgba(39,174,96,0.06)" } : {}}>
                  <td style={{ ...tableCell, fontFamily: bd, fontWeight: lv.l === "current" ? 600 : 400, color: lv.l === "current" ? "#27AE60" : t.cream }}>
                    {lv.l === "current" ? `→ Current price (σ ${sig.toFixed(2)})` : lv.l}
                  </td>
                  <td style={{ ...tableCell, textAlign: "right", color: lv.color, fontWeight: lv.l === "current" ? 600 : 400 }}>{fmtK(lv.v)}</td>
                  <td style={{ ...tableCell, textAlign: "right", color: t.faint }}>
                    {lv.l !== "current" ? `${((lv.v - S0) / S0 * 100) >= 0 ? "+" : ""}${((lv.v - S0) / S0 * 100).toFixed(0)}%` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Forward projections */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Forward projections</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Horizon", "Fair value", "Return", "Support floor"].map(h => (
                  <th key={h} style={{ ...tableHead, textAlign: h === "Horizon" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "1 year", fv: pl1y, sup: supportAt(365) },
                { label: "2 years", fv: pl2y, sup: supportAt(730) },
                { label: "3 years", fv: pl3y, sup: supportAt(1095) },
              ].map(row => (
                <tr key={row.label}>
                  <td style={{ ...tableCell, fontFamily: bd, color: t.cream }}>{row.label}</td>
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
          <div onClick={() => setTab("pl")} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: bd, fontSize: 12, color: t.dim,
            padding: "12px 16px", marginTop: 16, cursor: "pointer",
            border: `1px solid ${t.border}`, borderRadius: 6,
          }}>
            <span style={{ fontSize: 14 }}>↗</span> Open full-screen Power Law view
          </div>
        )}

        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 12 }}>
          WLS with exponential decay (4-year half-life) · RANSAC for support floor · R² = {r2.toFixed(3)}
        </div>
      </Toggle>

      {/* ── Monte Carlo (unified) ── */}
      <Toggle label="Monte Carlo">
        {/* Summary strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}`, marginBottom: 16 }}>
          {/* 1Y */}
          <div style={{ padding: "0 16px 14px 0", borderRight: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>1 year outcome</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Median</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{last1y ? fmtK(last1y.p50) : "–"}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: "#27AE60" }}>{last1y ? `+${((last1y.p50 - S0) / S0 * 100).toFixed(0)}%` : ""}</div>
              </div>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Profitable</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: "#27AE60" }}>{pProfit1y != null ? `${pProfit1y}%` : "–"}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>of simulations</div>
              </div>
            </div>
          </div>
          {/* 3Y */}
          <div style={{ padding: "0 0 14px 16px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>3 year outcome</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Median</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{last3y ? fmtK(last3y.p50) : "–"}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: "#27AE60" }}>{last3y ? `+${((last3y.p50 - S0) / S0 * 100).toFixed(0)}%` : ""}</div>
              </div>
              <div>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Profitable</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: "#27AE60" }}>{pProfit3y != null ? `${pProfit3y}%` : "–"}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint }}>of simulations</div>
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
            { label: "Bear (P5)", value: fmtK(last3y?.p5) },
            { label: "Base (P50)", value: fmtK(last3y?.p50) },
            { label: "Bull (P95)", value: fmtK(last3y?.p95) },
            { label: "PL target", value: fmtK(d.pl3y) },
          ]}
          t={t}
        />

        {/* Percentile table */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Percentile table</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr>
                  {["Horizon", "Bear (P5)", "P25", "Median", "P75", "Bull (P95)", "PL target"].map((h, i) => (
                    <th key={h} style={{ ...tableHead, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pctRows.map(row => (
                  <tr key={row.label}>
                    <td style={{ ...tableCell, fontFamily: bd, color: row.label === "3 years" ? t.cream : t.faint, fontWeight: row.label === "3 years" ? 600 : 400 }}>{row.label}</td>
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
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Probability of loss</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Horizon", "P(loss)", "Worst 5%", "Median"].map((h, i) => (
                  <th key={h} style={{ ...tableHead, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lossCurve.map(row => (
                <tr key={row.label}>
                  <td style={{ ...tableCell, fontFamily: bd, color: t.faint }}>{row.label}</td>
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
          <div onClick={() => setTab("mc")} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: bd, fontSize: 12, color: t.dim,
            padding: "12px 16px", marginTop: 16, cursor: "pointer",
            border: `1px solid ${t.border}`, borderRadius: 6,
          }}>
            <span style={{ fontSize: 14 }}>↗</span> Open full-screen Monte Carlo view
          </div>
        )}

        <div style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "12px 0", borderTop: `1px solid ${t.borderFaint}`, marginTop: 12 }}>
          2,000 paths · MMAR/Hurst dynamics · Empirical shock resampling · Reflective floor at RANSAC support
        </div>
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
            { param: "Intercept (a)", burger: burgerA.toFixed(3), ours: a10.toFixed(3), delta: deltaA },
            { param: "Slope (b)", burger: burgerB.toFixed(3), ours: b.toFixed(3), delta: deltaB },
            { param: "R²", burger: "0.931", ours: fmt(r2, 4), delta: null },
            { param: "Fair value today", burger: fmtK(burgerFV), ours: fmtK(ourFV), delta: fvDelta },
          ];
          return (
            <div style={{ marginTop: 16, padding: "16px 0", borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Comparison with Burger / Santostasi (OLS, log₁₀)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {["Parameter", "Burger (OLS)", "Ours (WLS)", "Delta"].map(h => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: h === "Parameter" ? "left" : "right", fontFamily: bd, color: t.faint, fontWeight: 500, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.param} style={{ borderBottom: `1px solid ${t.borderFaint}` }}>
                      <td style={{ padding: "8px", fontFamily: bd, color: t.cream, fontWeight: 500 }}>{row.param}</td>
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
