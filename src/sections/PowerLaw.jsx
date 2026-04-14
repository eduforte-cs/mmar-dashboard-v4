import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import { fmtK, daysSinceGenesis } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";
import { allBands, supportFloor, bandsLog10 } from "../engine/bands.js";
import Toggle from "../components/Toggle";

export default function PowerLaw({ d, derived }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 1200, h: 500 });
  const [zoom, setZoom] = useState(0);

  // Zoom levels — labels resolved at render time via tr(labelKey).
  const ZOOM_LEVELS = [
    { back: 1.5, fwd: 3.5, labelKey: "pl.zoom.default" },     // 0
    { back: 3,   fwd: 5,   labelKey: "pl.zoom.5y" },          // 1
    { back: 6,   fwd: 6,   labelKey: "pl.zoom.10y" },         // 2
    { back: 10,  fwd: 8,   labelKey: "pl.zoom.all" },         // 3
    { back: 16,  fwd: 10,  labelKey: "pl.zoom.fullHistory" }, // 4
  ];

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

    // ── SVG layout — uses actual container dimensions ──
    const W = dims.w, H = dims.h;
    const pad = { top: 30, right: 20, bottom: 70, left: 70 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // ── Time range: driven by zoom level ──
    const zl = ZOOM_LEVELS[zoom] || ZOOM_LEVELS[0];
    const daysBack = Math.round(365 * zl.back);
    const daysForward = Math.round(365 * zl.fwd);
    const tMinVisible = daysSinceGenesis("2013-04-01"); // earliest reliable data
    const tStartRaw = t0 - daysBack;
    const tStart = Math.max(tStartRaw, tMinVisible);
    const tEnd = t0 + daysForward;
    const totalDays = tEnd - tStart;

    const tx = (tDay) => {
      const logT = Math.log10(Math.max(tDay, 1));
      const logStart = Math.log10(Math.max(tStart, 1));
      const logEnd = Math.log10(tEnd);
      return pad.left + ((logT - logStart) / (logEnd - logStart)) * cw;
    };

    // ── Price axis: log10 scale — auto-fit to visible data ──
    const plEnd = plPrice(a, b, tEnd);
    const ceilingEnd = Math.exp(Math.log(plEnd) + resMean + 1.2 * resStd);
    const tStartSafe = Math.max(tStart, 100);
    const supportStart = supportFloor(tStartSafe, { a, b, resFloor, ransac });

    // Include actual historical prices in range when zoomed out
    const histPricesInRange = (sigmaChart || [])
      .filter(p => {
        const pT = (new Date(p.fullDate || p.date).getTime() - new Date("2009-01-03").getTime()) / 86400000;
        return pT >= tStart && p.price > 0;
      })
      .map(p => p.price);

    const allVisiblePrices = [S0, supportStart, ceilingEnd, ...histPricesInRange];
    const lowestVisible = Math.min(...allVisiblePrices) * 0.75;
    const highestVisible = Math.max(...allVisiblePrices) * 1.15;
    const logMin = Math.log10(Math.max(lowestVisible, 0.01));
    const logMax = Math.log10(highestVisible);

    const ty = (price) => {
      const lp = Math.log10(Math.max(price, 1));
      return pad.top + ch - ((lp - logMin) / (logMax - logMin)) * ch;
    };

    // ── Corridor bands — via bands.js (single source of truth) ──
    const steps = 80;
    const bandKeys = ["bubble", "ceiling", "warm", "fair", "discount", "support"];
    const bands = {};
    bandKeys.forEach(k => bands[k] = []);
    const bandParams = { a, b, resMean, resStd, resFloor, ransac };

    for (let i = 0; i <= steps; i++) {
      const logStart = Math.log10(Math.max(tStart, 1));
      const logEnd = Math.log10(tEnd);
      const tDay = Math.pow(10, logStart + (i / steps) * (logEnd - logStart));
      if (tDay <= 100) continue;
      const x = tx(tDay);
      const b_ = allBands(tDay, bandParams);
      bands.bubble.push([x, ty(b_.bubble)]);
      bands.ceiling.push([x, ty(b_.ceiling)]);
      bands.warm.push([x, ty(b_.warm)]);
      bands.fair.push([x, ty(b_.fair)]);
      bands.discount.push([x, ty(b_.discount)]);
      bands.support.push([x, ty(b_.support)]);
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
    const wc1y = supportFloor(t1y, bandParams);
    const wc3y = supportFloor(t3y, bandParams);

    const fv1yX = tx(t1y), fv1yY = ty(fv1y);
    const wc1yX = tx(t1y), wc1yY = ty(wc1y);
    const fv3yX = tx(t3y), fv3yY = ty(fv3y);
    const wc3yX = tx(t3y), wc3yY = ty(wc3y);

    // ── Year ticks on X axis ──
    const years = [];
    const startYear = new Date(new Date("2009-01-03").getTime() + Math.max(tStart, 1) * 86400000).getFullYear();
    const endYear = new Date(new Date("2009-01-03").getTime() + tEnd * 86400000).getFullYear();
    // Pick a step that doesn't overcrowd: ≤10 labels
    const span = endYear - startYear;
    const step = span > 20 ? 4 : span > 12 ? 2 : 1;
    for (let y = Math.ceil(startYear / step) * step; y <= endYear; y += step) years.push(y);
    const yearTicks = years.map(y => {
      const tDay = daysSinceGenesis(`${y}-01-01`);
      return { year: y, x: tx(tDay), isToday: y === new Date().getFullYear() };
    }).filter(yt => yt.x >= pad.left && yt.x <= W - pad.right);

    // ── Price ticks on Y axis ──
    const priceTicks = [0.1, 1, 10, 100, 500, 1000, 2000, 5000, 10000, 20000, 30000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000, 2000000]
      .filter(p => Math.log10(p) >= logMin && Math.log10(p) <= logMax)
      .map(p => ({ price: p, y: ty(p), label: fmtK(p) }))
      .slice(0, 8);

    // ── Percentages ──
    const pctFV_today = ((plPrice(a, b, t0) - S0) / S0 * 100);
    const wcToday = supportFloor(t0, bandParams);
    const pctWC_today = ((wcToday - S0) / S0 * 100);
    const pctFV_1y = ((fv1y - S0) / S0 * 100);
    const pctWC_1y = ((wc1y - S0) / S0 * 100);
    const pctFV_3y = ((fv3y - S0) / S0 * 100);
    const pctWC_3y = ((wc3y - S0) / S0 * 100);

    // Fair value label positions on band lines
    const fairLabelTDay = Math.pow(10, Math.log10(Math.max(tStart, 1)) + 0.25 * (Math.log10(tEnd) - Math.log10(Math.max(tStart, 1))));
    const fairLabelX = tx(fairLabelTDay);
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
      wcToday,
      // Crosshair helpers
      tStart, tEnd, totalDays, t0, a, b, resMean, resStd, resFloor, ransac, tx, ty,
      histLookup: (sigmaChart || []).map(p => {
        const pDate = new Date(p.fullDate || p.date);
        const pT = (pDate.getTime() - genesisMs) / dayMs;
        return { tDay: pT, price: p.price };
      }).filter(h => h.tDay >= tStart && h.tDay <= t0 && h.price > 0),
    };
  }, [d, derived, dims, zoom]);

  if (!d || !derived || !chart) return null;

  const { S0 } = d;

  // ── Crosshair state ──
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg || !chart) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / rect.width * chart.W;
    const mouseY = (e.clientY - rect.top) / rect.height * chart.H;

    // Out of chart area?
    if (mouseX < chart.pad.left || mouseX > chart.W - chart.pad.right ||
        mouseY < chart.pad.top || mouseY > chart.H - chart.pad.bottom) {
      setHover(null); return;
    }

    // X → tDay
    const logStart = Math.log10(Math.max(chart.tStart, 1));
    const logEnd = Math.log10(chart.tEnd);
    const frac = (mouseX - chart.pad.left) / (chart.W - chart.pad.left - chart.pad.right);
    const tDay = Math.pow(10, logStart + frac * (logEnd - logStart));

    // Date
    const genesisMs = new Date("2009-01-03").getTime();
    const date = new Date(genesisMs + tDay * 86400000);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    // PL values at this tDay — via bands.js
    const isFuture = tDay > chart.t0;
    const hoverBands = allBands(Math.max(tDay, 1), {
      a: chart.a, b: chart.b,
      resMean: chart.resMean, resStd: chart.resStd,
      resFloor: chart.resFloor, ransac: chart.ransac,
    });
    const fair = hoverBands.fair;
    const bubble = hoverBands.bubble;
    const ceiling = hoverBands.ceiling;
    const sup = hoverBands.support;

    // Historical price (nearest)
    let actualPrice = null;
    if (!isFuture && chart.histLookup.length > 0) {
      let closest = chart.histLookup[0];
      let minD = Math.abs(closest.tDay - tDay);
      for (const h of chart.histLookup) {
        const dd = Math.abs(h.tDay - tDay);
        if (dd < minD) { closest = h; minD = dd; }
      }
      if (minD < 30) actualPrice = closest.price;
    }

    const x = chart.tx(tDay);
    setHover({ x, dateStr, isFuture, fair, bubble, ceiling, sup, actualPrice });
  };

  return (
    <>
      {/* Title + BTC Price */}
      <div className="page-pad" style={{ padding: "32px 24px 0" }}>
        <h1 className="hero-title" style={{
          fontFamily: bd, fontSize: 36, fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em",
          lineHeight: 0.95, margin: 0,
        }}>
          {tr("pl.heading")}
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
            <span style={{ fontFamily: bd, fontSize: 11, color: t.faint }}>{tr("live")}</span>
          </div>
        </div>
      </div>

      {/* Chart — full width, fills viewport */}
      <div ref={containerRef} style={{ margin: "24px 0 0", height: `calc(100vh - 220px)`, minHeight: 360, position: "relative" }}>
        {/* Zoom controls */}
        <div style={{
          position: "absolute", top: 12, right: 24, zIndex: 2,
          display: "flex", alignItems: "center", gap: 0,
          border: `1px solid ${t.border}`, borderRadius: 4,
          background: t.bg, opacity: 0.9,
        }}>
          <button
            onClick={() => setZoom(z => Math.max(0, z - 1))}
            disabled={zoom === 0}
            style={{
              width: 32, height: 28, border: "none", background: "none",
              cursor: zoom === 0 ? "default" : "pointer",
              fontFamily: mn, fontSize: 16, fontWeight: 500,
              color: zoom === 0 ? t.ghost : t.cream,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRight: `1px solid ${t.border}`,
            }}
          >+</button>
          <button
            onClick={() => setZoom(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
            disabled={zoom === ZOOM_LEVELS.length - 1}
            style={{
              width: 32, height: 28, border: "none", background: "none",
              cursor: zoom === ZOOM_LEVELS.length - 1 ? "default" : "pointer",
              fontFamily: mn, fontSize: 16, fontWeight: 500,
              color: zoom === ZOOM_LEVELS.length - 1 ? t.ghost : t.cream,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >−</button>
        </div>
        {chart && (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          width={chart.W}
          height={chart.H}
          style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
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
          <path d={chart.corridorFill} fill={t.cream} opacity={0.05} />

          {/* Band lines */}
          <path d={chart.toPath(chart.bands.bubble)} stroke={t.faint} strokeWidth={1} fill="none" strokeDasharray="6 4" opacity={0.5} />
          <path d={chart.toPath(chart.bands.ceiling)} stroke={t.faint} strokeWidth={0.8} fill="none" strokeDasharray="5 3" opacity={0.4} />
          <path d={chart.toPath(chart.bands.warm)} stroke={t.faint} strokeWidth={0.6} fill="none" strokeDasharray="4 3" opacity={0.3} />
          <path d={chart.toPath(chart.bands.fair)} stroke={t.cream} strokeWidth={1.5} fill="none" opacity={0.6} />
          <path d={chart.toPath(chart.bands.discount)} stroke={t.faint} strokeWidth={0.8} fill="none" strokeDasharray="5 3" opacity={0.4} />
          <path d={chart.toPath(chart.bands.support)} stroke={t.faint} strokeWidth={1} fill="none" strokeDasharray="6 4" opacity={0.5} />

          {/* Band labels */}
          <text x={chart.fairLabelX} y={chart.fairLabelY - 8} fill={t.cream} fontSize={10} fontFamily={bd} opacity={0.4}>{tr("pl.bandFairValue")}</text>
          <text x={chart.fairLabelX} y={chart.bubbleLabelY - 8} fill={t.faint} fontSize={10} fontFamily={bd} opacity={0.35}>{tr("pl.bandBubbleZone")}</text>
          <text x={chart.fairLabelX} y={chart.supportLabelY + 14} fill={t.faint} fontSize={10} fontFamily={bd} opacity={0.35}>{tr("pl.bandSupport")}</text>

          {/* Historical price */}
          {chart.histPathStr && (
            <path d={chart.histPathStr} stroke={t.cream} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Today vertical line */}
          <line x1={chart.todayX} y1={chart.pad.top} x2={chart.todayX} y2={chart.H - chart.pad.bottom}
            stroke={t.faint} strokeWidth={0.5} strokeDasharray="1 3" opacity={0.4} />

          {/* Today dot */}
          <circle cx={chart.todayX} cy={chart.todayY} r={6} fill={t.cream} />

          {/* YOU'RE HERE label */}
          <text x={chart.todayX} y={chart.todayY - 26} fill={t.cream}
            fontSize={11} fontFamily={bd} fontWeight={700} textAnchor="middle" letterSpacing="0.1em">
            {tr("pl.youAreHere")}
          </text>
          <text x={chart.todayX} y={chart.todayY - 12} fill={t.cream}
            fontSize={13} fontFamily="monospace" fontWeight={500} textAnchor="middle" opacity={0.7}>
            {fmtK(S0)}
          </text>

          {/* Fan lines — 1Y */}
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.fv1yX} y2={chart.fv1yY}
            stroke={t.cream} strokeWidth={2} opacity={0.85} />
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.wc1yX} y2={chart.wc1yY}
            stroke={t.faint} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.6} />

          {/* Fan lines — 3Y */}
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.fv3yX} y2={chart.fv3yY}
            stroke={t.cream} strokeWidth={2} opacity={0.85} />
          <line x1={chart.todayX} y1={chart.todayY} x2={chart.wc3yX} y2={chart.wc3yY}
            stroke={t.faint} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.6} />

          {/* Endpoint dots + labels — 1Y FV */}
          <circle cx={chart.fv1yX} cy={chart.fv1yY} r={5} fill="none" stroke={t.cream} strokeWidth={2} />
          <text x={chart.fv1yX} y={chart.fv1yY - 12} fill={t.cream}
            fontSize={13} fontFamily="monospace" fontWeight={500} textAnchor="middle">
            {fmtK(chart.fv1y)}
          </text>

          {/* 1Y Worst */}
          <circle cx={chart.wc1yX} cy={chart.wc1yY} r={4} fill="none" stroke={t.faint} strokeWidth={1.5} />
          <text x={chart.wc1yX} y={chart.wc1yY + 18} fill={t.faint}
            fontSize={12} fontFamily="monospace" textAnchor="middle">
            {fmtK(chart.wc1y)}
          </text>

          {/* 3Y FV */}
          <circle cx={chart.fv3yX} cy={chart.fv3yY} r={5} fill="none" stroke={t.cream} strokeWidth={2} />
          <text x={chart.fv3yX} y={chart.fv3yY - 12} fill={t.cream}
            fontSize={13} fontFamily="monospace" fontWeight={500} textAnchor="middle">
            {fmtK(chart.fv3y)}
          </text>

          {/* 3Y Worst */}
          <circle cx={chart.wc3yX} cy={chart.wc3yY} r={4} fill="none" stroke={t.faint} strokeWidth={1.5} />
          <text x={chart.wc3yX} y={chart.wc3yY + 18} fill={t.faint}
            fontSize={12} fontFamily="monospace" textAnchor="middle">
            {fmtK(chart.wc3y)}
          </text>

          {/* Horizon labels below axis */}
          <text x={chart.todayX} y={chart.H - chart.pad.bottom + 40} fill={t.faint}
            fontSize={9} fontFamily="monospace" textAnchor="middle">{tr("pl.todayLabel")}</text>
          <text x={chart.fv1yX} y={chart.H - chart.pad.bottom + 40} fill={t.ghost}
            fontSize={9} fontFamily="monospace" textAnchor="middle">{tr("pl.oneYearLabel")}</text>
          <text x={chart.fv3yX} y={chart.H - chart.pad.bottom + 40} fill={t.ghost}
            fontSize={9} fontFamily="monospace" textAnchor="middle">{tr("pl.threeYearsLabel")}</text>

          {/* ── Crosshair ── */}
          {hover && (
            <g>
              {/* Vertical line */}
              <line x1={hover.x} y1={chart.pad.top} x2={hover.x} y2={chart.H - chart.pad.bottom}
                stroke={t.cream} strokeWidth={0.5} opacity={0.3} />

              {/* Dots on bands */}
              <circle cx={hover.x} cy={chart.ty(hover.fair)} r={3} fill={t.cream} opacity={0.7} />
              <circle cx={hover.x} cy={chart.ty(hover.sup)} r={2.5} fill={t.faint} opacity={0.5} />
              <circle cx={hover.x} cy={chart.ty(hover.bubble)} r={2.5} fill={t.faint} opacity={0.5} />
              {hover.actualPrice && (
                <circle cx={hover.x} cy={chart.ty(hover.actualPrice)} r={3.5} fill={t.cream} />
              )}

              {/* Tooltip panel */}
              {(() => {
                const tipW = 150, tipH = hover.actualPrice ? 110 : 88;
                const flipX = hover.x > chart.W * 0.65;
                const tipX = flipX ? hover.x - tipW - 16 : hover.x + 16;
                const tipY = Math.max(chart.pad.top + 10, Math.min(chart.H - chart.pad.bottom - tipH - 10, chart.ty(hover.fair) - tipH / 2));
                return (
                  <g>
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={4}
                      fill={t.bg} stroke={t.border} strokeWidth={0.5} opacity={0.95} />

                    {/* Date */}
                    <text x={tipX + 12} y={tipY + 18} fill={t.faint} fontSize={10} fontFamily={bd}>
                      {hover.dateStr}{hover.isFuture ? tr("pl.tipProjected") : ""}
                    </text>

                    {/* Actual price (historical only) */}
                    {hover.actualPrice && (
                      <text x={tipX + 12} y={tipY + 36} fill={t.cream} fontSize={12} fontFamily="monospace" fontWeight={500}>
                        {tr("pl.tipBtc")} {fmtK(hover.actualPrice)}
                      </text>
                    )}

                    {/* Fair value */}
                    <text x={tipX + 12} y={tipY + (hover.actualPrice ? 56 : 40)} fill={t.faint} fontSize={9} fontFamily={bd}>
                      {tr("pl.bandFairValue")}
                    </text>
                    <text x={tipX + tipW - 12} y={tipY + (hover.actualPrice ? 56 : 40)} fill={t.cream} fontSize={11} fontFamily="monospace" textAnchor="end">
                      {fmtK(hover.fair)}
                    </text>

                    {/* Bubble */}
                    <text x={tipX + 12} y={tipY + (hover.actualPrice ? 74 : 58)} fill={t.faint} fontSize={9} fontFamily={bd}>
                      {tr("pl.bandBubbleZone")}
                    </text>
                    <text x={tipX + tipW - 12} y={tipY + (hover.actualPrice ? 74 : 58)} fill={t.faint} fontSize={11} fontFamily="monospace" textAnchor="end">
                      {fmtK(hover.bubble)}
                    </text>

                    {/* Support */}
                    <text x={tipX + 12} y={tipY + (hover.actualPrice ? 92 : 76)} fill={t.faint} fontSize={9} fontFamily={bd}>
                      {tr("pl.bandSupport")}
                    </text>
                    <text x={tipX + tipW - 12} y={tipY + (hover.actualPrice ? 92 : 76)} fill={t.faint} fontSize={11} fontFamily="monospace" textAnchor="end">
                      {fmtK(hover.sup)}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
        )}
      </div>

      {/* Horizons strip */}
      <div className="page-pad" style={{ padding: "0 24px" }}>
      <div className="grid-3" style={{
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
              <span style={{ fontFamily: mn, fontSize: 20, fontWeight: 500, color: t.faint }}>{fmtK(chart.wcToday)}</span>
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
