import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import { fmtK } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";
import Toggle from "../components/Toggle";

export default function MonteCarlo({ d, derived }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 1200, h: 500 });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = Math.max(380, Math.min(600, w * 0.4));
      setDims({ w, h });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const chart = useMemo(() => {
    if (!d || !derived) return null;
    const { S0, a, b, t0, percentiles, percentiles3y } = d;
    const { mcLossHorizons } = derived;

    const W = dims.w, H = dims.h;
    const pad = { top: 30, right: 130, bottom: 50, left: 65 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    const totalDays = 1095;
    const tx = (day) => pad.left + (day / totalDays) * cw;

    // Build unified percentile series
    const pctSeries = [];
    // Start with spot price
    pctSeries.push({ day: 0, p5: S0, p25: S0, p50: S0, p75: S0, p95: S0 });
    // 1Y data
    for (let i = 0; i < percentiles.length; i++) {
      const row = percentiles[i];
      const day = i * 5;
      if (!row || day > 365) break;
      if (day === 0) continue;
      pctSeries.push({ day, p5: row.p5, p25: row.p25, p50: row.p50, p75: row.p75, p95: row.p95 });
    }
    // 3Y data (from day 370+)
    for (let i = 0; i < percentiles3y.length; i++) {
      const day = i * 5;
      if (day <= 365) continue;
      const row = percentiles3y[i];
      if (!row) continue;
      pctSeries.push({ day, p5: row.p5, p25: row.p25, p50: row.p50, p75: row.p75, p95: row.p95 });
    }

    if (pctSeries.length < 10) return null;

    // Y axis: log scale
    const allPrices = pctSeries.flatMap(r => [r.p5, r.p95]);
    const logMin = Math.log10(Math.min(...allPrices) * 0.85);
    const logMax = Math.log10(Math.max(...allPrices) * 1.1);
    const ty = (price) => pad.top + ch - ((Math.log10(Math.max(price, 1)) - logMin) / (logMax - logMin)) * ch;

    // Build SVG paths
    const toPath = (key) => pctSeries.map((r, i) => `${i === 0 ? "M" : "L"} ${tx(r.day).toFixed(1)},${ty(r[key]).toFixed(1)}`).join(" ");
    const toFill = (keyTop, keyBot) => {
      const top = pctSeries.map((r, i) => `${i === 0 ? "M" : "L"} ${tx(r.day).toFixed(1)},${ty(r[keyTop]).toFixed(1)}`).join(" ");
      const bot = [...pctSeries].reverse().map((r, i) => `${i === 0 ? "L" : "L"} ${tx(r.day).toFixed(1)},${ty(r[keyBot]).toFixed(1)}`).join(" ");
      return top + " " + bot + " Z";
    };

    // Entry price Y
    const entryY = ty(S0);

    // 1Y marker X
    const x1y = tx(365);

    // Endpoint values (last row)
    const last = pctSeries[pctSeries.length - 1];

    // Loss horizons
    const loss1y = mcLossHorizons.find(h => h.days === 365);
    const loss3y = mcLossHorizons.find(h => h.days === 1095);

    // 1Y worst case (P5 at day 365)
    const row1y = pctSeries.find(r => r.day >= 360 && r.day <= 370) || pctSeries[Math.floor(365 / 5)];
    const worst1y = row1y?.p5 || S0 * 0.5;

    // Price ticks
    const priceTicks = [];
    const logStep = (logMax - logMin) / 5;
    for (let i = 1; i < 5; i++) {
      const lp = logMin + i * logStep;
      const price = Math.pow(10, lp);
      priceTicks.push({ y: pad.top + ch - (i / 5) * ch, label: fmtK(price) });
    }

    return {
      W, H, pad, entryY, x1y, pctSeries, last, S0,
      loss1y: loss1y?.pLoss || 50,
      loss3y: loss3y?.pLoss || 50,
      worst1y, worst3y: last.p5,
      paths: {
        p95: toPath("p95"), p75: toPath("p75"), p50: toPath("p50"),
        p25: toPath("p25"), p5: toPath("p5"),
      },
      fills: {
        upperInner: toFill("p75", "p50"),
        upperOuter: toFill("p95", "p75"),
        lowerInner: toFill("p50", "p25"),
        lowerOuter: toFill("p25", "p5"),
      },
      tx, ty, priceTicks, totalDays,
    };
  }, [d, derived, dims]);

  if (!d || !derived || !chart) return null;

  const { S0 } = d;

  // Crosshair
  const handleMouseMove = (e) => {
    if (!svgRef.current || !chart) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width * chart.W;
    if (mouseX < chart.pad.left || mouseX > chart.W - chart.pad.right) { setHover(null); return; }

    const day = Math.round((mouseX - chart.pad.left) / (chart.W - chart.pad.left - chart.pad.right) * chart.totalDays);
    const closest = chart.pctSeries.reduce((best, r) => Math.abs(r.day - day) < Math.abs(best.day - day) ? r : best);

    setHover({
      x: chart.tx(closest.day),
      day: closest.day,
      p5: closest.p5, p25: closest.p25, p50: closest.p50, p75: closest.p75, p95: closest.p95,
    });
  };

  return (
    <>
      {/* ── Title ── */}
      <div className="page-pad" style={{ padding: "32px 24px 24px" }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.95, margin: 0,
        }}>
          {tr("mc.heading")}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <span style={{ fontFamily: bd, fontSize: 13, color: t.faint }}>BTC</span>
          <span style={{ fontFamily: mn, fontSize: 24, fontWeight: 700, color: t.cream, letterSpacing: "-0.02em" }}>
            {fmtK(S0)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "fi 2s ease-in-out infinite alternate",
            }} />
            <span style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>{tr("live")}</span>
          </div>
        </div>
        <p style={{
          fontFamily: bd, fontSize: "clamp(13px, 1.2vw, 15px)",
          color: t.faint, lineHeight: 1.55,
          maxWidth: 640, margin: "14px 0 0",
        }}>
          {tr("mc.intro").replace("{price}", fmtK(S0))}
        </p>
      </div>

      {/* ── Chart — full bleed ── */}
      <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Entry price line */}
          <line x1={chart.pad.left} y1={chart.entryY} x2={chart.W - chart.pad.right} y2={chart.entryY}
            stroke={t.cream} strokeWidth={0.5} opacity={0.15} strokeDasharray="3 3" />

          {/* Fills — green above median, red below */}
          <path d={chart.fills.upperOuter} fill="#27AE60" opacity={0.04} />
          <path d={chart.fills.upperInner} fill="#27AE60" opacity={0.10} />
          <path d={chart.fills.lowerInner} fill="#EB5757" opacity={0.08} />
          <path d={chart.fills.lowerOuter} fill="#EB5757" opacity={0.04} />

          {/* Lines */}
          <path d={chart.paths.p95} stroke="#27AE60" strokeWidth={0.7} fill="none" strokeDasharray="4 3" opacity={0.3} />
          <path d={chart.paths.p75} stroke="#27AE60" strokeWidth={0.7} fill="none" strokeDasharray="4 3" opacity={0.4} />
          <path d={chart.paths.p50} stroke={t.cream} strokeWidth={2} fill="none" opacity={0.7} />
          <path d={chart.paths.p25} stroke="#EB5757" strokeWidth={0.7} fill="none" strokeDasharray="4 3" opacity={0.4} />
          <path d={chart.paths.p5} stroke="#EB5757" strokeWidth={0.7} fill="none" strokeDasharray="4 3" opacity={0.3} />

          {/* 1Y marker */}
          <line x1={chart.x1y} y1={chart.pad.top} x2={chart.x1y} y2={chart.H - chart.pad.bottom}
            stroke={t.border} strokeWidth={0.5} strokeDasharray="4 4" />
          <text x={chart.x1y} y={chart.H - chart.pad.bottom + 16} fill={t.faint} fontSize={10} textAnchor="middle" fontFamily={bd}>
            {tr("mc.oneYear")}
          </text>

          {/* Y axis price ticks */}
          {chart.priceTicks.map(tick => (
            <g key={tick.label}>
              <line x1={chart.pad.left - 5} y1={tick.y} x2={chart.pad.left} y2={tick.y} stroke={t.border} strokeWidth={0.5} />
              <text x={chart.pad.left - 10} y={tick.y + 3} fill={t.faint} fontSize={9} textAnchor="end" fontFamily={mn}>
                {tick.label}
              </text>
            </g>
          ))}

          {/* YOU'RE HERE */}
          <circle cx={chart.pad.left} cy={chart.entryY} r={5} fill={t.cream} stroke={t.bg} strokeWidth={2} />
          <text x={chart.pad.left} y={chart.entryY - 12} fill={t.cream} fontSize={9} fontWeight={600} textAnchor="middle" fontFamily={bd}>
            {tr("mc.youAreHere")}
          </text>

          {/* Entry price label right */}
          <text x={chart.W - chart.pad.right + 10} y={chart.entryY + 3} fill={t.faint} fontSize={9} fontFamily={bd}>
            {tr("mc.yourEntry").replace("{price}", fmtK(S0))}
          </text>

          {/* 3Y endpoint labels — with collision avoidance */}
          {(() => {
            const rx = chart.W - chart.pad.right + 10;
            const labels = [
              { key: "p95", y: chart.ty(chart.last.p95), label: tr("hero.best"),    value: fmtK(chart.last.p95), color: "#27AE60", op: 0.6 },
              { key: "p75", y: chart.ty(chart.last.p75), label: tr("mc.top25"),     value: fmtK(chart.last.p75), color: "#27AE60", op: 0.7 },
              { key: "p50", y: chart.ty(chart.last.p50), label: tr("mc.median"),    value: fmtK(chart.last.p50), color: t.cream,   op: 1, highlight: true },
              { key: "p25", y: chart.ty(chart.last.p25), label: tr("mc.bottom25"),  value: fmtK(chart.last.p25), color: "#EB5757", op: 0.7 },
              { key: "p5",  y: chart.ty(chart.last.p5),  label: tr("mc.worstCase"), value: fmtK(chart.last.p5),  color: "#EB5757", op: 0.6 },
            ];
            // Spread labels to avoid overlap (min 22px apart)
            const minGap = 22;
            for (let i = 1; i < labels.length; i++) {
              if (labels[i].y - labels[i - 1].y < minGap) {
                labels[i].y = labels[i - 1].y + minGap;
              }
            }
            return labels.map(l => (
              <g key={l.key} opacity={l.op}>
                {l.highlight && <rect x={rx - 2} y={l.y - 14} width={110} height={26} rx={2} fill={t.cream} opacity={0.08} />}
                <text x={l.highlight ? rx + 4 : rx} y={l.y - 2} fill={l.color} fontSize={9} fontFamily={bd} fontWeight={l.highlight ? 500 : 400}>{l.label}</text>
                <text x={l.highlight ? rx + 4 : rx} y={l.y + 10} fill={l.color} fontSize={l.highlight ? 11 : 10} fontFamily={mn} fontWeight={l.highlight ? 700 : 600}>{l.value}</text>
              </g>
            ));
          })()}

          {/* Crosshair */}
          {hover && (
            <g>
              <line x1={hover.x} y1={chart.pad.top} x2={hover.x} y2={chart.H - chart.pad.bottom}
                stroke={t.cream} strokeWidth={0.5} opacity={0.3} />
              <circle cx={hover.x} cy={chart.ty(hover.p50)} r={3} fill={t.cream} />
              <rect x={hover.x + 10} y={chart.ty(hover.p50) - 42} width={130} height={80} rx={2} fill={t.bg} stroke={t.border} strokeWidth={0.5} opacity={0.95} />
              <text x={hover.x + 18} y={chart.ty(hover.p50) - 28} fill={t.faint} fontSize={9} fontFamily={bd}>
                {hover.day < 365 ? `${Math.round(hover.day / 30)}m` : `${(hover.day / 365).toFixed(1)}y`}
              </text>
              <text x={hover.x + 18} y={chart.ty(hover.p50) - 14} fill={t.cream} fontSize={11} fontFamily={mn} fontWeight={600}>
                {tr("mc.crosshair.median").replace("{price}", fmtK(hover.p50))}
              </text>
              <text x={hover.x + 18} y={chart.ty(hover.p50) + 2} fill="#27AE60" fontSize={9} fontFamily={mn} opacity={0.7}>
                {tr("mc.crosshair.best").replace("{price}", fmtK(hover.p95))}
              </text>
              <text x={hover.x + 18} y={chart.ty(hover.p50) + 14} fill="#EB5757" fontSize={9} fontFamily={mn} opacity={0.7}>
                {tr("mc.crosshair.worst").replace("{price}", fmtK(hover.p5))}
              </text>
              <text x={hover.x + 18} y={chart.ty(hover.p50) + 28} fill={t.faint} fontSize={9} fontFamily={mn}>
                {tr("mc.crosshair.range").replace("{p25}", fmtK(hover.p25)).replace("{p75}", fmtK(hover.p75))}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ── Strip ── */}
      <div className="page-pad" style={{ padding: "0 24px" }}>
        <div className="grid-3" style={{ borderTop: `1px solid ${t.border}` }}>
          {/* {tr("mc.hold1y")} */}
          <div style={{ padding: "24px 20px", borderRight: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              {tr("mc.hold1y")}
            </div>
            <div style={{ fontFamily: bd, fontSize: 13, color: t.faint, lineHeight: 1.5, marginBottom: 6 }}>
              {chart.worst1y >= S0
                ? tr("mc.evenInWorst")
                : tr("mc.lossChance").replace("{pct}", chart.loss1y.toFixed(0))
              }
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: mn, fontSize: 28, fontWeight: 700, color: chart.worst1y >= S0 ? "#27AE60" : "#EB5757" }}>
                {fmtK(chart.worst1y)}
              </span>
              <span style={{ fontFamily: mn, fontSize: 12, color: chart.worst1y >= S0 ? "#27AE60" : "#EB5757" }}>
                {((chart.worst1y - S0) / S0 * 100) >= 0 ? "+" : ""}{((chart.worst1y - S0) / S0 * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 4 }}>{tr("mc.worstCaseLabel")}</div>
          </div>

          {/* {tr("mc.hold3y")} */}
          <div style={{ padding: "24px 20px", borderRight: `1px solid ${t.border}` }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              {tr("mc.hold3y")}
            </div>
            <div style={{ fontFamily: bd, fontSize: 13, color: t.faint, lineHeight: 1.5, marginBottom: 6 }}>
              {chart.worst3y >= S0
                ? tr("mc.evenInWorst")
                : tr("mc.lossChance").replace("{pct}", chart.loss3y.toFixed(0))
              }
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: mn, fontSize: 28, fontWeight: 700, color: chart.worst3y >= S0 ? "#27AE60" : "#EB5757" }}>
                {fmtK(chart.worst3y)}
              </span>
              <span style={{ fontFamily: mn, fontSize: 12, color: chart.worst3y >= S0 ? "#27AE60" : "#EB5757" }}>
                {((chart.worst3y - S0) / S0 * 100) >= 0 ? "+" : ""}{((chart.worst3y - S0) / S0 * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 4 }}>{tr("mc.worstCaseLabel")}</div>
          </div>

          {/* Median */}
          <div style={{ padding: "24px 20px" }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              {tr("mc.medianTitle")}
            </div>
            <div style={{ fontFamily: bd, fontSize: 13, color: t.faint, lineHeight: 1.5, marginBottom: 6 }}>
              {tr("mc.scenarioBecomes").replace("{price}", fmtK(S0))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: mn, fontSize: 28, fontWeight: 700, color: t.cream }}>{fmtK(chart.last.p50)}</span>
              <span style={{ fontFamily: mn, fontSize: 12, color: "#27AE60" }}>
                +{((chart.last.p50 - S0) / S0 * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ fontFamily: bd, fontSize: 11, color: t.faint, marginTop: 4 }}>{tr("mc.mostLikely")}</div>
          </div>
        </div>

        {/* ── Toggles ── */}
        <Toggle label={tr("mc.howToRead")} textOnly>
          <p style={{ fontFamily: bd, fontSize: 15, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            {tr("mc.howToReadDesc")}
          </p>
        </Toggle>
        <Toggle label={tr("mc.ourModel")} textOnly>
          <p style={{ fontFamily: bd, fontSize: 15, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            {tr("mc.ourModelDesc")}
          </p>
        </Toggle>
      </div>
    </>
  );
}
