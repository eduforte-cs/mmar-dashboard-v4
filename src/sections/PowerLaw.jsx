import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK, daysSinceGenesis } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";
import Toggle from "../components/Toggle";

export default function PowerLaw({ d, derived }) {
  const { t } = useTheme();
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 1200, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        const h = Math.max(360, window.innerHeight - 220);
        setDims({ w: Math.round(width), h: Math.round(h) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chart = useMemo(() => {
    if (!d || !derived) return null;
    const { a, b, t0, S0, resMean, resStd, resFloor, ransac, sigmaChart, lastDate } = d;
    const { supportPrice } = derived;

    // ── SVG layout — uses actual container dimensions ──
    const W = dims.w, H = dims.h;
    const pad = { top: 30, right: 20, bottom: 70, left: 70 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // ── Time range: ~2 years back, ~4 years forward ──
    const daysBack = 365 * 2;
    const daysForward = 365 * 4;
    const totalDays = daysBack + daysForward;
    const tStart = t0 - daysBack;
    const tEnd = t0 + daysForward;

    const tx = (tDay) => pad.left + ((tDay - tStart) / totalDays) * cw;

    // ── Price axis: log10 scale ──
    const pricePoints = [
      Math.exp(Math.log(plPrice(a, b, tEnd)) + resMean + 2 * resStd),
      ransac ? Math.exp(ransac.a + ransac.b * Math.log(Math.max(tStart, 1)) + ransac.floor) : plPrice(a, b, Math.max(tStart, 1)) * 0.3,
      S0,
    ];
    // Add historical prices for proper ranging
    const histPrices = (sigmaChart || []).map(p => p.price).filter(p => p > 0);
    const allP = [...pricePoints, ...histPrices];
    const logMin = Math.floor(Math.log10(Math.min(...allP) * 0.6) * 2) / 2;
    const logMax = Math.ceil(Math.log10(Math.max(...allP) * 1.5) * 2) / 2;

    const ty = (price) => {
      const lp = Math.log10(Math.max(price, 1));
      return pad.top + ch - ((lp - logMin) / (logMax - logMin)) * ch;
    };

    // ── Corridor bands ──
    const steps = 80;
    const bandKeys = ["bubble", "ceiling", "fair", "discount", "support"];
    const bands = {};
    bandKeys.forEach(k => bands[k] = []);

    for (let i = 0; i <= steps; i++) {
      const tDay = tStart + (i / steps) * totalDays;
      if (tDay <= 100) continue;
      const plV = plPrice(a, b, tDay);
      const x = tx(tDay);
      bands.bubble.push([x, ty(Math.exp(Math.log(plV) + resMean + 2 * resStd))]);
      bands.ceiling.push([x, ty(Math.exp(Math.log(plV) + resMean + resStd))]);
      bands.fair.push([x, ty(plV)]);
      bands.discount.push([x, ty(Math.exp(Math.log(plV) + resMean - 0.5 * resStd))]);
      const supP = ransac
        ? Math.exp(ransac.a + ransac.b * Math.log(tDay) + ransac.floor)
        : Math.exp(Math.log(plV) + resFloor);
      bands.support.push([x, ty(supP)]);
    }

    const toPath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

    // ── Corridor fill polygon (ceiling to support) ──
    const corridorFill = bands.ceiling.length > 0
      ? [...bands.ceiling, ...[...bands.support].reverse()]
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          .join(" ") + " Z"
      : "";

    // ── Historical price path (from sigmaChart) ──
    const genesisMs = new Date("2009-01-03").getTime();
    const dayMs = 86400000;
    const histPath = (sigmaChart || [])
      .filter(p => {
        const pDate = new Date(p.fullDate || p.date);
        const pT = (pDate.getTime() - genesisMs) / dayMs;
        return pT >= tStart && pT <= t0 && p.price > 0;
      })
      .map(p => {
        const pDate = new Date(p.fullDate || p.date);
        const pT = (pDate.getTime() - genesisMs) / dayMs;
        return [tx(pT), ty(p.price)];
      });

    const histPathStr = histPath.length > 1 ? toPath(histPath) : "";

    // ── Today position ──
    const todayX = tx(t0);
    const todayY = ty(S0);

    // ── Horizon targets ──
    const t1y = t0 + 365;
    const t3y = t0 + 365 * 3;
    const fv1y = plPrice(a, b, t1y);
    const fv3y = plPrice(a, b, t3y);
    const wc1y = ransac ? Math.exp(ransac.a + ransac.b * Math.log(t1y) + ransac.floor) : Math.exp(Math.log(fv1y) + resFloor);
    const wc3y = ransac ? Math.exp(ransac.a + ransac.b * Math.log(t3y) + ransac.floor) : Math.exp(Math.log(fv3y) + resFloor);

    const fv1yX = tx(t1y), fv1yY = ty(fv1y);
    const wc1yX = tx(t1y), wc1yY = ty(wc1y);
    const fv3yX = tx(t3y), fv3yY = ty(fv3y);
    const wc3yX = tx(t3y), wc3yY = ty(wc3y);

    // ── Year ticks on X axis ──
    const years = [2024, 2025, 2026, 2027, 2028, 2029];
    const yearTicks = years.map(y => {
      const tDay = daysSinceGenesis(`${y}-01-01`);
      return { year: y, x: tx(tDay), isToday: y === new Date().getFullYear() };
    }).filter(yt => yt.x >= pad.left && yt.x <= W - pad.right);

    // ── Price ticks on Y axis ──
    const priceTicks = [10000, 50000, 100000, 200000, 500000, 1000000]
      .filter(p => Math.log10(p) >= logMin && Math.log10(p) <= logMax)
      .map(p => ({ price: p, y: ty(p), label: fmtK(p) }));

    // ── Percentages ──
    const pctFV_today = ((plPrice(a, b, t0) - S0) / S0 * 100);
    const pctWC_today = ((supportPrice - S0) / S0 * 100);
    const pctFV_1y = ((fv1y - S0) / S0 * 100);
    const pctWC_1y = ((wc1y - S0) / S0 * 100);
    const pctFV_3y = ((fv3y - S0) / S0 * 100);
    const pctWC_3y = ((wc3y - S0) / S0 * 100);

    // Fair value label positions on band lines
    const fairLabelX = tx(tStart + totalDays * 0.25);
    const fairLabelIdx = Math.round(steps * 0.25);

    return {
      W, H, pad,
      bands, toPath, corridorFill,
      histPathStr,
      todayX, todayY,
      fv1yX, fv1yY, wc1yX, wc1yY,
      fv3yX, fv3yY, wc3yX, wc3yY,
      fv1y, wc1y, fv3y, wc3y,
      yearTicks, priceTicks,
      pctFV_today, pctWC_today, pctFV_1y, pctWC_1y, pctFV_3y, pctWC_3y,
      fairLabelX,
      fairLabelY: bands.fair[fairLabelIdx]?.[1] || 200,
      bubbleLabelY: bands.bubble[fairLabelIdx]?.[1] || 100,
      supportLabelY: bands.support[fairLabelIdx]?.[1] || 320,
      plToday: plPrice(a, b, t0),
    };
  }, [d, derived, dims]);

  if (!d || !derived || !chart) return null;

  const { S0 } = d;
  const { supportPrice } = derived;

  return (
    <>
      {/* Title + BTC Price */}
      <div className="page-pad" style={{ padding: "32px 24px 0" }}>
        <h1 className="hero-title" style={{
          fontFamily: bd, fontSize: 36, fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.95, margin: 0,
        }}>
          Power Law
        </h1>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
          <span style={{
            fontFamily: bd, fontSize: 13, fontWeight: 500,
            color: t.faint, letterSpacing: "0.04em",
          }}>
            BTC
          </span>
          <span style={{
            fontFamily: mn, fontSize: 32, fontWeight: 500,
            color: t.cream, letterSpacing: "-0.02em",
          }}>
            {fmtK(S0)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "fi 2s ease-in-out infinite alternate",
            }} />
            <span style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>Live</span>
          </div>
        </div>
      </div>

      {/* Chart — full width, fills viewport */}
      <div ref={containerRef} style={{ margin: "24px 0 0", height: `calc(100vh - 220px)`, minHeight: 360 }}>
        {chart && (
        <svg
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          width={chart.W}
          height={chart.H}
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          {/* Axes */}
          <line x1={chart.pad.left} y1={chart.pad.top} x2={chart.pad.left} y2={chart.H - chart.pad.bottom} stroke={t.border} strokeWidth="0.5" />
          <line x1={chart.pad.left} y1={chart.H - chart.pad.bottom} x2={chart.W - chart.pad.right} y2={chart.H - chart.pad.bottom} stroke={t.border} strokeWidth="0.5" />

          {/* Year ticks */}
          {chart.yearTicks.map(yt => (
            <text key={yt.year} x={yt.x} y={chart.H - chart.pad.bottom + 20}
              fill={yt.isToday ? t.faint : t.ghost} fontSize={yt.isToday ? 11 : 10}
              fontFamily="monospace" fontWeight={yt.isToday ? 500 : 400} textAnchor="middle">
              {yt.year}
            </text>
          ))}

          {/* Price ticks + grid */}
          {chart.priceTicks.map(pt => (
            <g key={pt.price}>
              <line x1={chart.pad.left} y1={pt.y} x2={chart.W - chart.pad.right} y2={pt.y}
                stroke={t.borderFaint} strokeWidth="0.5" strokeDasharray="2 4" />
              <text x={chart.pad.left - 8} y={pt.y + 3}
                fill={t.ghost} fontSize={9} fontFamily="monospace" textAnchor="end">
                {pt.label}
              </text>
            </g>
          ))}

          {/* Corridor fill */}
          <path d={chart.corridorFill} fill={t.cream} opacity={0.02} />

          {/* Band lines */}
          <path d={chart.toPath(chart.bands.bubble)} stroke={t.faint} strokeWidth={0.5} fill="none" strokeDasharray="3 3" opacity={0.3} />
          <path d={chart.toPath(chart.bands.ceiling)} stroke={t.faint} strokeWidth={0.5} fill="none" strokeDasharray="3 3" opacity={0.25} />
          <path d={chart.toPath(chart.bands.fair)} stroke={t.cream} strokeWidth={1} fill="none" opacity={0.35} />
          <path d={chart.toPath(chart.bands.discount)} stroke={t.faint} strokeWidth={0.5} fill="none" strokeDasharray="3 3" opacity={0.25} />
          <path d={chart.toPath(chart.bands.support)} stroke={t.faint} strokeWidth={0.5} fill="none" strokeDasharray="3 3" opacity={0.3} />

          {/* Band labels */}
          <text x={chart.fairLabelX} y={chart.fairLabelY - 8} fill={t.cream} fontSize={9} fontFamily={bd} opacity={0.2}>Fair value</text>
          <text x={chart.fairLabelX} y={chart.bubbleLabelY - 8} fill={t.faint} fontSize={9} fontFamily={bd} opacity={0.15}>Bubble zone</text>
          <text x={chart.fairLabelX} y={chart.supportLabelY + 14} fill={t.faint} fontSize={9} fontFamily={bd} opacity={0.15}>Support</text>

          {/* Historical price */}
          {chart.histPathStr && (
            <path d={chart.histPathStr} stroke={t.cream} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Today vertical line */}
          <line x1={chart.todayX} y1={chart.pad.top} x2={chart.todayX} y2={chart.H - chart.pad.bottom}
            stroke={t.faint} strokeWidth={0.5} strokeDasharray="1 3" opacity={0.4} />

          {/* Today dot */}
          <circle cx={chart.todayX} cy={chart.todayY} r={5} fill={t.cream} />

          {/* YOU'RE HERE label */}
          <text x={chart.todayX} y={chart.todayY - 22} fill={t.cream}
            fontSize={9} fontFamily={bd} fontWeight={700} textAnchor="middle" letterSpacing="0.1em">
            YOU'RE HERE
          </text>
          <text x={chart.todayX} y={chart.todayY - 10} fill={t.cream}
            fontSize={11} fontFamily="monospace" fontWeight={500} textAnchor="middle" opacity={0.7}>
            {fmtK(S0)}
          </text>

          {/* Fan lines — 1Y */}
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.fv1yX} y2={chart.fv1yY}
            stroke={t.cream} strokeWidth={1.5} opacity={0.7} />
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.wc1yX} y2={chart.wc1yY}
            stroke={t.faint} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />

          {/* Fan lines — 3Y */}
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.fv3yX} y2={chart.fv3yY}
            stroke={t.cream} strokeWidth={1.5} opacity={0.7} />
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.wc3yX} y2={chart.wc3yY}
            stroke={t.faint} strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />

          {/* Endpoint dots + labels — 1Y FV */}
          <circle cx={chart.fv1yX} cy={chart.fv1yY} r={4} fill="none" stroke={t.cream} strokeWidth={1.5} />
          <text x={chart.fv1yX} y={chart.fv1yY - 10} fill={t.cream}
            fontSize={11} fontFamily="monospace" fontWeight={500} textAnchor="middle">
            {fmtK(chart.fv1y)}
          </text>

          {/* 1Y Worst */}
          <circle cx={chart.wc1yX} cy={chart.wc1yY} r={3.5} fill="none" stroke={t.faint} strokeWidth={1} />
          <text x={chart.wc1yX} y={chart.wc1yY + 16} fill={t.faint}
            fontSize={10} fontFamily="monospace" textAnchor="middle">
            {fmtK(chart.wc1y)}
          </text>

          {/* 3Y FV */}
          <circle cx={chart.fv3yX} cy={chart.fv3yY} r={4} fill="none" stroke={t.cream} strokeWidth={1.5} />
          <text x={chart.fv3yX} y={chart.fv3yY - 10} fill={t.cream}
            fontSize={11} fontFamily="monospace" fontWeight={500} textAnchor="middle">
            {fmtK(chart.fv3y)}
          </text>

          {/* 3Y Worst */}
          <circle cx={chart.wc3yX} cy={chart.wc3yY} r={3.5} fill="none" stroke={t.faint} strokeWidth={1} />
          <text x={chart.wc3yX} y={chart.wc3yY + 16} fill={t.faint}
            fontSize={10} fontFamily="monospace" textAnchor="middle">
            {fmtK(chart.wc3y)}
          </text>

          {/* Horizon labels below axis */}
          <text x={chart.todayX} y={chart.H - chart.pad.bottom + 40} fill={t.faint}
            fontSize={9} fontFamily="monospace" textAnchor="middle">TODAY</text>
          <text x={chart.fv1yX} y={chart.H - chart.pad.bottom + 40} fill={t.ghost}
            fontSize={9} fontFamily="monospace" textAnchor="middle">1 YEAR</text>
          <text x={chart.fv3yX} y={chart.H - chart.pad.bottom + 40} fill={t.ghost}
            fontSize={9} fontFamily="monospace" textAnchor="middle">3 YEARS</text>
        </svg>
        )}
      </div>

      {/* Horizons strip */}
      <div className="page-pad" style={{ padding: "0 24px" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: `1px solid ${t.border}`,
      }}>
        {/* Today */}
        <div style={{ padding: "24px 20px 24px 0", borderRight: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Today</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Fair value</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>{fmtK(chart.plToday)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctFV_today >= 0 ? "+" : ""}{chart.pctFV_today.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Worst case</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.faint }}>{fmtK(supportPrice)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctWC_today.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* 1 Year */}
        <div style={{ padding: "24px 20px", borderRight: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>1 Year</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Fair value</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>{fmtK(chart.fv1y)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctFV_1y >= 0 ? "+" : ""}{chart.pctFV_1y.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Worst case</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.faint }}>{fmtK(chart.wc1y)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctWC_1y.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* 3 Years */}
        <div style={{ padding: "24px 0 24px 20px" }}>
          <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>3 Years</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Fair value</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>{fmtK(chart.fv3y)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctFV_3y >= 0 ? "+" : ""}{chart.pctFV_3y.toFixed(0)}%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: bd, fontSize: 9, color: t.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Worst case</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.cream }}>{fmtK(chart.wc3y)}</span>
              <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{chart.pctWC_3y >= 0 ? "+" : ""}{chart.pctWC_3y.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <Toggle label="How to read this" section="Guide" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            The middle line is fair value — where Bitcoin should be based on 16 years of data. Above it, you're paying a premium. Below it, you're getting a discount.
          </p>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            The bands show how far price has historically strayed, measured in σ. Every time Bitcoin reached +2σ, a correction followed. Every time it dropped below −1σ, a rally followed. The bottom line is the worst case: the lowest level Bitcoin has ever traded relative to trend. It has held through every crash since 2013.
          </p>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            The fan lines show where you'd be at each horizon: fair value (the trend target) and worst case (the historical floor). When even the worst case turns positive — that's the argument for holding through time.
          </p>
        </div>
      </Toggle>

      <Toggle label="Our Power Law model" section="Methodology" textOnly>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            Our model fits a power law growth curve to Bitcoin's entire 16-year price history using Weighted Least Squares (WLS) — a regression that gives more importance to recent data. Today's market, with deep liquidity and institutional participation, tells us more about where fair value sits than a $1 trade from 2011. The early data still shapes the long-term slope, but doesn't distort the present.
          </p>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            The support floor uses RANSAC — a robust regression that automatically ignores bubble peaks, fitting only to "normal mode" price action. Its minimum is the historical worst case. The bubble ceiling uses extreme value theory (EVT/GPD) fitted to actual historical extremes, giving us a data-driven cap instead of an arbitrary number.
          </p>
          <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: 0 }}>
            The original Bitcoin Power Law, proposed by Santostasi and popularized by Burger, uses ordinary least squares — where every data point weighs equally. Our WLS weighting, RANSAC floor, and EVT cap build on that same foundation with better calibration for today's market.
          </p>
        </div>
      </Toggle>
      </div>
    </>
  );
}
