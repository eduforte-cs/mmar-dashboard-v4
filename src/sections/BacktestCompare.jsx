import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import Toggle from "../components/Toggle";

function MetricRow({ label, original, robust, betterIsLower = false }) {
  const { t } = useTheme();
  const oVal = parseFloat(original);
  const rVal = parseFloat(robust);
  const oWins = betterIsLower ? oVal < rVal : oVal > rVal;
  const rWins = betterIsLower ? rVal < oVal : rVal > oVal;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "10px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
      <div style={{ fontFamily: bd, fontSize: 13, color: t.cream }}>{label}</div>
      <div style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: oWins ? "#27AE60" : t.faint, textAlign: "right" }}>{original}</div>
      <div style={{ fontFamily: mn, fontSize: 14, fontWeight: 500, color: rWins ? "#27AE60" : t.faint, textAlign: "right" }}>{robust}</div>
    </div>
  );
}

export default function BacktestCompare({ d }) {
  const { t } = useTheme();
  if (!d) return null;

  const og = d.backtestResults;
  const rb = d.robustBacktestResults;

  if (!og && !rb) return (
    <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>Running backtests...</span>
    </div>
  );

  const header = (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>Metric</div>
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Original</div>
      <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Robust</div>
    </div>
  );

  const fmt = v => v != null ? v : "–";
  const fmtP = v => v != null ? v + "%" : "–";
  const fmtR = v => v != null ? (v > 0 ? "+" : "") + v + "%" : "–";

  const ogBl = og?.byLevel || {};
  const rbBl = rb?.byLevel || {};

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* Title */}
      <div style={{ padding: "32px 0 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0,
        }}>
          Backtest Comparison
        </h1>
        <p style={{
          fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)",
          color: t.faint, lineHeight: 1.55, maxWidth: 640, margin: "14px 0 0",
        }}>
          Original uses global Power Law (fitted on all data through today) with grid-search optimized weights.
          Robust refits Power Law at each test point using only historical data, with simple sigma rules and no weight optimization.
          Sell/reduce in Robust require PL maturity (b &gt; 4.0).
        </p>
      </div>

      {/* Method badges */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Original</div>
          <div style={{ fontFamily: bd, fontSize: 12, color: t.dim, lineHeight: 1.5 }}>
            Global PL fit (a={og ? d.a?.toFixed(2) : "–"}, b={og ? d.b?.toFixed(2) : "–"})
            {og?.weights && <><br />Weights: w1={og.weights.w1} w2={og.weights.w2} w3={og.weights.w3} w4={og.weights.w4}</>}
          </div>
        </div>
        <div style={{ padding: 16, border: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Robust</div>
          <div style={{ fontFamily: bd, fontSize: 12, color: t.dim, lineHeight: 1.5 }}>
            Local PL refit at each point
            {rb?.rules && <><br />{rb.rules.note}</>}
          </div>
        </div>
      </div>

      {/* ── Buy signal comparison ── */}
      <Toggle label="Buy signal — 12 month horizon" defaultOpen>
        {header}
        <MetricRow label="Buy accuracy" original={fmtP(og?.precision)} robust={fmtP(rb?.precision)} />
        <MetricRow label="Buy signals (n)" original={fmt(og?.nYes)} robust={fmt(rb?.nYes)} />
        <MetricRow label="Avg return buy" original={fmtR(og?.avgReturnYes)} robust={fmtR(rb?.avgReturnYes)} />
        <MetricRow label="Avg return hold" original={fmtR(og?.avgReturnHold)} robust={fmtR(rb?.avgReturnHold)} betterIsLower />
        <MetricRow label="Base rate" original={fmtP(og?.baseRate)} robust={fmtP(rb?.baseRate)} />
        <div style={{ height: 12 }} />
        <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>By level</div>
        {header}
        <MetricRow label="Strong Buy — n" original={fmt(ogBl.strongBuy?.n)} robust={fmt(rbBl.strongBuy?.n)} />
        <MetricRow label="Strong Buy — accuracy" original={fmtP(ogBl.strongBuy?.precision)} robust={fmtP(rbBl.strongBuy?.precision)} />
        <MetricRow label="Strong Buy — avg return" original={fmtR(ogBl.strongBuy?.avgReturn)} robust={fmtR(rbBl.strongBuy?.avgReturn)} />
        <MetricRow label="Strong Buy — worst" original={fmtR(ogBl.strongBuy?.minReturn)} robust={fmtR(rbBl.strongBuy?.minReturn)} />
        <div style={{ height: 8 }} />
        <MetricRow label="Buy — n" original={fmt(ogBl.buy?.n)} robust={fmt(rbBl.buy?.n)} />
        <MetricRow label="Buy — accuracy" original={fmtP(ogBl.buy?.precision)} robust={fmtP(rbBl.buy?.precision)} />
        <MetricRow label="Buy — avg return" original={fmtR(ogBl.buy?.avgReturn)} robust={fmtR(rbBl.buy?.avgReturn)} />
        <MetricRow label="Buy — worst" original={fmtR(ogBl.buy?.minReturn)} robust={fmtR(rbBl.buy?.minReturn)} />
        <div style={{ height: 8 }} />
        <MetricRow label="Hold — n" original={fmt(ogBl.no?.n)} robust={fmt(rbBl.no?.n)} />
        <MetricRow label="Hold — accuracy" original={fmtP(ogBl.no?.precision)} robust={fmtP(rbBl.no?.precision)} />
        <MetricRow label="Hold — avg return" original={fmtR(ogBl.no?.avgReturn)} robust={fmtR(rbBl.no?.avgReturn)} />
      </Toggle>

      {/* ── Sell signal comparison ── */}
      <Toggle label="Sell signal — 6 month horizon" defaultOpen>
        {header}
        <MetricRow label="Avg return after sell (6m)" original={fmtR(og?.avgReturnSell)} robust={fmtR(rb?.avgReturnSell)} betterIsLower />
        <MetricRow label="Sell n" original={fmt(og?.plBubbleMetrics?.sell?.n)} robust={fmt(rb?.plBubbleMetrics?.sell?.n)} />
        <MetricRow label="Sell — loss %" original={fmtP(og?.plBubbleMetrics?.sell?.pctAnyLoss)} robust={fmtP(rb?.plBubbleMetrics?.sell?.pctAnyLoss)} />
        <MetricRow label="Sell — avg 6m" original={fmtR(og?.plBubbleMetrics?.sell?.avgRet6m)} robust={fmtR(rb?.plBubbleMetrics?.sell?.avgRet6m)} betterIsLower />
        <MetricRow label="Sell — worst" original={fmtR(og?.plBubbleMetrics?.sell?.maxDrawdown)} robust={fmtR(rb?.plBubbleMetrics?.sell?.maxDrawdown)} />
        <div style={{ height: 8 }} />
        <MetricRow label="Reduce n" original={fmt(og?.plBubbleMetrics?.reduce?.n)} robust={fmt(rb?.plBubbleMetrics?.reduce?.n)} />
        <MetricRow label="Reduce — loss %" original={fmtP(og?.plBubbleMetrics?.reduce?.pctAnyLoss)} robust={fmtP(rb?.plBubbleMetrics?.reduce?.pctAnyLoss)} />
        <MetricRow label="Reduce — avg 6m" original={fmtR(og?.plBubbleMetrics?.reduce?.avgRet6m)} robust={fmtR(rb?.plBubbleMetrics?.reduce?.avgRet6m)} betterIsLower />
        <div style={{ height: 8 }} />
        <MetricRow label="Sell σ threshold" original={fmt(og?.calibratedBubbleSig)} robust={fmt(rb?.calibratedBubbleSig)} />
        <MetricRow label="Reduce σ threshold" original={fmt(og?.calibratedReduceSig)} robust={fmt(rb?.calibratedReduceSig)} />
      </Toggle>

      {/* ── Cross-validation ── */}
      <Toggle label="Cross-validation by era">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Original */}
          <div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Original</div>
            {(og?.crossValidation || []).map(cv => (
              <div key={cv.label} style={{ padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <div style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>{cv.label}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>
                  n={cv.n} buy={cv.nYes} acc={cv.precision || "–"}% avg={cv.avgReturn != null ? (cv.avgReturn > 0 ? "+" : "") + cv.avgReturn + "%" : "–"}
                </div>
              </div>
            ))}
            {og?.stabilityDelta != null && (
              <div style={{ fontFamily: bd, fontSize: 11, color: og.stabilityDelta < 15 ? "#27AE60" : "#F2994A", marginTop: 6 }}>
                Stability delta: {og.stabilityDelta}pp
              </div>
            )}
          </div>
          {/* Robust */}
          <div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Robust</div>
            {(rb?.crossValidation || []).map(cv => (
              <div key={cv.label} style={{ padding: "8px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                <div style={{ fontFamily: bd, fontSize: 12, color: t.cream }}>{cv.label}</div>
                <div style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>
                  n={cv.n} buy={cv.nYes} acc={cv.precision || "–"}% avg={cv.avgReturn != null ? (cv.avgReturn > 0 ? "+" : "") + cv.avgReturn + "%" : "–"}
                </div>
              </div>
            ))}
            {rb?.stabilityDelta != null && (
              <div style={{ fontFamily: bd, fontSize: 11, color: rb.stabilityDelta < 15 ? "#27AE60" : "#F2994A", marginTop: 6 }}>
                Stability delta: {rb.stabilityDelta}pp
              </div>
            )}
          </div>
        </div>
      </Toggle>

      {/* ── Sigma buckets ── */}
      <Toggle label="Sigma buckets — correction rates">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[{ label: "Original", data: og?.sigmaBuckets }, { label: "Robust", data: rb?.sigmaBuckets }].map(side => (
            <div key={side.label}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{side.label}</div>
              {(side.data || []).filter(b => b.n > 0).map(b => (
                <div key={b.label} style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr", padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                  <div style={{ fontFamily: bd, fontSize: 11, color: t.cream }}>{b.label}</div>
                  <div style={{ fontFamily: mn, fontSize: 11, color: t.faint, textAlign: "right" }}>{b.nFell}/{b.n} ({b.pct20}%)</div>
                  <div style={{ fontFamily: mn, fontSize: 11, color: b.avgRet < 0 ? "#EB5757" : t.dim, textAlign: "right" }}>{b.avgRet}%</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Toggle>

      {/* ── Calibration ── */}
      <Toggle label="MC calibration — predicted vs actual">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[{ label: "Original", data: og?.calibrationBuckets }, { label: "Robust", data: rb?.calibrationBuckets }].map(side => (
            <div key={side.label}>
              <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{side.label}</div>
              {(side.data || []).filter(b => b.n > 0).map(b => {
                const gap = b.pLossAvg != null && b.lossRate != null ? +(b.lossRate - b.pLossAvg).toFixed(1) : null;
                return (
                  <div key={b.label} style={{ padding: "6px 0", borderBottom: `1px solid ${t.borderFaint}` }}>
                    <div style={{ fontFamily: bd, fontSize: 11, color: t.cream }}>{b.label} <span style={{ color: t.faint }}>n={b.n}</span></div>
                    <div style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>
                      MC: {b.pLossAvg}% → Actual: <span style={{ color: b.lossRate > 30 ? "#EB5757" : "#27AE60" }}>{b.lossRate}%</span>
                      {gap != null && <span style={{ color: Math.abs(gap) < 10 ? "#27AE60" : "#F2994A" }}> ({gap > 0 ? "+" : ""}{gap}pp)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Toggle>

      {/* ── Robust rules ── */}
      {rb?.rules && (
        <div style={{ fontFamily: bd, fontSize: 12, color: t.faint, lineHeight: 1.6, padding: "16px 0", borderTop: `1px solid ${t.border}` }}>
          <strong style={{ color: t.cream }}>Robust rules:</strong> {rb.rules.strongBuy} = Strong Buy, {rb.rules.buy} = Buy, {rb.rules.hold} = Hold, {rb.rules.reduce} = Reduce, {rb.rules.sell} = Sell.
          {rb.fitAudit?.length > 0 && (
            <> PL slope drift: b={rb.fitAudit[0]?.b} ({rb.fitAudit[0]?.date}) → b={rb.fitAudit[rb.fitAudit.length - 1]?.b} ({rb.fitAudit[rb.fitAudit.length - 1]?.date}).</>
          )}
        </div>
      )}
    </div>
  );
}
