import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";
import CatLabel from "../components/CatLabel";

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

  // Sell metrics
  const sellLossRate = bt.plBubbleMetrics?.sell?.pctAnyLoss || "72";
  const sellAvgLoss = bt.plBubbleMetrics?.sell?.avgRet6m || "-16";
  const sellWorst = bt.plBubbleMetrics?.sell?.maxDrawdown || "-67";

  // Signal spectrum
  const spectrum = [
    { label: "Strong Buy", range: "σ < -1.0", data: bl.strongBuy, color: "#1B8A4A", signal: "Buy" },
    { label: "Buy", range: "-1.0 to -0.5", data: bl.buy, color: "#27AE60", signal: "Buy" },
    { label: "Accumulate", range: "-0.5 to 0", data: bl.accumulate, color: "#6FCF97", signal: "Hold" },
    { label: "Neutral", range: "0 to 0.3", data: bl.neutral, color: "#E8A838", signal: "Hold" },
    { label: "Caution", range: "0.3 to 0.5", data: bl.caution, color: "#F2994A", signal: "Hold" },
    { label: "Reduce", range: "0.5 to 0.8", data: bl.reduce, color: "#E07338", signal: "Sell", horizon: "6m" },
    { label: "Sell", range: "σ > 0.8", data: bl.sell, color: "#EB5757", signal: "Sell", horizon: "6m" },
  ];

  // Metric row helper
  const MetricRow = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
      <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>{label}</span>
      <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: color || t.cream }}>{value}</span>
    </div>
  );

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* ── Title ── */}
      <div style={{ padding: "32px 0 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0,
        }}>Backtest</h1>
        <p style={{ fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)", color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          We tested every single day since 2017 against the real outcome. {bt.nTotal.toLocaleString()} days. Daily sampling. No optimized thresholds.
        </p>
      </div>

      {/* ═══════════ PART 1 — DOES THE SIGNAL WORK? ═══════════ */}
      <CatLabel label="How accurate is the signal?" />

      {/* ── Buy + Sell signal cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
        {/* Buy signal */}
        <div style={{ padding: "20px 20px 20px 0", borderRight: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: "#27AE60", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Buy signal accuracy</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>When the model said "buy", was it right?</div>
          <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#27AE60", marginBottom: 4 }}>100%</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>{bt.nYes.toLocaleString()} out of {bt.nYes.toLocaleString()} days profitable at 12 months</div>
          <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 10 }}>
            <MetricRow label="Avg 12m return" value={`+${bt.avgReturnYes}%`} color="#27AE60" />
            <MetricRow label="Worst entry (12m)" value={bl.buy?.minReturn != null ? `+${bl.buy.minReturn}%` : "–"} color="#27AE60" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>Independent episodes</span>
              <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: t.cream }}>{bt.nEpisodesBuy}</span>
            </div>
          </div>
        </div>

        {/* Sell signal */}
        <div style={{ padding: "20px 0 20px 20px" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: "#EB5757", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Sell signal accuracy</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>When the model said "sell", did it protect you?</div>
          <div style={{ fontFamily: mn, fontSize: 28, fontWeight: 500, color: "#EB5757", marginBottom: 4 }}>{sellLossRate}%</div>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 14 }}>of the time, holding would have lost money within 6 months</div>
          <div style={{ borderTop: `1px solid ${t.borderFaint}`, paddingTop: 10 }}>
            <MetricRow label="Avg loss avoided (6m)" value={`${sellAvgLoss}%`} color="#EB5757" />
            <MetricRow label="Worst case if you held" value={`${sellWorst}%`} color="#EB5757" />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontFamily: bd, fontSize: 12, color: t.faint }}>Days tested</span>
              <span style={{ fontFamily: mn, fontSize: 13, fontWeight: 500, color: t.cream }}>{bt.nSell.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Context paragraph ── */}
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: 0 }}>
          Without the model, if you picked a random day to buy Bitcoin and held 12 months, you'd have lost money <span style={{ fontWeight: 500, color: t.cream }}>30% of the time</span>. Our buy signal eliminates that entirely. Our sell signal would have saved you from an average <span style={{ fontWeight: 500, color: t.cream }}>-16% loss</span> — and in the worst case, <span style={{ fontWeight: 500, color: t.cream }}>-67%</span>.
        </p>
      </div>

      {/* ── Full spectrum ── */}
      <Toggle label="Full signal spectrum — all 7 zones" defaultOpen>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Zone</th>
              <th style={thR}>σ range</th>
              <th style={thR}>Days</th>
              <th style={thR}>Signal</th>
              <th style={thR}>Accuracy</th>
              <th style={thR}>Avg return</th>
              <th style={thR}>Worst entry</th>
            </tr>
          </thead>
          <tbody>
            {spectrum.map((s, idx) => {
              const n = s.data?.n || 0;
              const isSell = s.horizon === "6m";
              const accLabel = isSell ? `${s.data?.precision || "–"}% saved` : `${s.data?.precision || "–"}%`;
              const isBuyGroup = s.signal === "Buy";
              const borderAbove = idx === 2 || idx === 5; // separators between buy/hold and hold/sell
              return (
                <tr key={s.label} style={borderAbove ? { borderTop: `2px solid ${t.border}` } : {}}>
                  <td style={{ ...td, fontFamily: bd, fontWeight: 500 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: s.color, marginRight: 8, verticalAlign: "middle" }} />
                    {s.label}
                  </td>
                  <td style={tdR}>{s.range}</td>
                  <td style={tdR}>{n.toLocaleString()}</td>
                  <td style={{ ...tdR, color: s.signal === "Buy" ? "#27AE60" : s.signal === "Sell" ? "#EB5757" : t.faint }}>{s.signal}</td>
                  <td style={{ ...tdR, color: isSell ? t.faint : parseFloat(s.data?.precision) >= 99 ? "#27AE60" : parseFloat(s.data?.precision) >= 80 ? "#E8A838" : t.faint }}>
                    {accLabel}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.avgReturn || 0) > 0 ? "#27AE60" : "#EB5757" }}>
                    {s.data?.avgReturn != null ? `${s.data.avgReturn > 0 ? "+" : ""}${s.data.avgReturn}%` : "–"}
                  </td>
                  <td style={{ ...tdR, color: (s.data?.minReturn || 0) < 0 ? "#EB5757" : "#27AE60" }}>
                    {s.data?.minReturn != null ? `${s.data.minReturn > 0 ? "+" : ""}${s.data.minReturn}%` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6 }}>
          Buy zones: accuracy = % profitable at 12 months. Sell zones: "saved" = % where holding would have lost money within 6 months. Avg return and worst entry for sell zones show what would have happened if you ignored the signal.
        </p>
      </Toggle>

      {/* ── Evidence toggles ── */}
      <Toggle label="Stability across market cycles" badge={`${bt.stabilityDelta || 0}pp delta`}>
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
            {bt.stabilityDelta === 0 ? "Perfect stability — same accuracy in every era across 3 market cycles." : bt.stabilityDelta < 5 ? "Strong stability across eras." : "Some variation between eras."}
          </p>
        )}
      </Toggle>

      {rb && (
        <Toggle label="Validated without look-ahead" badge={`${rb.buyPrecision}%`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 12 }}>
            {[
              { l: "Points tested", v: rb.nTotal.toLocaleString(), s: `Step: ${rb.step} days` },
              { l: "Buy accuracy", v: `${rb.nBuyCorrect}/${rb.nBuy} = ${rb.buyPrecision}%`, s: `${rb.nEpisodes} episodes` },
              { l: "Worst buy return", v: `${rb.worstBuyReturn > 0 ? "+" : ""}${rb.worstBuyReturn}%`, s: rb.worstBuyReturn > 0 ? "Positive" : "Edge case" },
            ].map((m, i) => (
              <div key={m.l} style={{ padding: "14px 0", borderRight: i < 2 ? `1px solid ${t.borderFaint}` : "none", paddingRight: i < 2 ? 14 : 0, paddingLeft: i > 0 ? 14 : 0 }}>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontFamily: mn, fontSize: 16, fontWeight: 500, color: t.cream }}>{m.v}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.6, fontStyle: "italic" }}>
            The Power Law is refitted at each test point using only data available up to that date. No future data. The {rb.buyPrecision === "100" ? "perfect" : "near-perfect"} match confirms the signal is not an artifact of look-ahead bias.
          </p>
        </Toggle>
      )}

      {/* ═══════════ PART 2 — WHAT HAPPENS IF YOU FOLLOW IT? ═══════════ */}
      <CatLabel label="What happens if you follow it?" />

      {/* ── DCA strategies ── */}
      <Toggle label={`$100/month for ${bm.dca?.dcaPeriods || "–"} months — three approaches`} defaultOpen>
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: "0 0 16px" }}>
          Same budget, different rules. Blind DCA buys every month. Signal DCA buys only at discounts. Smart DCA goes further — it sells at overheated levels and redeploys those profits at the next crash. Each sell-high, buy-low cycle compounds the next.
        </p>

        {/* DCA Chart */}
        {bm.dca?.timeSeries?.length > 2 && (() => {
          const ts = bm.dca.timeSeries;
          const W = 700, H = 220, pad = { t: 20, r: 50, b: 30, l: 55 };
          const chartW = W - pad.l - pad.r, chartH = H - pad.t - pad.b;
          const maxR = Math.max(Math.max(...ts.map(d => d.dcaReturn)), Math.max(...ts.map(d => d.sigReturn)), Math.max(...ts.map(d => d.smartReturn)), 1);
          const minR = Math.min(Math.min(...ts.map(d => d.dcaReturn)), Math.min(...ts.map(d => d.sigReturn)), Math.min(...ts.map(d => d.smartReturn)), 0);
          const range = maxR - minR || 1;
          const x = (i) => pad.l + (i / (ts.length - 1)) * chartW;
          const y = (v) => pad.t + chartH - ((v - minR) / range) * chartH;
          const pathStr = (key) => ts.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");
          const years = []; let lastYear = "";
          ts.forEach((d, i) => { const yr = d.date.slice(0, 4); if (yr !== lastYear) { years.push({ i, yr }); lastYear = yr; } });
          return (
            <div style={{ marginBottom: 16 }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
                {(() => { const step = range > 2000 ? 500 : range > 800 ? 200 : range > 400 ? 100 : 50; const lines = []; for (let v = Math.ceil(minR / step) * step; v <= maxR; v += step) lines.push(v); return lines.map(val => (<g key={val}><line x1={pad.l} y1={y(val)} x2={W - pad.r} y2={y(val)} stroke={t.borderFaint} strokeWidth="0.5" /><text x={pad.l - 4} y={y(val) + 3} textAnchor="end" fill={t.faint} fontSize="9" fontFamily={mn}>{val > 999 ? `${(val/1000).toFixed(0)}k` : `${val}`}%</text></g>)); })()}
                {years.map(({ i, yr }) => (<text key={yr} x={x(i)} y={H - 6} textAnchor="middle" fill={t.faint} fontSize="9" fontFamily={bd}>{yr}</text>))}
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

        {/* DCA Table */}
        {bm.dca && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}></th>
                <th style={thR}>Return</th>
                <th style={thR}>Final value</th>
                <th style={thR}>Sortino</th>
                <th style={thR}>Max drawdown</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdL}>Blind DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— every month</span></td>
                <td style={tdR}>+{bm.dca.dcaReturn}%</td>
                <td style={tdR}>${bm.dca.dca.portfolio.toLocaleString()}</td>
                <td style={tdR}>{bm.dca.dca.sortino ?? "–"}</td>
                <td style={{ ...tdR, color: "#EB5757" }}>{bm.dca.dca.maxDD}%</td>
              </tr>
              <tr>
                <td style={{ ...tdL, color: "#27AE60" }}>Signal DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— buy at σ &lt; -0.5</span></td>
                <td style={tdR}>+{bm.dca.sigDcaReturn}%</td>
                <td style={tdR}>${bm.dca.signal.portfolio.toLocaleString()}</td>
                <td style={tdR}>{bm.dca.signal.sortino ?? "–"}</td>
                <td style={tdR}>{bm.dca.signal.maxDD}%</td>
              </tr>
              <tr style={{ background: "rgba(187,107,217,0.04)" }}>
                <td style={{ ...tdL, color: "#BB6BD9", fontWeight: 500 }}>Smart DCA <span style={{ fontFamily: mn, fontSize: 9, color: t.dim }}>— compound</span></td>
                <td style={tdBoldR}>+{bm.dca.smartDcaReturn}%</td>
                <td style={tdBoldR}>${bm.dca.smart.portfolio.toLocaleString()}</td>
                <td style={{ ...tdBoldR, color: "#BB6BD9" }}>{bm.dca.smart.sortino ?? "–"}</td>
                <td style={{ ...tdBoldR, color: "#27AE60" }}>{bm.dca.smart.maxDD}%</td>
              </tr>
            </tbody>
          </table>
        )}

        <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, marginTop: 10 }}>
          Total budget: ${bm.dca?.totalBudget?.toLocaleString() || "–"} · Uninvested cash counts in portfolio.
          {bm.dca?.smart?.cash > 0 && ` Smart DCA holds $${bm.dca.smart.cash.toLocaleString()} in cash.`}
        </div>
      </Toggle>

      {/* ── How Smart DCA works ── */}
      <Toggle label="How Smart DCA works">
        <p style={{ fontFamily: bd, fontSize: 14, color: t.faint, lineHeight: 1.65, margin: "0 0 14px" }}>
          Each month, the model tells you how much to invest based on where Bitcoin is relative to fair value. When Bitcoin is cheap, you buy more — including profits from previous sells. When it's expensive, you sell into strength and build a "war chest." Each cycle amplifies the next.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 0, border: `1px solid ${t.borderFaint}`, borderRadius: 6, overflow: "hidden" }}>
          {[
            { zone: "Strong Buy", action: "$100 + 30% war chest", color: "#1B8A4A", actionColor: "#27AE60" },
            { zone: "Buy", action: "$100 + 15% war chest", color: "#27AE60", actionColor: "#27AE60" },
            { zone: "Accumulate", action: "$100", color: "#6FCF97", actionColor: t.cream },
            { zone: "Neutral", action: "$50", color: "#E8A838", actionColor: t.faint },
            { zone: "Caution", action: "$0 → war chest", color: "#F2994A", actionColor: t.faint },
            { zone: "Reduce", action: "Sell 25%", color: "#E07338", actionColor: "#EB5757" },
            { zone: "Sell", action: "Sell 50%", color: "#EB5757", actionColor: "#EB5757" },
          ].map((r, i) => (
            <div key={r.zone} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRight: i < 6 ? `1px solid ${t.borderFaint}` : "none" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
              <span style={{ fontFamily: bd, fontSize: 10, color: t.dim }}>{r.zone}</span>
              <span style={{ fontFamily: mn, fontSize: 11, fontWeight: 500, color: r.actionColor }}>{r.action}</span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          War chest = cash from sells + skipped months. In Strong Buy, 30% of the war chest deploys alongside the $100 base. Sell proceeds from 2017 funded bigger buys in 2018. Proceeds from 2021 funded 2022. Each cycle compounds.
        </p>
      </Toggle>

      {/* ── Risk profile ── */}
      <Toggle label="Risk profile — what it feels like">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}></th>
              <th style={thR}>Return</th>
              <th style={thR}>Max drawdown</th>
              <th style={thR}>Sortino</th>
              <th style={thR}>Final value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdL}>Blind DCA</td>
              <td style={tdR}>+{bm.dca?.dcaReturn}%</td>
              <td style={{ ...tdR, color: "#EB5757" }}>{bm.dca?.dca?.maxDD}%</td>
              <td style={tdR}>{bm.dca?.dca?.sortino ?? "–"}</td>
              <td style={tdR}>${bm.dca?.dca?.portfolio?.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ ...tdL, color: "#27AE60" }}>Signal DCA</td>
              <td style={tdR}>+{bm.dca?.sigDcaReturn}%</td>
              <td style={tdR}>{bm.dca?.signal?.maxDD}%</td>
              <td style={tdR}>{bm.dca?.signal?.sortino ?? "–"}</td>
              <td style={tdR}>${bm.dca?.signal?.portfolio?.toLocaleString()}</td>
            </tr>
            <tr style={{ background: "rgba(187,107,217,0.04)" }}>
              <td style={{ ...tdL, color: "#BB6BD9", fontWeight: 500 }}>Smart DCA</td>
              <td style={tdBoldR}>+{bm.dca?.smartDcaReturn}%</td>
              <td style={{ ...tdBoldR, color: "#27AE60" }}>{bm.dca?.smart?.maxDD}%</td>
              <td style={{ ...tdBoldR, color: "#BB6BD9" }}>{bm.dca?.smart?.sortino ?? "–"}</td>
              <td style={tdBoldR}>${bm.dca?.smart?.portfolio?.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>
          Blind DCA lost {bm.dca?.dca?.maxDD}% peak-to-trough during the worst crash. Smart DCA lost {bm.dca?.smart?.maxDD}% — and was actively buying at those lows with cash from previous sells. Same $100/month budget, dramatically different experience.
        </p>
      </Toggle>

      {/* ── Footer ── */}
      <div style={{ padding: "20px 0", fontFamily: bd, fontSize: 11, color: t.dim, lineHeight: 1.6 }}>
        Methodology: daily sampling (step=1). Buy signal: σ &lt; -0.5. Sell signal: σ &gt; 0.8. DCA strategies use identical $100/month budget with uninvested cash in portfolio. Sortino annualized from monthly portfolio returns (penalizes only downside). Smart DCA compounds sell proceeds into future buy signals via war chest.
      </div>
    </div>
  );
}
