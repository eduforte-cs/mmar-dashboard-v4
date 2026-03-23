import React, { useState, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import CatLabel from "../components/CatLabel";
import { daysSinceGenesis } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";

// ── WpToggle ──
function WpToggle({ title, num, children, defaultOpen = true }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${t.border}` }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "baseline", gap: 12, width: "100%",
        textAlign: "left", padding: "28px 0", background: "none", border: "none", cursor: "pointer",
      }}>
        <span style={{ fontFamily: mn, fontSize: 11, color: t.ghost, minWidth: 20 }}>{num}</span>
        <span style={{ fontFamily: bd, fontSize: 18, fontWeight: 500, color: t.cream, lineHeight: 1.4 }}>{title}</span>
        <span style={{ fontFamily: mn, fontSize: 14, color: t.ghost, marginLeft: "auto" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", gap: 20, fontFamily: bd, fontSize: 11, color: t.faint, marginBottom: 20 }}>
            <span onClick={() => setOpen(false)} style={{ cursor: "pointer", borderBottom: `1px solid ${t.borderFaint}`, paddingBottom: 1 }}>Close</span>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

function P({ children }) {
  const { t } = useTheme();
  return <p style={{ fontFamily: bd, fontSize: 17, fontWeight: 400, color: t.cream, lineHeight: 1.7, margin: "0 0 16px" }}>{children}</p>;
}
function Dim({ children }) {
  const { t } = useTheme();
  return <span style={{ color: t.faint }}>{children}</span>;
}
function Em({ children }) {
  return <strong style={{ fontWeight: 600 }}>{children}</strong>;
}

// ── SVG 1: Power Law log-log ──
function PLChart({ d }) {
  const { t } = useTheme();
  const svg = useMemo(() => {
    if (!d?.sigmaChart?.length) return null;
    const { a, b, resMean, resStd } = d;
    const W = 680, H = 340;
    const pad = { top: 30, right: 20, bottom: 36, left: 60 };
    const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
    const raw = d.sigmaChart.filter((_, i) => i % 8 === 0 || i === d.sigmaChart.length - 1);
    const logT = raw.map(r => Math.log10(daysSinceGenesis(r.fullDate || r.date)));
    const logP = raw.map(r => Math.log10(r.price));
    const xMin = Math.min(...logT), xMax = Math.max(...logT);
    const yMin = Math.floor(Math.min(...logP) * 2) / 2, yMax = Math.ceil(Math.max(...logP) * 2) / 2 + 0.3;
    const tx = v => pad.left + (v - xMin) / (xMax - xMin) * cw;
    const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;
    const mkLine = (sigma = 0) => Array.from({ length: 41 }, (_, i) => {
      const lx = xMin + (xMax - xMin) * i / 40;
      const lp = (a + b * Math.log(Math.pow(10, lx)) + resMean + sigma * resStd) / Math.LN10;
      return `${tx(lx).toFixed(1)},${ty(lp).toFixed(1)}`;
    }).join(" ");
    const yTicks = [];
    for (let y = Math.ceil(yMin); y <= yMax; y += 1) yTicks.push({ v: y, label: "$" + Math.round(Math.pow(10, y)).toLocaleString() });
    const pricePath = raw.map((r, i) => `${tx(logT[i]).toFixed(1)},${ty(logP[i]).toFixed(1)}`).join(" ");
    const dots = raw.map((r, i) => ({
      cx: tx(logT[i]).toFixed(1), cy: ty(logP[i]).toFixed(1),
      color: r.sigma < -1 ? "#1B8A4A" : r.sigma < -0.5 ? "#27AE60" : r.sigma > 0.8 ? "#EB5757" : r.sigma > 0.5 ? "#F2994A" : "#666",
    }));
    return { W, H, pad, mkLine, yTicks, pricePath, dots, cw };
  }, [d]);
  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {svg.yTicks.map(tick => (
        <g key={tick.v}><line x1={svg.pad.left} y1={(svg.pad.top + svg.H - svg.pad.top - svg.pad.bottom - (tick.v - svg.yTicks[0].v + Math.ceil(svg.yTicks[0].v - 0.5)) / (svg.yTicks[svg.yTicks.length - 1].v - svg.yTicks[0].v + 1) * (svg.H - svg.pad.top - svg.pad.bottom))} x2={svg.W - svg.pad.right} y2={(svg.pad.top + svg.H - svg.pad.top - svg.pad.bottom - (tick.v - svg.yTicks[0].v + Math.ceil(svg.yTicks[0].v - 0.5)) / (svg.yTicks[svg.yTicks.length - 1].v - svg.yTicks[0].v + 1) * (svg.H - svg.pad.top - svg.pad.bottom))} stroke={t.border} strokeWidth={0.5} /></g>
      ))}
      <polyline points={svg.mkLine(2)} fill="none" stroke="#EB5757" strokeWidth={1} strokeDasharray="6 4" opacity={0.4} />
      <polyline points={svg.mkLine(0)} fill="none" stroke={t.cream} strokeWidth={1.5} opacity={0.35} />
      <polyline points={svg.mkLine(-1)} fill="none" stroke="#27AE60" strokeWidth={1} strokeDasharray="6 4" opacity={0.4} />
      <polyline points={svg.pricePath} fill="none" stroke={t.cream} strokeWidth={0.8} opacity={0.12} />
      {svg.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={1.8} fill={d.color} opacity={0.7} />)}
      <text x={svg.W - svg.pad.right - 4} y={svg.pad.top + 14} fill="#EB5757" fontSize={9} fontFamily={bd} textAnchor="end" opacity={0.5}>+2σ bubble zone</text>
      <text x={svg.W - svg.pad.right - 4} y={svg.H - svg.pad.bottom - 6} fill="#27AE60" fontSize={9} fontFamily={bd} textAnchor="end" opacity={0.5}>−1σ support</text>
      <text x={svg.pad.left + svg.cw / 2} y={svg.H - 6} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="middle">log time (days since genesis)</text>
    </svg>
  );
}

// ── SVG 2: OLS vs WLS ──
function DivergenceChart({ d }) {
  const { t } = useTheme();
  const svg = useMemo(() => {
    if (!d) return null;
    const { a, b } = d;
    const olsA = -17.016 * Math.LN10, olsB = 5.845;
    const W = 680, H = 200;
    const pad = { left: 60, right: 20, top: 20, bottom: 36 };
    const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
    const today = daysSinceGenesis(new Date().toISOString().slice(0, 10));
    const tStart = today * 0.6, tEnd = today + 365 * 3;
    const N = 30;
    const wls = [], ols = [];
    for (let i = 0; i <= N; i++) {
      const tD = tStart + (tEnd - tStart) * i / N;
      wls.push(Math.log10(plPrice(a, b, tD)));
      ols.push((olsA + olsB * Math.log(tD)) / Math.LN10);
    }
    const allY = [...wls, ...ols];
    const yMin = Math.min(...allY) - 0.1, yMax = Math.max(...allY) + 0.15;
    const tx = i => pad.left + (i / N) * cw;
    const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;
    const mk = pts => pts.map((y, i) => `${tx(i).toFixed(1)},${ty(y).toFixed(1)}`).join(" ");
    const todayI = Math.round((today - tStart) / (tEnd - tStart) * N);
    const yTicks = [];
    for (let y = Math.ceil(yMin * 2) / 2; y <= yMax; y += 0.5) yTicks.push({ v: y, label: "$" + Math.round(Math.pow(10, y) / 1000) + "k" });
    return { W, H, pad, wlsLine: mk(wls), olsLine: mk(ols), todayX: tx(todayI), yTicks, ty, wlsEnd: ty(wls[N]), olsEnd: ty(ols[N]), bVal: b.toFixed(2) };
  }, [d]);
  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {svg.yTicks.map(tick => (
        <g key={tick.v}><line x1={svg.pad.left} y1={svg.ty(tick.v)} x2={svg.W - svg.pad.right} y2={svg.ty(tick.v)} stroke={t.border} strokeWidth={0.3} /><text x={svg.pad.left - 6} y={svg.ty(tick.v) + 3} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="end">{tick.label}</text></g>
      ))}
      <line x1={svg.todayX} y1={svg.pad.top} x2={svg.todayX} y2={svg.H - svg.pad.bottom} stroke={t.border} strokeWidth={0.5} strokeDasharray="4 4" />
      <text x={svg.todayX} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={bd} textAnchor="middle">today</text>
      <polyline points={svg.olsLine} fill="none" stroke="#EB5757" strokeWidth={1.3} opacity={0.5} strokeDasharray="6 3" />
      <polyline points={svg.wlsLine} fill="none" stroke={t.cream} strokeWidth={1.8} />
      <text x={svg.W - svg.pad.right - 4} y={svg.olsEnd - 8} fill="#EB5757" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.6}>OLS b=5.85</text>
      <text x={svg.W - svg.pad.right - 4} y={svg.wlsEnd + 14} fill={t.cream} fontSize={10} fontFamily={bd} textAnchor="end">WLS b={svg.bVal}</text>
    </svg>
  );
}

// ── SVG 3: Fat tails ──
function FatTailsChart({ d }) {
  const { t } = useTheme();
  const svg = useMemo(() => {
    if (!d?.resReturns) return null;
    const returns = d.resReturns;
    const W = 680, H = 240;
    const pad = { left: 40, right: 20, top: 24, bottom: 36 };
    const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
    const nBins = 80, rMin = -0.12, rMax = 0.12, binW = (rMax - rMin) / nBins;
    const bins = Array(nBins).fill(0);
    let maxC = 0;
    for (const r of returns) { const idx = Math.floor((r - rMin) / binW); if (idx >= 0 && idx < nBins) { bins[idx]++; if (bins[idx] > maxC) maxC = bins[idx]; } }
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
    const gaussPts = Array.from({ length: nBins + 1 }, (_, i) => {
      const x = rMin + i * binW;
      const g = returns.length * binW * Math.exp(-0.5 * ((x - mean) / std) ** 2) / (std * Math.sqrt(2 * Math.PI));
      return `${(pad.left + (i / nBins) * cw).toFixed(1)},${(pad.top + ch - Math.min(1, g / maxC) * ch).toFixed(1)}`;
    }).join(" ");
    const bw = (cw / nBins) * 0.9;
    const rects = bins.map((c, i) => c > 0 ? {
      x: (pad.left + (i / nBins) * cw).toFixed(1),
      y: (pad.top + ch - (c / maxC) * ch).toFixed(1),
      h: ((c / maxC) * ch).toFixed(1),
      w: bw.toFixed(1),
      tail: Math.abs(rMin + (i + 0.5) * binW) > 0.05,
    } : null).filter(Boolean);
    return { W, H, pad, gaussPts, rects, cw, ch };
  }, [d]);
  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      <line x1={svg.pad.left} y1={svg.H - svg.pad.bottom} x2={svg.W - svg.pad.right} y2={svg.H - svg.pad.bottom} stroke={t.border} strokeWidth={0.5} />
      {svg.rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.tail ? "#EB5757" : t.faint} opacity={r.tail ? 0.5 : 0.25} rx={0.5} />)}
      <polyline points={svg.gaussPts} fill="none" stroke="#F2994A" strokeWidth={1.8} strokeDasharray="5 3" opacity={0.7} />
      <text x={svg.pad.left + 4} y={svg.pad.top + 14} fill="#EB5757" fontSize={10} fontFamily={bd} opacity={0.6}>Fat tails — actual</text>
      <text x={svg.pad.left + 4} y={svg.pad.top + 28} fill="#F2994A" fontSize={10} fontFamily={bd} opacity={0.6}>Normal distribution</text>
      <text x={svg.pad.left + svg.cw / 2} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="middle">Daily residual returns</text>
      <text x={svg.pad.left + 4} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={mn}>−12%</text>
      <text x={svg.W - svg.pad.right - 4} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="end">+12%</text>
    </svg>
  );
}

// ── SVG 4: Sigma ruler ──
function SigmaRuler({ d }) {
  const { t } = useTheme();
  if (!d) return null;
  const sig = d.sigmaFromPL || 0;
  const W = 680, H = 90, padL = 10, padR = 10, cw = W - padL - padR;
  const zones = [
    { label: "Strong Buy", min: -2.5, max: -1.0, color: "#1B8A4A", acc: "100%" },
    { label: "Buy",        min: -1.0, max: -0.5, color: "#27AE60", acc: "100%" },
    { label: "Accumulate", min: -0.5, max:  0,   color: "#6FCF97", acc: "100%" },
    { label: "Neutral",    min:  0,   max:  0.3, color: t.faint,   acc: "83%" },
    { label: "Caution",    min:  0.3, max:  0.5, color: "#E8A838", acc: "56%" },
    { label: "Reduce",     min:  0.5, max:  0.8, color: "#F2994A", acc: "33%" },
    { label: "Sell",       min:  0.8, max:  2.5, color: "#EB5757", acc: "0%" },
  ];
  const tx = v => padL + Math.max(0, Math.min(1, (v + 2.5) / 5)) * cw;
  const mx = tx(Math.max(-2.5, Math.min(2.5, sig)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {zones.map(z => { const x1 = tx(z.min), x2 = tx(z.max), mid = (x1 + x2) / 2; return (
        <g key={z.label}>
          <rect x={x1} y={24} width={x2 - x1} height={26} fill={z.color} opacity={0.15} rx={2} />
          <rect x={x1} y={24} width={x2 - x1} height={26} fill="none" stroke={z.color} strokeWidth={0.5} opacity={0.2} rx={2} />
          <text x={mid} y={18} fill={z.color} fontSize={8} fontFamily={bd} textAnchor="middle" fontWeight={500}>{z.label}</text>
          <text x={mid} y={66} fill={t.dim} fontSize={8} fontFamily={mn} textAnchor="middle">{z.acc}</text>
        </g>
      ); })}
      <line x1={mx} y1={22} x2={mx} y2={52} stroke={t.cream} strokeWidth={2.5} />
      <circle cx={mx} cy={37} r={5} fill={t.cream} />
      <text x={mx} y={82} fill={t.cream} fontSize={10} fontFamily={mn} textAnchor="middle" fontWeight={600}>σ = {sig.toFixed(2)}</text>
    </svg>
  );
}

// ── SVG 5: MC Calibration ──
function CalibrationChart({ d }) {
  const { t } = useTheme();
  const svg = useMemo(() => {
    const cal = d?.backtestResults?.calibrationBuckets;
    if (!cal) return null;
    const zones = cal.filter(b => b.n > 0);
    if (zones.length === 0) return null;
    const W = 680, rowH = 52;
    const H = zones.length * rowH + 50;
    const pad = { left: 120, right: 40, top: 20, bottom: 36 };
    const cw = W - pad.left - pad.right;
    const tx = v => pad.left + (v / 100) * cw;
    const barH = rowH * 0.32;
    const rows = zones.map((z, i) => {
      const y = pad.top + i * rowH;
      const predicted = parseFloat(z.pLossAvg) || 0;
      const actual = parseFloat(z.lossRate) || 0;
      return { label: z.label.replace(/\(.*\)/, "").trim(), y, predicted, actual, barH };
    });
    return { W, H, pad, tx, rows, cw };
  }, [d]);
  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}><line x1={svg.tx(v)} y1={svg.pad.top} x2={svg.tx(v)} y2={svg.H - svg.pad.bottom} stroke={t.border} strokeWidth={0.3} /><text x={svg.tx(v)} y={svg.H - svg.pad.bottom + 14} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="middle">{v}%</text></g>
      ))}
      {svg.rows.map(r => (
        <g key={r.label}>
          <text x={svg.pad.left - 8} y={r.y + r.barH + 8} fill={t.faint} fontSize={10} fontFamily={bd} textAnchor="end">{r.label}</text>
          <rect x={svg.tx(0)} y={r.y + 6} width={Math.max(3, svg.tx(r.predicted) - svg.tx(0))} height={r.barH} fill="#F2994A" opacity={0.5} rx={2} />
          <text x={svg.tx(r.predicted) + 5} y={r.y + 6 + r.barH - 3} fill="#F2994A" fontSize={9} fontFamily={mn} opacity={0.7}>{r.predicted.toFixed(0)}%</text>
          <rect x={svg.tx(0)} y={r.y + 6 + r.barH + 4} width={Math.max(3, svg.tx(r.actual) - svg.tx(0))} height={r.barH} fill={r.actual > 30 ? "#EB5757" : "#27AE60"} opacity={0.6} rx={2} />
          <text x={Math.max(svg.tx(r.actual) + 5, svg.tx(5))} y={r.y + 6 + r.barH * 2 + 1} fill={r.actual > 30 ? "#EB5757" : "#27AE60"} fontSize={9} fontFamily={mn} opacity={0.8}>{r.actual.toFixed(0)}%</text>
        </g>
      ))}
      <rect x={svg.pad.left} y={svg.H - 18} width={10} height={8} fill="#F2994A" opacity={0.5} rx={1} />
      <text x={svg.pad.left + 14} y={svg.H - 11} fill={t.faint} fontSize={9} fontFamily={bd}>MC predicted</text>
      <rect x={svg.pad.left + 120} y={svg.H - 18} width={10} height={8} fill="#EB5757" opacity={0.6} rx={1} />
      <text x={svg.pad.left + 134} y={svg.H - 11} fill={t.faint} fontSize={9} fontFamily={bd}>Actual loss rate</text>
    </svg>
  );
}

// ── Main ──
const SECTIONS = ["Foundation", "Divergence", "Fractals", "Simulation", "Signal", "Validation"];

export default function Whitepaper({ d }) {
  const { t } = useTheme();
  const [activeCat, setActiveCat] = useState("Foundation");

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* Title */}
      <div style={{ padding: "48px 0 36px", borderBottom: `1px solid ${t.border}` }}>
        <h2 style={{ fontFamily: bd, fontSize: 56, fontWeight: 800, color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>Whitepaper</h2>
        <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.5, margin: "12px 0 0", maxWidth: 560 }}>A quantitative framework for answering the only question that matters</p>
      </div>

      {/* Sub-nav */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${t.border}`, gap: 0, overflowX: "auto" }}>
        <span style={{ fontFamily: mn, fontSize: 10, color: t.ghost, padding: "14px 0", marginRight: "auto", whiteSpace: "nowrap" }}>7 sections</span>
        {SECTIONS.map(cat => (
          <span key={cat} onClick={() => { setActiveCat(cat); document.getElementById(`wp-${cat}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={{
            fontFamily: bd, fontSize: 13, fontWeight: 500, color: activeCat === cat ? t.cream : t.faint,
            padding: "14px 20px", cursor: "pointer", whiteSpace: "nowrap",
            borderBottom: activeCat === cat ? `2px solid ${t.cream}` : "2px solid transparent", marginBottom: -1,
          }}>{cat}</span>
        ))}
        <span style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "14px 20px", marginLeft: "auto", borderLeft: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>Edu Forte · CommonSense</span>
      </div>

      {/* 01–02 Foundation */}
      <div id="wp-Foundation">
        <CatLabel label="Foundation" />
        <WpToggle num="01" title="The question">
          <P>Everyone who looks at Bitcoin eventually asks the same thing: should I buy it now?</P>
          <P><Dim>The problem isn't information — there's too much of it. Twitter threads, YouTube analysts, on-chain metrics, technical indicators, macro takes. Most of it is noise dressed as signal. And the few tools that try to be rigorous tend to be either too academic to be useful or too simple to be honest.</Dim></P>
          <P>We wanted to build something different. A model that takes 16 years of daily price data, runs it through institutional-grade quantitative analysis, and gives you one answer: <Em>yes or no</Em>, with your actual odds of losing money at 1 year and 3 years.</P>
        </WpToggle>
        <WpToggle num="02" title="The Power Law foundation">
          <P>In 2019, Giovanni Santostasi published an observation that would become one of the most debated ideas in Bitcoin analysis: Bitcoin's price follows a power law. Not approximately — with an R² above 0.95 across the entire history of the asset.</P>
          <P><Dim>A power law means that when you plot price against time on a log-log scale, you get a straight line. Power laws appear in network effects, city sizes, earthquake magnitudes. They describe systems where growth decelerates as the system matures.</Dim></P>
          <P>Harold Christopher Burger popularized this into a model: fit an OLS regression in log-log space, draw standard deviation bands around it, and you get a corridor. The bottom is the support floor. The top is the bubble zone. Fair value is the line.</P>
          <PLChart d={d} />
          <P>It's an elegant framework. And it's largely correct. But it has three problems.</P>
        </WpToggle>
      </div>

      {/* 03 Divergence */}
      <div id="wp-Divergence">
        <CatLabel label="Divergence" />
        <WpToggle num="03" title="Where we diverge: WLS, RANSAC, EVT">
          <P><Em>Problem 1: OLS treats all data equally.</Em> <Dim>Burger's model gives the same weight to a $1 trade in 2011 and a $70,000 trade in 2024. But these are fundamentally different markets.</Dim></P>
          <P>Our fix: <Em>Weighted Least Squares</Em> with exponential decay. We give more weight to recent data using a 4-year half-life. The early data still shapes the long-term slope, but it doesn't distort the present. Our slope (b={d?.b?.toFixed(2) || "5.36"}) is lower than Burger's (b=5.85). That means our model sees Bitcoin's growth as decelerating — which is what you'd expect from a maturing asset.</P>
          <DivergenceChart d={d} />
          <P><Em>Problem 2: The support floor ignores bubbles.</Em> <Dim>OLS fits to all data, including bubble peaks. Those peaks pull the regression line up, making the floor unreliable during crashes — when you need it most.</Dim></P>
          <P>Our fix: <Em>RANSAC</Em> (Random Sample Consensus). A robust regression that excludes outliers automatically. The RANSAC fit has its own steeper slope, meaning the support envelope has its own structural dynamics — not just "fair value minus some sigma."</P>
          <P><Em>Problem 3: The bubble ceiling is arbitrary.</Em> <Dim>"+2.5σ" is a number chosen because it looks right on the chart.</Dim></P>
          <P>Our fix: <Em>Extreme Value Theory</Em> with a Generalized Pareto Distribution fitted to actual positive residuals above the 85th percentile. A data-driven cap instead of an arbitrary number.</P>
          <P><Dim>All three changes build on the same Power Law. We're not replacing Santostasi and Burger. We're calibrating their model for today's market.</Dim></P>
        </WpToggle>
      </div>

      {/* 04 Fractals */}
      <div id="wp-Fractals">
        <CatLabel label="Fractals" />
        <WpToggle num="04" title="Why normal models fail Bitcoin">
          <P>Bitcoin's daily returns have a kurtosis above 10. A normal distribution has a kurtosis of 3. Extreme moves happen 5 to 10 times more often than Gaussian models predict.</P>
          <FatTailsChart d={d} />
          <P><Dim>This isn't a quirk. It's structural. Bitcoin exhibits fat tails (extreme moves are common, not exceptional), volatility clustering (big moves follow big moves), and long memory (today's volatility correlates with volatility months ago, measured by the Hurst exponent H &gt; 0.55).</Dim></P>
          <P>Standard Monte Carlo assumes returns are independent and normally distributed. It misses all three. This is why traditional risk models chronically underestimate Bitcoin's tail risk.</P>
          <P>Our solution: <Em>Mandelbrot's Multifractal Model of Asset Returns (MMAR)</Em>. Benoît Mandelbrot proposed that financial markets are better described by multifractal processes than by Brownian motion. Volatility isn't random — it has a self-similar structure across time scales.</P>
          <P><Dim>We implement MMAR through DFA (Detrended Fluctuation Analysis) for the Hurst exponent, multifractal partition function for the intermittency parameter λ², and regime-switching Ornstein-Uhlenbeck for calm/volatile state detection.</Dim></P>
        </WpToggle>
      </div>

      {/* 05 Simulation */}
      <div id="wp-Simulation">
        <CatLabel label="Simulation" />
        <WpToggle num="05" title="2,000 possible futures">
          <P>With the Power Law giving structural fair value and MMAR giving realistic dynamics, we simulate 2,000 paths over a 3-year horizon. Each path uses fractal cascades, Hurst-correlated noise, empirical shock resampling, and a reflective floor at RANSAC support.</P>
          <P>What we deliberately excluded: <Em>the Ornstein-Uhlenbeck mean-reversion force</Em>. <Dim>Early versions pulled simulated prices back toward fair value. The problem: this artificially dampened tail risk. We found the paths were more honest when we let them run on pure MMAR/Hurst dynamics and used the Power Law only as a reference for measuring distance, not as a force in the simulation.</Dim></P>
          <P>From 2,000 paths we extract: percentiles at each horizon (P5 through P95), probability of loss at 1 month through 3 years, probability of reaching fair value, and probability of hitting the structural floor.</P>
        </WpToggle>
      </div>

      {/* 06 Signal */}
      <div id="wp-Signal">
        <CatLabel label="Signal" />
        <WpToggle num="06" title="The signal: pure σ, no optimization">
          <P>The signal is simple. Not because we couldn't build something complex, but because we tested the complex version and it wasn't more accurate — just harder to defend.</P>
          <SigmaRuler d={d} />
          <P><Dim>σ is the number of standard deviations from Power Law fair value. No neural networks. No multi-factor weights. No optimization over historical data.</Dim></P>
          <P>Why not optimize? <Em>Because optimization lies.</Em> When you run a grid search over 625 weight combinations and report the best result, you're reporting in-sample accuracy. It looks perfect because it was designed to look perfect on that data.</P>
          <P><Dim>We know this because we tested it. We built a robust backtest that refits the Power Law at each historical point using only data available at that moment. The robust backtest confirms: σ &lt; -0.5 works with 100% accuracy even with only 8 years of data. The threshold is structural, not optimized.</Dim></P>
          <P>The sell signal at σ ≥ 0.8 requires PL maturity (b &gt; 4.0). The Power Law needs roughly 8 years before the slope converges enough to reliably identify overextension.</P>
        </WpToggle>
      </div>

      {/* 07 Validation */}
      <div id="wp-Validation">
        <CatLabel label="Validation" />
        <WpToggle num="07" title="What we know, and what we don't">
          <P><Em>What the model gets right:</Em> The buy signal has never been wrong. Every time Bitcoin was more than half a σ below fair value, the price was higher 12 months later. Across every cycle since 2016. The sell signal: when σ exceeded 0.8, 94% lost money at 12 months.</P>
          <P><Em>What the model gets wrong:</Em> The Monte Carlo systematically underestimates risk above σ = 0.5.</P>
          <CalibrationChart d={d} />
          <P><Dim>The MC predicts 6-24% loss probability in elevated zones. The actual rate is 62-94%. This is why the sell signal uses σ thresholds directly — the MC is informational context, not the decision engine.</Dim></P>
          <P>The Power Law is empirical, not physical. There is no law of nature that says Bitcoin must follow it forever. Episode analysis uses 5-7 completed episodes per zone — a tiny sample. The model cannot predict structural breaks.</P>
          <P><Em>This is a probability map — the best one we know how to build. It has been remarkably accurate so far. That is not a guarantee.</Em></P>
        </WpToggle>
      </div>

      {/* Footer */}
      <div style={{ padding: "32px 0", fontFamily: bd, fontSize: 12, color: t.dim, lineHeight: 1.6 }}>
        Built by Edu Forte and CommonSense Digital Asset Management. Barcelona.
      </div>
    </div>
  );
}
