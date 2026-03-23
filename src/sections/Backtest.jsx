import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";
import Chevron from "../components/Chevron";

export default function Backtest({ d }) {
  const { t } = useTheme();
  if (!d) return null;

  const bt = d.backtestResults;
  if (!bt) return (
    <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>Backtest data not available yet — computing...</span>
    </div>
  );

  const p = parseFloat(bt.precision);
  const br = parseFloat(bt.baseRate);
  const diff = br ? +(p - br).toFixed(0) : null;
  const bl = bt.byLevel;
  const cw = d.calibratedWeights;

  // Signal spectrum rows
  const buyRows = [
    { label: "Strong Buy", data: bl?.strongBuy, color: "#1B8A4A" },
    { label: "Buy", data: bl?.buy, color: "#27AE60" },
    { label: "Hold", data: bl?.no, color: t.faint },
  ].filter(r => r.data?.n > 0);

  const sellRows = bt.plBubbleMetrics ? [
    { label: "Reduce", data: bt.plBubbleMetrics.reduce, tag: `σ > ${bt.calibratedReduceSig}`, color: "#F2994A" },
    { label: "Sell", data: bt.plBubbleMetrics.sell, tag: `σ > ${bt.calibratedBubbleSig}`, color: "#EB5757" },
  ].filter(r => r.data?.n > 0) : [];

  const gridCols = "1.2fr 0.5fr 0.8fr 0.8fr 0.7fr";
  const headerStyle = { fontFamily: bd, fontSize: 10, color: t.faint, textTransform: "uppercase", letterSpacing: "0.04em" };

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* ── Title ── */}
      <div style={{ padding: "32px 0 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0,
        }}>
          Backtest
        </h1>
        <p style={{
          fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)",
          color: t.faint, lineHeight: 1.55, maxWidth: 640, margin: "14px 0 0",
        }}>
          We tested this model against every month of Bitcoin's history since 2016 — no hindsight, only data available at that moment. If you buy Bitcoin on any random day and hold for 12 months, history says you're in profit {br != null ? `${br}%` : "72%"} of the time. When this model says buy, that number goes to {p}%.
        </p>
      </div>

      {/* ── Key metrics strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        {[
          { label: "When it said buy", value: `${p}%`, sub: "price was higher 12m later", color: "#27AE60" },
          { label: "Avg return on buy", value: `+${bt.avgReturnYes}%`, sub: "12-month average", color: "#27AE60" },
          { label: "When it said sell", value: `${bt.avgReturnSell != null ? (bt.avgReturnSell > 0 ? "+" : "") + bt.avgReturnSell + "%" : "–"}`, sub: "avg 6-month return after", color: "#EB5757" },
          { label: "Base rate", value: `${br != null ? br : "–"}%`, sub: "Bitcoin goes up anyway in 12m", color: t.cream },
        ].map((m, i) => (
          <div key={m.label} style={{ padding: "24px 16px", borderRight: i < 3 ? `1px solid ${t.border}` : "none" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{m.label}</div>
            <div style={{ fontFamily: mn, fontSize: 32, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Buy signal grid ── */}
      <div style={{ padding: "24px 0 0" }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
          Buy signal — 12 month horizon
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
          {[
            { l: "Buy accuracy", v: `${bt.precision}%`, s: `${bt.nYes} buy signals` },
            { l: "Avg return buy", v: `+${bt.avgReturnYes}%`, s: "12m horizon", color: "#27AE60" },
            { l: "Return hold", v: `${bt.avgReturnHold >= 0 ? "+" : ""}${bt.avgReturnHold}%`, s: `${bt.nNo} hold periods` },
            { l: "Data points", v: `${bt.nYes + bt.nNo}`, s: `${bt.nYes} buy · ${bt.nNo} hold` },
          ].map((m, i) => (
            <div key={m.l} style={{ padding: "12px 12px 12px 0", borderRight: i < 3 ? `1px solid ${t.borderFaint}` : "none", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
              <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: m.color || t.cream }}>{m.v}</div>
              <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sell signal grid ── */}
      {bt.plBubbleMetrics && (
        <div style={{ padding: "24px 0 0" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
            Sell signal — 6 month horizon
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: `1px solid ${t.border}` }}>
            {[
              { l: "Sell accuracy", v: bt.plBubbleMetrics.sell?.pct20 != null ? `${bt.plBubbleMetrics.sell.pct20}%` : "–", s: `σ > ${bt.calibratedBubbleSig} · n=${bt.plBubbleMetrics.sell?.n ?? 0}` },
              { l: "Return after sell", v: bt.plBubbleMetrics.sell?.avgRet6m != null ? `${bt.plBubbleMetrics.sell.avgRet6m > 0 ? "+" : ""}${bt.plBubbleMetrics.sell.avgRet6m}%` : "–", s: "6m avg", color: "#EB5757" },
              { l: "Reduce accuracy", v: bt.plBubbleMetrics.reduce?.pct20 != null ? `${bt.plBubbleMetrics.reduce.pct20}%` : "–", s: `σ > ${bt.calibratedReduceSig} · n=${bt.plBubbleMetrics.reduce?.n ?? 0}` },
              { l: "Sell data points", v: `${(bt.plBubbleMetrics.sell?.n ?? 0) + (bt.plBubbleMetrics.reduce?.n ?? 0)}`, s: `${bt.plBubbleMetrics.sell?.n ?? 0} sell · ${bt.plBubbleMetrics.reduce?.n ?? 0} reduce` },
            ].map((m, i) => (
              <div key={m.l} style={{ padding: "12px 12px 12px 0", borderRight: i < 3 ? `1px solid ${t.borderFaint}` : "none", borderBottom: `1px solid ${t.borderFaint}` }}>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: m.color || t.cream }}>{m.v}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stability note */}
      {bt.stabilityDelta != null && (
        <div style={{ fontFamily: bd, fontSize: 12, color: bt.stabilityDelta < 15 ? "#27AE60" : "#F2994A", padding: "12px 0" }}>
          {bt.stabilityDelta < 15 ? "✓" : "⚠"} The signal worked consistently across all Bitcoin market cycles.
        </div>
      )}

      {/* ── Signal spectrum ── */}
      <div style={{ padding: "24px 0" }}>
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Signal spectrum — from strong buy to sell
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
          <div style={headerStyle}>Signal</div>
          <div style={{ ...headerStyle, textAlign: "right" }}>n</div>
          <div style={{ ...headerStyle, textAlign: "right" }}>Worked</div>
          <div style={{ ...headerStyle, textAlign: "right" }}>Avg return</div>
          <div style={{ ...headerStyle, textAlign: "right" }}>Worst</div>
        </div>

        {/* Buy rows */}
        {buyRows.map(r => {
          const nW = r.data.precision != null ? Math.round(parseFloat(r.data.precision) / 100 * r.data.n) : null;
          return (
            <div key={r.label} style={{ display: "grid", gridTemplateColumns: gridCols, padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 600, color: r.color }}>{r.label}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{r.data.n}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: t.dim, textAlign: "right" }}>{nW != null ? `${nW}/${r.data.n}` : "–"}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: r.data.avgReturn > 0 ? "#27AE60" : "#EB5757", textAlign: "right" }}>
                {r.data.avgReturn != null ? `${r.data.avgReturn > 0 ? "+" : ""}${r.data.avgReturn}%` : "–"}
              </div>
              <div style={{ fontFamily: mn, fontSize: 11, color: r.data.minReturn >= 0 ? "#27AE60" : "#EB5757", textAlign: "right" }}>
                {r.data.minReturn != null ? `${r.data.minReturn > 0 ? "+" : ""}${r.data.minReturn}%` : "–"}
              </div>
            </div>
          );
        })}

        {/* Sell rows */}
        {sellRows.map(r => (
          <div key={r.label} style={{ display: "grid", gridTemplateColumns: gridCols, padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
            <div style={{ fontFamily: bd, fontSize: 13, fontWeight: 600, color: r.color }}>
              {r.label} <span style={{ fontSize: 9, fontWeight: 400, color: t.faint }}>{r.tag}</span>
            </div>
            <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{r.data.n}</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: t.dim, textAlign: "right" }}>{r.data.pctAnyLoss ?? "–"}%</div>
            <div style={{ fontFamily: mn, fontSize: 12, color: r.data.avgRet6m < 0 ? "#EB5757" : t.dim, textAlign: "right" }}>
              {r.data.avgRet6m != null ? `${r.data.avgRet6m > 0 ? "+" : ""}${r.data.avgRet6m}%` : "–"}
            </div>
            <div style={{ fontFamily: mn, fontSize: 11, color: "#EB5757", textAlign: "right" }}>
              {r.data.maxDrawdown != null ? `${r.data.maxDrawdown}%` : "–"}
            </div>
          </div>
        ))}
      </div>

      {/* ── Toggle: Sigma buckets ── */}
      {bt.sigmaBuckets?.length > 0 && (
        <Toggle label="Does higher σ predict corrections?" sub="Sigma bucket analysis">
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
            Price level vs 6-month outcome
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
            {["Price level", "n", "Fell >P25", "Avg ret 6m"].map(h => (
              <div key={h} style={{ ...headerStyle, textAlign: h === "Price level" ? "left" : "right" }}>{h}</div>
            ))}
          </div>
          {bt.sigmaBuckets.filter(b => b.n > 0).map(b => (
            <div key={b.label} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.7fr 1fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: bd, fontSize: 12, fontWeight: b.min >= 0.5 ? 600 : 400, color: t.cream }}>{b.label}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{b.n}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: b.pct20 > 50 ? "#EB5757" : b.pct20 > 30 ? "#F2994A" : "#27AE60", textAlign: "right" }}>
                {b.nFell}/{b.n} ({b.pct20}%)
              </div>
              <div style={{ fontFamily: mn, fontSize: 12, color: b.avgRet < 0 ? "#EB5757" : t.dim, textAlign: "right" }}>
                {b.avgRet > 0 ? "+" : ""}{b.avgRet}%
              </div>
            </div>
          ))}
        </Toggle>
      )}

      {/* ── Toggle: Cross-validation ── */}
      {bt.crossValidation?.length > 0 && (
        <Toggle label="Did it work across all market cycles?" sub="Cross-validation by era">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 0.6fr 0.7fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
            {["Period", "n", "Buy", "Accuracy", "Avg return"].map(h => (
              <div key={h} style={{ ...headerStyle, textAlign: h === "Period" ? "left" : "right" }}>{h}</div>
            ))}
          </div>
          {bt.crossValidation.map(cv => (
            <div key={cv.label} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 0.6fr 0.7fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
              <div style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>{cv.label}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{cv.n}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{cv.nYes ?? "–"}</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: cv.precision > 60 ? "#27AE60" : "#F2994A", textAlign: "right" }}>{cv.precision ?? "–"}%</div>
              <div style={{ fontFamily: mn, fontSize: 12, color: cv.avgReturn > 0 ? "#27AE60" : "#EB5757", textAlign: "right" }}>
                {cv.avgReturn != null ? `${cv.avgReturn > 0 ? "+" : ""}${cv.avgReturn}%` : "–"}
              </div>
            </div>
          ))}
          {bt.stabilityDelta != null && (
            <div style={{ fontFamily: bd, fontSize: 11, color: bt.stabilityDelta < 15 ? "#27AE60" : "#F2994A", marginTop: 8 }}>
              {bt.stabilityDelta < 15 ? "✓" : "⚠"} Spread between best and worst era: {bt.stabilityDelta}pp
            </div>
          )}
        </Toggle>
      )}

      {/* ── Toggle: Calibration ── */}
      {bt.calibrationBuckets?.some(b => b.n > 0) && (
        <Toggle label="Does the model know when it's wrong?" sub="Probabilistic calibration">
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.5fr 0.8fr 0.8fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
            {["Zone", "n", "MC predicted", "Actual loss", "Avg return"].map(h => (
              <div key={h} style={{ ...headerStyle, textAlign: h === "Zone" ? "left" : "right" }}>{h}</div>
            ))}
          </div>
          {bt.calibrationBuckets.filter(b => b.n > 0).map(b => {
            const gap = b.pLossAvg != null && b.lossRate != null ? +(b.lossRate - b.pLossAvg).toFixed(1) : null;
            return (
              <div key={b.label} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.5fr 0.8fr 0.8fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <div style={{ fontFamily: bd, fontSize: 11, fontWeight: 500, color: t.cream }}>{b.label}</div>
                <div style={{ fontFamily: mn, fontSize: 12, color: t.faint, textAlign: "right" }}>{b.n}</div>
                <div style={{ fontFamily: mn, fontSize: 12, color: t.dim, textAlign: "right" }}>{b.pLossAvg != null ? `${b.pLossAvg}%` : "–"}</div>
                <div style={{ fontFamily: mn, fontSize: 12, textAlign: "right" }}>
                  <span style={{ color: b.lossRate > 30 ? "#EB5757" : b.lossRate > 15 ? "#F2994A" : "#27AE60" }}>{b.lossRate != null ? `${b.lossRate}%` : "–"}</span>
                  {gap != null && <span style={{ fontFamily: mn, fontSize: 9, color: Math.abs(gap) < 10 ? "#27AE60" : "#F2994A", marginLeft: 4 }}>{gap > 0 ? "+" : ""}{gap}pp</span>}
                </div>
                <div style={{ fontFamily: mn, fontSize: 12, color: b.avgReturn > 0 ? "#27AE60" : "#EB5757", textAlign: "right" }}>
                  {b.avgReturn != null ? `${b.avgReturn > 0 ? "+" : ""}${b.avgReturn}%` : "–"}
                </div>
              </div>
            );
          })}
        </Toggle>
      )}

      {/* ── Methodology ── */}
      <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, lineHeight: 1.6, padding: "16px 0", borderTop: `1px solid ${t.border}` }}>
        Tested on every 30-day point from 2016 to today. At each point, the model computed its signal using only data available at that time — no hindsight.
        {bt.baseRate != null && ` Bitcoin went up in ${bt.baseRate}% of all 12-month periods.`}
        {bt.unconditionalMean != null && ` Unconditional avg return: ${bt.unconditionalMean > 0 ? "+" : ""}${bt.unconditionalMean}%.`}
        {cw && ` Buy scores four factors: discount (×${cw.w1}), loss probability (×${cw.w2}), fair value reach (×${cw.w3}), floor proximity (×${cw.w4}).`}
      </div>
    </div>
  );
}
