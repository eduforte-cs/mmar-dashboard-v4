import React, { useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { bd, mn } from "../../theme/tokens";
import Chevron from "../../components/Chevron";

function ScrollWrap({ children, minW = 400 }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>;
}

export default function ValidationPanel({ bt, calibratedWeights }) {
  const { t } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  if (!bt) return <p style={{ fontFamily: bd, fontSize: 14, color: t.dim }}>Backtest data not available.</p>;

  const p = parseFloat(bt.precision);
  const br = parseFloat(bt.baseRate);
  const diff = br ? +(p - br).toFixed(1) : null;
  const bl = bt.byLevel;
  const nSell = (bt.plBubbleMetrics?.sell?.n ?? 0) + (bt.plBubbleMetrics?.reduce?.n ?? 0);
  const stable = bt.stabilityDelta != null && bt.stabilityDelta < 15;

  // Grid row helper
  const GridRow = ({ cols, items, header, minW }) => (
    <div style={{ display: "grid", gridTemplateColumns: cols, padding: "8px 0", borderBottom: `1px solid ${header ? t.border : t.borderFaint}`, minWidth: minW || 0 }}>
      {items.map((item, i) => (
        <div key={i} style={{ ...item.style, fontFamily: header ? bd : mn, fontSize: header ? 9 : 12, color: header ? t.faint : (item.color || t.cream), textTransform: header ? "uppercase" : "none", letterSpacing: header ? "0.04em" : "normal", textAlign: i === 0 ? "left" : "right", fontWeight: item.bold ? 600 : 400 }}>
          {item.v}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* ── Rich narrative headline ── */}
      <div style={{ fontFamily: bd, fontSize: 15, color: t.cream, lineHeight: 1.8, marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px" }}>
          Tested against every point in Bitcoin's history since 2016. When the model said <strong>buy</strong>, the price was higher 12 months later <strong style={{ color: "#27AE60" }}>{p}% of the time</strong>.
          {br != null && diff != null && (
            <span style={{ color: t.dim }}> Bitcoin goes up in any random 12-month period {br}% of the time — the buy signal adds <strong style={{ color: diff > 0 ? "#27AE60" : "#EB5757" }}>{diff > 0 ? "+" : ""}{diff}pp</strong> on top.</span>
          )}
        </p>
        {bt.avgReturnYes != null && (
          <p style={{ margin: "0 0 10px" }}>
            When the model said <strong>buy</strong>, the average 12-month return was <strong style={{ color: "#27AE60" }}>+{bt.avgReturnYes}%</strong>.
            {bl?.no?.n > 0 && bt.avgReturnHold != null && (
              <span> During <strong>hold</strong> periods ({bl.no.n} observations), the average was <strong style={{ color: t.dim }}>{bt.avgReturnHold > 0 ? "+" : ""}{bt.avgReturnHold}%</strong>.</span>
            )}
            {nSell > 0 && bt.avgReturnSell != null && (
              <span> After <strong>sell/reduce</strong> ({nSell} observations), the 6-month return was <strong style={{ color: "#EB5757" }}>{bt.avgReturnSell > 0 ? "+" : ""}{bt.avgReturnSell}%</strong>.</span>
            )}
          </p>
        )}
        {calibratedWeights && (
          <p style={{ margin: "0 0 10px", color: t.faint, fontSize: 13 }}>
            Buy scores four factors: discount (×{calibratedWeights.w1}), loss probability (×{calibratedWeights.w2}), fair value reach (×{calibratedWeights.w3}), floor proximity (×{calibratedWeights.w4}). Sell uses separate σ thresholds from historical correction data.
          </p>
        )}
        <p style={{ margin: 0, color: t.faint, fontSize: 13 }}>
          {stable
            ? "✓ The signal worked consistently across all Bitcoin market cycles."
            : "⚠ Performance varied across different market cycles — treat as a guide, not a guarantee."}
        </p>
      </div>

      {/* ── Expandable details ── */}
      <button onClick={() => setShowDetails(!showDetails)} style={{
        display: "flex", alignItems: "center", width: "100%", gap: 8,
        padding: "12px 0", background: "none", border: "none", borderTop: `1px solid ${t.borderFaint}`,
        cursor: "pointer", fontFamily: bd, fontSize: 13, fontWeight: 500, color: t.cream,
      }}>
        <span style={{ flex: 1, textAlign: "left" }}>Show detailed numbers</span>
        <div style={{ transform: showDetails ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
          <Chevron size={14} color={t.faint} />
        </div>
      </button>

      {showDetails && (
        <div style={{ paddingBottom: 16 }}>

          {/* ── Buy signal metrics ── */}
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Buy signal — 12 month horizon</div>
          <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
            {[
              { l: "Buy accuracy", v: `${bt.precision}%`, s: `${bt.nYes} buy signals` },
              { l: "Avg return buy", v: `+${bt.avgReturnYes}%`, s: "12m horizon" },
              { l: "Return hold", v: `${bt.avgReturnHold >= 0 ? "+" : ""}${bt.avgReturnHold}%`, s: `${bt.nNo} hold periods` },
              { l: "Data points", v: `${bt.nYes + bt.nNo}`, s: `${bt.nYes} buy · ${bt.nNo} hold` },
            ].map((m, i) => (
              <div key={m.l} style={{ padding: "12px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 16 : 0, paddingLeft: (i % 2 === 1) ? 16 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
                <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{m.v}</div>
                <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
              </div>
            ))}
          </div>

          {/* ── Sell signal metrics ── */}
          {bt.plBubbleMetrics && (() => {
            const sell = bt.plBubbleMetrics.sell;
            const reduce = bt.plBubbleMetrics.reduce;
            return (
              <>
                <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>Sell signal — 6 month horizon</div>
                <div className="data-grid-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${t.borderFaint}`, marginBottom: 16 }}>
                  {[
                    { l: "Sell accuracy", v: sell?.pct20 != null ? `${sell.pct20}%` : "—", s: `σ > ${bt.calibratedBubbleSig} · n=${sell?.n ?? 0}` },
                    { l: "Return after sell", v: sell?.avgRet6m != null ? `${sell.avgRet6m > 0 ? "+" : ""}${sell.avgRet6m}%` : "—", s: "6m avg" },
                    { l: "Reduce accuracy", v: reduce?.pct20 != null ? `${reduce.pct20}%` : "—", s: `σ > ${bt.calibratedReduceSig} · n=${reduce?.n ?? 0}` },
                    { l: "Sell data points", v: `${(sell?.n ?? 0) + (reduce?.n ?? 0)}`, s: `${sell?.n ?? 0} sell · ${reduce?.n ?? 0} reduce` },
                  ].map((m, i) => (
                    <div key={m.l} style={{ padding: "12px 0", borderRight: (i % 2 === 0) ? `1px solid ${t.borderFaint}` : "none", paddingRight: (i % 2 === 0) ? 16 : 0, paddingLeft: (i % 2 === 1) ? 16 : 0, borderBottom: i < 2 ? `1px solid ${t.borderFaint}` : "none" }}>
                      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{m.l}</div>
                      <div style={{ fontFamily: mn, fontSize: 18, fontWeight: 500, color: t.cream }}>{m.v}</div>
                      <div style={{ fontFamily: bd, fontSize: 10, color: t.faint, marginTop: 2 }}>{m.s}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* ── Signal spectrum ── */}
          {bl && (
            <ScrollWrap>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Signal spectrum — from strong buy to sell
              </div>
              <GridRow cols="1.2fr 0.6fr 0.8fr 0.8fr 0.7fr" header minW={420} items={[
                { v: "Level" }, { v: "n" }, { v: "Accuracy" }, { v: "Avg return" }, { v: "Worst" },
              ]} />
              {[
                { label: "Strong Buy", tag: "σ < -1.0", data: bl.strongBuy, color: "#1B8A4A" },
                { label: "Buy", tag: "-1.0 to -0.5", data: bl.buy, color: "#27AE60" },
                { label: "Accumulate", tag: "-0.5 to 0", data: bl.accumulate, color: "#6FCF97" },
                { label: "Neutral", tag: "0 to 0.3", data: bl.neutral, color: "#E8A838" },
                { label: "Caution", tag: "0.3 to 0.5", data: bl.caution, color: "#F2994A" },
              ].filter(r => r.data?.n > 0).map(r => (
                <GridRow key={r.label} cols="1.2fr 0.6fr 0.8fr 0.8fr 0.7fr" minW={420} items={[
                  { v: <><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: r.color, marginRight: 6, verticalAlign: "middle" }} />{r.label} <span style={{ fontSize: 9, color: t.faint }}>{r.tag}</span></>, color: r.color, bold: true },
                  { v: r.data.n, color: t.faint },
                  { v: `${r.data.precision}%`, color: r.data.precision >= 90 ? "#27AE60" : r.data.precision >= 70 ? "#E8A838" : "#EB5757" },
                  { v: `${r.data.avgReturn > 0 ? "+" : ""}${r.data.avgReturn}%`, color: r.data.avgReturn > 0 ? "#27AE60" : "#EB5757" },
                  { v: r.data.minReturn != null ? `${r.data.minReturn > 0 ? "+" : ""}${r.data.minReturn}%` : "—", color: (r.data.minReturn || 0) < 0 ? "#EB5757" : "#27AE60" },
                ]} />
              ))}
              {/* Sell zones */}
              {bt.plBubbleMetrics && [
                { label: "Reduce", tag: "0.5–0.8", data: bt.plBubbleMetrics.reduce, color: "#E07338" },
                { label: "Sell", tag: "σ > 0.8", data: bt.plBubbleMetrics.sell, color: "#EB5757" },
              ].filter(r => r.data?.n > 0).map(r => (
                <GridRow key={r.label} cols="1.2fr 0.6fr 0.8fr 0.8fr 0.7fr" minW={420} items={[
                  { v: <><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: r.color, marginRight: 6, verticalAlign: "middle" }} />{r.label} <span style={{ fontSize: 9, color: t.faint }}>{r.tag}</span></>, color: r.color, bold: true },
                  { v: r.data.n, color: t.faint },
                  { v: r.data.pctAnyLoss != null ? `${r.data.pctAnyLoss}%` : "—", color: t.dim },
                  { v: r.data.avgRet6m != null ? `${r.data.avgRet6m > 0 ? "+" : ""}${r.data.avgRet6m}%` : "—", color: (r.data.avgRet6m || 0) < 0 ? "#27AE60" : "#EB5757" },
                  { v: r.data.maxDrawdown != null ? `${r.data.maxDrawdown}%` : "—", color: "#EB5757" },
                ]} />
              ))}
            </ScrollWrap>
          )}

          {/* ── Sigma buckets ── */}
          {bt.sigmaBuckets?.length > 0 && (
            <ScrollWrap>
              <div style={{ marginTop: 20, fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Does higher σ predict more corrections?
              </div>
              <GridRow cols="1.2fr 0.7fr 1fr 0.8fr" header minW={360} items={[
                { v: "Price level" }, { v: "n" }, { v: "Fell >P25" }, { v: "Avg ret 6m" },
              ]} />
              {bt.sigmaBuckets.filter(b => b.n > 0).map(b => (
                <GridRow key={b.label} cols="1.2fr 0.7fr 1fr 0.8fr" minW={360} items={[
                  { v: b.label, bold: b.min >= 0.5 },
                  { v: b.n, color: t.faint },
                  { v: `${b.nFell}/${b.n} (${b.pct20}%)`, color: b.pct20 > 50 ? "#EB5757" : b.pct20 > 30 ? "#F2994A" : "#27AE60" },
                  { v: `${b.avgRet > 0 ? "+" : ""}${b.avgRet}%`, color: b.avgRet < 0 ? "#27AE60" : t.dim },
                ]} />
              ))}
            </ScrollWrap>
          )}

          {/* ── Cross-validation ── */}
          {bt.crossValidation?.length > 0 && (
            <ScrollWrap>
              <div style={{ marginTop: 20, fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Did it work across different market eras?
              </div>
              <GridRow cols="1.2fr 0.6fr 0.6fr 0.7fr 0.8fr" header minW={400} items={[
                { v: "Period" }, { v: "n" }, { v: "Buy" }, { v: "Accuracy" }, { v: "Avg return" },
              ]} />
              {bt.crossValidation.map(cv => (
                <GridRow key={cv.label} cols="1.2fr 0.6fr 0.6fr 0.7fr 0.8fr" minW={400} items={[
                  { v: cv.label },
                  { v: cv.n, color: t.faint },
                  { v: cv.nYes ?? "—", color: t.faint },
                  { v: `${cv.precision ?? "—"}%`, color: cv.precision > 60 ? "#27AE60" : "#F2994A" },
                  { v: cv.avgReturn != null ? `${cv.avgReturn > 0 ? "+" : ""}${cv.avgReturn}%` : "—", color: (cv.avgReturn || 0) > 0 ? "#27AE60" : "#EB5757" },
                ]} />
              ))}
              {bt.stabilityDelta != null && (
                <div style={{ fontFamily: bd, fontSize: 11, color: bt.stabilityDelta < 15 ? "#27AE60" : "#F2994A", marginTop: 6 }}>
                  {bt.stabilityDelta < 15 ? "✓" : "⚠"} Spread between best and worst era: {bt.stabilityDelta}pp
                </div>
              )}
            </ScrollWrap>
          )}

          {/* ── Calibration ── */}
          {bt.calibrationBuckets?.some(b => b.n > 0) && (
            <ScrollWrap>
              <div style={{ marginTop: 20, fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>
                Probabilistic calibration — does the model know when it's wrong?
              </div>
              <GridRow cols="1.5fr 0.5fr 0.8fr 0.8fr 0.8fr" header minW={420} items={[
                { v: "Zone" }, { v: "n" }, { v: "MC predicted" }, { v: "Actual loss" }, { v: "Avg return" },
              ]} />
              {bt.calibrationBuckets.filter(b => b.n > 0).map(b => {
                const gap = b.pLossAvg != null && b.lossRate != null ? +(b.lossRate - b.pLossAvg).toFixed(1) : null;
                return (
                  <GridRow key={b.label} cols="1.5fr 0.5fr 0.8fr 0.8fr 0.8fr" minW={420} items={[
                    { v: b.label, bold: true },
                    { v: b.n, color: t.faint },
                    { v: b.pLossAvg != null ? `${b.pLossAvg}%` : "—", color: t.dim },
                    { v: b.lossRate != null ? `${b.lossRate}%` : "—", color: b.lossRate > 30 ? "#EB5757" : b.lossRate > 15 ? "#F2994A" : "#27AE60" },
                    { v: b.avgReturn != null ? `${b.avgReturn > 0 ? "+" : ""}${b.avgReturn}%` : "—", color: (b.avgReturn || 0) > 0 ? "#27AE60" : "#EB5757" },
                  ]} />
                );
              })}
            </ScrollWrap>
          )}

          {/* ── Methodology note ── */}
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, lineHeight: 1.7, marginTop: 16, padding: "10px 0", borderTop: `1px solid ${t.borderFaint}` }}>
            Tested on every 30-day point from 2016 to today. At each point, the model computed its signal using only data available at that time — no hindsight.
            {bt.baseRate != null && ` Bitcoin went up in ${bt.baseRate}% of all 12-month periods.`}
            {bt.unconditionalMean != null && ` Unconditional avg return: ${bt.unconditionalMean > 0 ? "+" : ""}${bt.unconditionalMean}%.`}
          </div>
        </div>
      )}
    </>
  );
}
