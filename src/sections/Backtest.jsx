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
    { label: "Reduce", range: "0.5 to 0.8", data: { n: bt.nReduce, precision: null, avgReturn: null }, color: "#E07338" },
    { label: "Sell", range: "σ > 0.8", data: { n: bt.nSell, precision: null, avgReturn: null }, color: "#EB5757" },
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
          { l: "Signal Sharpe", v: rm.signal?.sharpe || "–", s: `vs ${rm.buyAndHold?.sharpe || "–"} buy & hold` },
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
              <td style={tdBoldR}>{rm.signal?.sharpe || "–"}</td>
              <td style={tdBoldR}>{rm.signal?.avgMaxDD}%</td>
              <td style={tdBoldR}>{rm.signal?.worstMaxDD}%</td>
            </tr>
            <tr>
              <td style={tdL}>Buy & hold (always buy)</td>
              <td style={tdR}>{bm.buyAndHold?.precision}%</td>
              <td style={tdR}>+{bm.buyAndHold?.avgReturn}%</td>
              <td style={tdR}>{bm.buyAndHold?.sharpe || "–"}</td>
              <td style={tdR}>{bm.buyAndHold?.avgMaxDD}%</td>
              <td style={tdR}>{bm.buyAndHold?.worstMaxDD}%</td>
            </tr>
            <tr>
              <td style={tdL}>Z-score (200d MA)</td>
              <td style={tdR}>{bm.zScore?.buyPrecision}%</td>
              <td style={tdR}>+{bm.zScore?.buyAvgReturn}%</td>
              <td style={tdR}>{bm.zScore?.buySharpe || "–"}</td>
              <td style={tdR}>{bm.zScore?.buyAvgDD || "–"}%</td>
              <td style={tdR}>–</td>
            </tr>
          </tbody>
        </table>

        {/* DCA comparison */}
        {bm.dca && (
          <div style={{ marginTop: 16, padding: "14px 0", borderTop: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>DCA comparison (${bm.dca.dcaPeriods} periods)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ padding: "10px 14px 10px 0", borderRight: `1px solid ${t.borderFaint}` }}>
                <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 4 }}>Blind DCA (every month)</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>+{bm.dca.dcaReturn}%</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>${bm.dca.dcaInvested.toLocaleString()} → ${bm.dca.dcaValue.toLocaleString()}</div>
              </div>
              <div style={{ padding: "10px 0 10px 14px" }}>
                <div style={{ fontFamily: bd, fontSize: 11, color: "#27AE60", marginBottom: 4 }}>Signal DCA (only when σ &lt; -0.5)</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: "#27AE60" }}>+{bm.dca.sigDcaReturn}%</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>${bm.dca.sigInvested.toLocaleString()} → ${bm.dca.sigValue.toLocaleString()}</div>
              </div>
            </div>
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
              <th style={thR}>Accuracy</th>
              <th style={thR}>Avg return</th>
              <th style={thR}>Worst</th>
              <th style={thR}>Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {spectrum.map(s => {
              const n = s.data?.n || 0;
              return (
                <tr key={s.label}>
                  <td style={{ ...td, fontFamily: bd, fontWeight: 500 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 8, verticalAlign: "middle" }} />
                    {s.label}
                  </td>
                  <td style={tdR}>{s.range}</td>
                  <td style={tdR}>{n.toLocaleString()}</td>
                  <td style={{ ...tdR, color: s.data?.precision >= 90 ? "#27AE60" : s.data?.precision >= 70 ? "#E8A838" : s.data?.precision != null ? "#EB5757" : t.faint }}>
                    {s.data?.precision != null ? `${s.data.precision}%` : "–"}
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
          Signal uses pure σ thresholds: buy at σ &lt; -0.5, sell at σ ≥ 0.8. Each day is tested independently against its 12-month forward return. Methodology: hold for exactly 365 days from entry.
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
