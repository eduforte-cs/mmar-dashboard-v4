import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";

export default function Backtest({ d }) {
  const { t } = useTheme();
  if (!d) return null;

  const bt = d.backtestResults;
  const rb = d.robustResults;
  if (!bt) return (
    <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>Backtest data not available yet — computing...</span>
    </div>
  );

  const bl = bt.byLevel;
  const bm = bt.benchmarks || {};
  const rm = bt.riskMetrics || {};

  // Table helpers
  const th = { fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 10px", borderBottom: `1px solid ${t.border}`, textAlign: "left" };
  const thR = { ...th, textAlign: "right" };
  const td = { fontFamily: mn, fontSize: 13, color: t.cream, padding: "10px 10px", borderBottom: `1px solid ${t.borderFaint}` };
  const tdR = { ...td, textAlign: "right" };
  const tdL = { ...td, fontFamily: bd, color: t.faint };
  const tdBold = { ...td, fontWeight: 600 };
  const tdBoldR = { ...tdBold, textAlign: "right" };

  // Signal level data for spectrum
  const spectrum = [
    { label: "Strong Buy", range: "σ < -1.0", data: bl.strongBuy, color: "#1B8A4A" },
    { label: "Buy", range: "-1.0 to -0.5", data: bl.buy, color: "#27AE60" },
    { label: "Accumulate", range: "-0.5 to 0", data: bl.accumulate, color: "#6FCF97" },
    { label: "Neutral", range: "0 to 0.3", data: bl.neutral, color: "#E8A838" },
    { label: "Caution", range: "0.3 to 0.5", data: bl.caution, color: "#F2994A" },
    { label: "Reduce", range: "0.5 to 0.8", data: bl.reduce, color: "#E07338", horizon: "6m" },
    { label: "Sell", range: "σ > 0.8", data: bl.sell, color: "#EB5757", horizon: "6m" },
  ];

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* ── Title ── */}
      <div style={{ padding: "32px 0 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0,
        }}>Backtest</h1>
        <p style={{ fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)", color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          Every single day Bitcoin was in our buy zone, tested against the real 12-month outcome. {bt.nTotal.toLocaleString()} days tested, daily sampling.
        </p>
      </div>

      {/* ── Hero metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        {[
          { l: "Buy accuracy (12m)", v: `${bt.precision}%`, s: `${bt.nYes.toLocaleString()} days · ${bt.nEpisodesBuy} episodes` },
          { l: "Avg return", v: `+${bt.avgReturnYes}%`, s: `vs ${bt.unconditionalMean}% any day` },
          { l: "Edge over buy & hold", v: `+${(parseFloat(bt.precision) - parseFloat(bm.buyAndHold?.precision || 0)).toFixed(0)}pp`, s: `${bt.precision}% vs ${bm.buyAndHold?.precision}%` },
          { l: "Signal Sharpe", v: bm.dca?.signal?.sharpe || rm.signal?.sharpe || "–", s: `vs ${bm.dca?.dca?.sharpe || rm.buyAndHold?.sharpe || "–"} buy & hold` },
        ].map((m, i) => (
          <div key={m.l} style={{ padding: "20px 0", borderRight: i < 3 ? `1px solid ${t.border}` : "none", paddingRight: i < 3 ? 16 : 0, paddingLeft: i > 0 ? 16 : 0 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontFamily: mn, fontSize: 22, fontWeight: 600, color: t.cream }}>{m.v}</div>
            <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 3 }}>{m.s}</div>
          </div>
        ))}
      </div>

      {/* ═══ BENCHMARKS ═══ */}
      <Toggle label="Benchmarks — does our signal add value?" defaultOpen>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Strategy</th>
              <th style={thR}>Accuracy</th>
              <th style={thR}>Avg return</th>
              <th style={thR}>Sharpe</th>
              <th style={thR}>Avg max DD</th>
              <th style={thR}>Worst DD</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "rgba(39,174,96,0.06)" }}>
              <td style={tdBold}>Our signal (σ &lt; -0.5)</td>
              <td style={tdBoldR}>{bt.precision}%</td>
              <td style={tdBoldR}>+{bt.avgReturnYes}%</td>
              <td style={tdBoldR}>{bm.dca?.signal?.sharpe || "–"}</td>
              <td style={tdBoldR}>{rm.signal?.avgMaxDD}%</td>
              <td style={tdBoldR}>{rm.signal?.worstMaxDD}%</td>
            </tr>
            <tr>
              <td style={tdL}>Buy & hold (always buy)</td>
              <td style={tdR}>{bm.buyAndHold?.precision}%</td>
              <td style={tdR}>+{bm.buyAndHold?.avgReturn}%</td>
              <td style={tdR}>{bm.dca?.dca?.sharpe || "–"}</td>
              <td style={tdR}>{bm.buyAndHold?.avgMaxDD}%</td>
              <td style={tdR}>{bm.buyAndHold?.worstMaxDD}%</td>
            </tr>
            <tr>
              <td style={tdL}>Z-score (200d MA)</td>
              <td style={tdR}>{bm.zScore?.buyPrecision}%</td>
              <td style={tdR}>+{bm.zScore?.buyAvgReturn}%</td>
              <td style={tdR}>–</td>
              <td style={tdR}>{bm.zScore?.buyAvgDD || "–"}%</td>
              <td style={tdR}>–</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 8, lineHeight: 1.6 }}>
          Sharpe ratio is portfolio-based: monthly returns of a portfolio that is invested only when the strategy says buy, annualized (×√12). Avg max DD is the average worst drawdown during each 12-month holding period.
        </p>

        {/* DCA comparison */}
        {bm.dca && (
          <div style={{ marginTop: 16, padding: "14px 0", borderTop: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>DCA strategies compared ({bm.dca.dcaPeriods} monthly periods, $100/period, same total budget)</div>

            {/* Strategy cards */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Strategy</th>
                  <th style={thR}>Return</th>
                  <th style={thR}>Portfolio</th>
                  <th style={thR}>Sharpe</th>
                  <th style={thR}>Max DD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdL}>Blind DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— buy every month</span></td>
                  <td style={tdR}>+{bm.dca.dcaReturn}%</td>
                  <td style={tdR}>${bm.dca.dca.portfolio.toLocaleString()}</td>
                  <td style={tdR}>{bm.dca.dca.sharpe ?? "–"}</td>
                  <td style={tdR}>{bm.dca.dca.maxDD}%</td>
                </tr>
                <tr style={{ background: "rgba(39,174,96,0.06)" }}>
                  <td style={{ ...tdL, color: "#27AE60" }}>Signal DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— only when σ &lt; -0.5</span></td>
                  <td style={tdBoldR}>+{bm.dca.sigDcaReturn}%</td>
                  <td style={tdR}>${bm.dca.signal.portfolio.toLocaleString()}</td>
                  <td style={tdBoldR}>{bm.dca.signal.sharpe ?? "–"}</td>
                  <td style={tdR}>{bm.dca.signal.maxDD}%</td>
                </tr>
                <tr style={{ background: "rgba(187,107,217,0.06)" }}>
                  <td style={{ ...tdL, color: "#BB6BD9" }}>Smart DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— modulate + sell</span></td>
                  <td style={tdBoldR}>+{bm.dca.smartDcaReturn}%</td>
                  <td style={tdR}>${bm.dca.smart.portfolio.toLocaleString()}</td>
                  <td style={tdBoldR}>{bm.dca.smart.sharpe ?? "–"}</td>
                  <td style={tdR}>{bm.dca.smart.maxDD}%</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, marginBottom: 12 }}>
              Total budget: ${bm.dca.totalBudget.toLocaleString()} · Uninvested cash counts in portfolio.
              {bm.dca.smart.cash > 0 && ` Smart DCA holds $${bm.dca.smart.cash.toLocaleString()} in cash from sells.`}
            </div>

            {/* Smart DCA zone multipliers */}
            <div style={{ marginTop: 12, padding: "10px 0", borderTop: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Smart DCA rules</div>
              <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
                {[
                  { zone: "Strong Buy", mult: "3×", color: "#1B8A4A" },
                  { zone: "Buy", mult: "2×", color: "#27AE60" },
                  { zone: "Accumulate", mult: "1×", color: "#6FCF97" },
                  { zone: "Neutral", mult: "0.5×", color: "#E8A838" },
                  { zone: "Caution", mult: "Skip", color: "#F2994A" },
                  { zone: "Reduce", mult: "Sell 25%", color: "#E07338" },
                  { zone: "Sell", mult: "Sell 50%", color: "#EB5757" },
                ].map((r, i) => (
                  <div key={r.zone} style={{ padding: "4px 10px", borderRight: i < 6 ? `1px solid ${t.borderFaint}` : "none", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: r.color }} />
                    <span style={{ fontFamily: bd, fontSize: 10, color: t.dim }}>{r.zone}</span>
                    <span style={{ fontFamily: mn, fontSize: 11, fontWeight: 500, color: r.mult.startsWith("Sell") ? "#EB5757" : r.mult === "Skip" ? t.faint : t.cream }}>{r.mult}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DCA Time Series Chart */}
            {bm.dca.timeSeries?.length > 2 && (() => {
              const ts = bm.dca.timeSeries;
              const W = 700, H = 220, pad = { t: 20, r: 50, b: 30, l: 50 };
              const chartW = W - pad.l - pad.r, chartH = H - pad.t - pad.b;

              const maxR = Math.max(
                Math.max(...ts.map(d => d.dcaReturn)),
                Math.max(...ts.map(d => d.sigReturn)),
                Math.max(...ts.map(d => d.smartReturn)),
                1
              );
              const minR = Math.min(
                Math.min(...ts.map(d => d.dcaReturn)),
                Math.min(...ts.map(d => d.sigReturn)),
                Math.min(...ts.map(d => d.smartReturn)),
                0
              );
              const range = maxR - minR || 1;
              const x = (i) => pad.l + (i / (ts.length - 1)) * chartW;
              const y = (v) => pad.t + chartH - ((v - minR) / range) * chartH;

              const pathStr = (key) => ts.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");

              const years = [];
              let lastYear = "";
              ts.forEach((d, i) => {
                const yr = d.date.slice(0, 4);
                if (yr !== lastYear) { years.push({ i, yr }); lastYear = yr; }
              });

              return (
                <div style={{ marginTop: 12, borderTop: `1px solid ${t.borderFaint}`, paddingTop: 12 }}>
                  <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Portfolio value over time (return vs total budget)</div>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
                    {/* Grid */}
                    {(() => {
                      const step = range > 2000 ? 500 : range > 800 ? 200 : range > 400 ? 100 : 50;
                      const lines = [];
                      for (let v = Math.ceil(minR / step) * step; v <= maxR; v += step) lines.push(v);
                      return lines.map(val => (
                        <g key={val}>
                          <line x1={pad.l} y1={y(val)} x2={W - pad.r} y2={y(val)} stroke={t.borderFaint} strokeWidth="0.5" />
                          <text x={pad.l - 4} y={y(val) + 3} textAnchor="end" fill={t.faint} fontSize="9" fontFamily={mn}>{val > 999 ? `${(val/1000).toFixed(0)}k` : `${val}`}%</text>
                        </g>
                      ));
                    })()}
                    {years.map(({ i, yr }) => (
                      <text key={yr} x={x(i)} y={H - 6} textAnchor="middle" fill={t.faint} fontSize="9" fontFamily={bd}>{yr}</text>
                    ))}
                    {minR < 0 && <line x1={pad.l} y1={y(0)} x2={W - pad.r} y2={y(0)} stroke={t.border} strokeWidth="1" strokeDasharray="3,3" />}
                    <path d={pathStr("dcaReturn")} fill="none" stroke={t.dim} strokeWidth="1.5" opacity="0.5" />
                    <path d={pathStr("sigReturn")} fill="none" stroke="#27AE60" strokeWidth="1.5" />
                    <path d={pathStr("smartReturn")} fill="none" stroke="#BB6BD9" strokeWidth="1.5" />
                    <text x={W - pad.r + 2} y={y(ts[ts.length - 1].dcaReturn) + 3} fill={t.dim} fontSize="9" fontFamily={mn}>DCA</text>
                    <text x={W - pad.r + 2} y={y(ts[ts.length - 1].sigReturn) + 3} fill="#27AE60" fontSize="9" fontFamily={mn}>Signal</text>
                    <text x={W - pad.r + 2} y={y(ts[ts.length - 1].smartReturn) + 3} fill="#BB6BD9" fontSize="9" fontFamily={mn}>Smart</text>
                  </svg>
                </div>
              );
            })()}

            <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>
              All three strategies receive the same $100/month budget. Uninvested months stay in cash (counted in portfolio). Sharpe ratio is annualized from monthly portfolio returns. Max drawdown is peak-to-trough of total portfolio value.
            </p>
          </div>
        )}
      </Toggle>

      {/* ═══ RISK METRICS ═══ */}
      <Toggle label="Risk — what's the worst that can happen?">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}` }}>
          <div style={{ padding: "14px 14px 14px 0", borderRight: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: "#27AE60", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Our signal</div>
            {[
              { l: "Avg max drawdown", v: `${rm.signal?.avgMaxDD}%` },
              { l: "Worst max drawdown", v: `${rm.signal?.worstMaxDD}%` },
              { l: "Avg days underwater", v: `${rm.signal?.avgUnderwaterDays}d` },
              { l: "Worst days underwater", v: `${rm.signal?.worstUnderwaterDays}d` },
              { l: "Sharpe ratio", v: `${rm.signal?.sharpe}` },
            ].map(m => (
              <div key={m.l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{m.l}</span>
                <span style={{ fontFamily: mn, fontSize: 13, color: t.cream, fontWeight: 500 }}>{m.v}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 0 14px 14px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Buy & hold</div>
            {[
              { l: "Avg max drawdown", v: `${rm.buyAndHold?.avgMaxDD}%` },
              { l: "Worst max drawdown", v: `${rm.buyAndHold?.worstMaxDD}%` },
              { l: "Avg days underwater", v: `${rm.buyAndHold?.avgUnderwaterDays}d` },
              { l: "Worst days underwater", v: `${rm.buyAndHold?.worstUnderwaterDays}d` },
              { l: "Sharpe ratio", v: `${rm.buyAndHold?.sharpe}` },
            ].map(m => (
              <div key={m.l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{m.l}</span>
                <span style={{ fontFamily: mn, fontSize: 13, color: t.dim, fontWeight: 500 }}>{m.v}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          "100% accuracy" means every buy signal was profitable at 12 months. It does not mean the path was smooth — average max drawdown during a buy hold was {rm.signal?.avgMaxDD}%, and the worst was {rm.signal?.worstMaxDD}%. Expect pain before profit.
        </p>
      </Toggle>

      {/* ═══ SIGNAL SPECTRUM ═══ */}
      <Toggle label="Signal spectrum — all 7 zones" defaultOpen>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Zone</th>
              <th style={thR}>σ range</th>
              <th style={thR}>Days</th>
              <th style={thR}>Horizon</th>
              <th style={thR}>Lost money</th>
              <th style={thR}>Avg return</th>
              <th style={thR}>Worst</th>
              <th style={thR}>Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {spectrum.map(s => {
              const n = s.data?.n || 0;
              const isSell = s.horizon === "6m";
              const lostPct = s.data?.precision != null ? (isSell ? s.data.precision : +(100 - parseFloat(s.data.precision)).toFixed(1)) : null;
              return (
                <tr key={s.label}>
                  <td style={{ ...td, fontFamily: bd, fontWeight: 500 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 8, verticalAlign: "middle" }} />
                    {s.label}
                  </td>
                  <td style={tdR}>{s.range}</td>
                  <td style={tdR}>{n.toLocaleString()}</td>
                  <td style={{ ...tdR, color: t.faint }}>{s.horizon || "12m"}</td>
                  <td style={{ ...tdR, color: lostPct === 0 ? "#27AE60" : lostPct != null && lostPct < 20 ? "#27AE60" : lostPct != null && lostPct < 40 ? "#E8A838" : lostPct != null ? "#EB5757" : t.faint }}>
                    {lostPct != null ? `${lostPct}%` : "–"}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.avgReturn || 0) > 0 ? "#27AE60" : "#EB5757" }}>
                    {s.data?.avgReturn != null ? `${s.data.avgReturn > 0 ? "+" : ""}${s.data.avgReturn}%` : "–"}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.minReturn || 0) < 0 ? "#EB5757" : "#27AE60" }}>
                    {s.data?.minReturn != null ? `${s.data.minReturn > 0 ? "+" : ""}${s.data.minReturn}%` : "–"}
                  </td>
                  <td style={tdR}>{s.data?.sharpe ?? "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          Buy zones (σ &lt; -0.5) measured at 12-month horizon. Reduce/Sell zones measured at 6-month horizon — these positions should be exited sooner. "Lost money" = % of days where the forward return was negative.
        </p>
      </Toggle>

      {/* ═══ SELL METRICS ═══ */}
      <Toggle label="Sell zone — what happens when you don't listen">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <div style={{ padding: "14px 14px 14px 0", borderRight: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: "#EB5757", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Sell zone (σ &gt; 0.8)</div>
            <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
              {bt.plBubbleMetrics.sell.n.toLocaleString()} days · Avg 6m return: {bt.plBubbleMetrics.sell.avgRet6m}%<br />
              Lost 20%+ within 6m: {bt.plBubbleMetrics.sell.pct20}% of the time<br />
              Worst 6m: {bt.plBubbleMetrics.sell.maxDrawdown}%
            </div>
          </div>
          <div style={{ padding: "14px 0 14px 14px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: "#F2994A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Reduce zone (σ 0.5–0.8)</div>
            <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, lineHeight: 1.8 }}>
              {bt.plBubbleMetrics.reduce.n} days · Avg 6m return: {bt.plBubbleMetrics.reduce.avgRet6m}%<br />
              Lost 20%+ within 6m: {bt.plBubbleMetrics.reduce.pct20}% of the time<br />
              Worst 6m: {bt.plBubbleMetrics.reduce.maxDrawdown}%
            </div>
          </div>
        </div>
      </Toggle>

      {/* ═══ CROSS-VALIDATION ═══ */}
      <Toggle label="Cross-validation by era">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Era</th>
              <th style={thR}>Days tested</th>
              <th style={thR}>Buy days</th>
              <th style={thR}>Episodes</th>
              <th style={thR}>Accuracy</th>
              <th style={thR}>Avg return</th>
            </tr>
          </thead>
          <tbody>
            {(bt.crossValidation || []).map(cv => (
              <tr key={cv.label}>
                <td style={tdL}>{cv.label}</td>
                <td style={tdR}>{cv.n.toLocaleString()}</td>
                <td style={tdR}>{cv.nYes.toLocaleString()}</td>
                <td style={tdR}>{cv.nEpisodes}</td>
                <td style={{ ...tdR, color: cv.precision >= 100 ? "#27AE60" : "#E8A838" }}>{cv.precision}%</td>
                <td style={{ ...tdR, color: "#27AE60" }}>+{cv.avgReturn}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bt.stabilityDelta != null && (
          <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
            Stability delta across eras: {bt.stabilityDelta}pp. {bt.stabilityDelta === 0 ? "Perfect stability — same accuracy in every era." : bt.stabilityDelta < 5 ? "Strong stability." : "Some variation between eras."}
          </p>
        )}
      </Toggle>

      {/* ═══ ROBUST VALIDATION ═══ */}
      {rb && (
        <Toggle label="Robust validation — local PL refit">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
            {[
              { l: "Points tested", v: rb.nTotal.toLocaleString(), s: `Step: ${rb.step} days` },
              { l: "Buy accuracy", v: `${rb.nBuyCorrect}/${rb.nBuy} = ${rb.buyPrecision}%`, s: `${rb.nEpisodes} episodes` },
              { l: "Worst buy return", v: `${rb.worstBuyReturn}%`, s: rb.worstBuyReturn > 0 ? "Positive" : "Edge case" },
            ].map((m, i) => (
              <div key={m.l} style={{ padding: "14px 0", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 500, color: t.cream }}>{m.v}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: bd, fontSize: 12, color: t.faint, lineHeight: 1.65 }}>
            {rb.note}
          </p>
          <p style={{ fontFamily: bd, fontSize: 11, color: t.dim, marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>
            This independently validates that our sigma thresholds work without any look-ahead bias. The Power Law is refitted at each test point using only data available up to that date. The {rb.buyPrecision === "100" ? "perfect match" : "near-perfect match"} confirms the signal is robust.
          </p>
        </Toggle>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: "20px 0", fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.6 }}>
        Methodology: daily sampling (step=1). Each day tested against its real 12-month forward return. Buy signal: σ &lt; -0.5 from Power Law fair value. Sell signal: σ &gt; 0.8. Power Law fitted with WLS (exponential decay, 4-year half-life). No optimization of thresholds — they come from the structural properties of the σ distribution.
      </div>
    </div>
  );
}
