import React, { useState, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { renderMd as renderMdRaw } from "../i18n/renderMd";
import { bd, mn } from "../theme/tokens";
import CatLabel from "../components/CatLabel";
import { trackWhitepaperSection } from "../tracking";

// ── WpToggle ──
function WpToggle({ title, num, children, defaultOpen = true }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
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
            <span onClick={() => setOpen(false)} style={{ cursor: "pointer", borderBottom: `1px solid ${t.borderFaint}`, paddingBottom: 1 }}>{tr("wp.close")}</span>
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

// ── SVG 1: Power Law log-log ──
function PLChart({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const svg = useMemo(() => {
    try {
      if (!d?.sigmaChart?.length || !d.a || !d.b) return null;
      const { a, b, resMean, resStd } = d;
      const W = 680, H = 340;
      const pad = { top: 30, right: 20, bottom: 36, left: 60 };
      const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

      // Sample ~100 points
      const step = Math.max(1, Math.floor(d.sigmaChart.length / 100));
      const raw = d.sigmaChart.filter((_, i) => i % step === 0 || i === d.sigmaChart.length - 1);
      if (raw.length < 5) return null;

      // Use pre-computed fair values from sigmaChart
      const points = [];
      for (const r of raw) {
        if (!r.price || r.price <= 0 || !r.fair || r.fair <= 0) continue;
        const lp = Math.log10(r.price);
        const lf = Math.log10(r.fair);
        if (!isFinite(lp) || !isFinite(lf)) continue;
        points.push({ lp, lf, sigma: r.sigma, date: r.fullDate || r.date });
      }
      if (points.length < 5) return null;

      // Use index as x (uniform spacing, avoids daysSinceGenesis import)
      const xMin = 0, xMax = points.length - 1;
      const logPrices = points.map(p => p.lp);
      const logFairs = points.map(p => p.lf);
      const allY = [...logPrices, ...logFairs];
      const yMin = Math.min(...allY) - 0.2;
      const yMax = Math.max(...allY) + 0.3;

      const tx = i => pad.left + (i / xMax) * cw;
      const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;

      // Fair value line
      const fvLine = points.map((p, i) => `${tx(i).toFixed(1)},${ty(p.lf).toFixed(1)}`).join(" ");

      // +2σ and -1σ bands
      const bandUp = points.map((p, i) => `${tx(i).toFixed(1)},${ty(p.lf + 2 * (resStd / Math.LN10)).toFixed(1)}`).join(" ");
      const bandDn = points.map((p, i) => `${tx(i).toFixed(1)},${ty(p.lf - 1 * (resStd / Math.LN10)).toFixed(1)}`).join(" ");

      // Price path
      const pricePath = points.map((p, i) => `${tx(i).toFixed(1)},${ty(p.lp).toFixed(1)}`).join(" ");

      // Dots
      const dots = points.map((p, i) => ({
        cx: tx(i).toFixed(1), cy: ty(p.lp).toFixed(1),
        color: p.sigma < -1 ? "#1B8A4A" : p.sigma < -0.5 ? "#27AE60" : p.sigma > 0.8 ? "#EB5757" : p.sigma > 0.5 ? "#F2994A" : "#666",
      }));

      // Y gridlines
      const yTicks = [];
      for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 1) {
        yTicks.push({ y: ty(y).toFixed(1), label: "$" + Math.pow(10, y).toLocaleString("en", { maximumFractionDigits: 0 }) });
      }

      return { W, H, pad, fvLine, bandUp, bandDn, pricePath, dots, yTicks, cw };
    } catch (e) { console.error("PLChart error:", e); return null; }
  }, [d]);

  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {svg.yTicks.map(tick => (
        <g key={tick.label}>
          <line x1={svg.pad.left} y1={tick.y} x2={svg.W - svg.pad.right} y2={tick.y} stroke={t.border} strokeWidth={0.5} />
          <text x={svg.pad.left - 6} y={parseFloat(tick.y) + 3} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="end">{tick.label}</text>
        </g>
      ))}
      <polyline points={svg.bandUp} fill="none" stroke="#EB5757" strokeWidth={1} strokeDasharray="6 4" opacity={0.4} />
      <polyline points={svg.fvLine} fill="none" stroke={t.cream} strokeWidth={1.5} opacity={0.35} />
      <polyline points={svg.bandDn} fill="none" stroke="#27AE60" strokeWidth={1} strokeDasharray="6 4" opacity={0.4} />
      <polyline points={svg.pricePath} fill="none" stroke={t.cream} strokeWidth={0.8} opacity={0.12} />
      {svg.dots.map((d, i) => <circle key={i} cx={d.cx} cy={d.cy} r={2} fill={d.color} opacity={0.7} />)}
      <text x={svg.W - svg.pad.right - 4} y={svg.pad.top + 14} fill="#EB5757" fontSize={9} fontFamily={bd} textAnchor="end" opacity={0.5}>{tr("wp.svg.bubbleZone")}</text>
      <text x={svg.W - svg.pad.right - 4} y={svg.H - svg.pad.bottom - 6} fill="#27AE60" fontSize={9} fontFamily={bd} textAnchor="end" opacity={0.5}>{tr("wp.svg.support")}</text>
      <text x={svg.pad.left + svg.cw / 2} y={svg.H - 6} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="middle">{tr("wp.svg.btcHistory")}</text>
    </svg>
  );
}

// ── SVG 2: OLS vs WLS ──
function DivergenceChart({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const svg = useMemo(() => {
    try {
      if (!d?.a || !d?.b) return null;
      const { a, b } = d;
      const burgerB = 5.845;
      const W = 680, H = 200;
      const pad = { left: 60, right: 20, top: 20, bottom: 36 };
      const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

      // Use sigmaChart last point to find today's t
      const lastSc = d.sigmaChart?.[d.sigmaChart.length - 1];
      if (!lastSc?.fair) return null;
      const logFairToday = Math.log(lastSc.fair);
      const logTToday = (logFairToday - a) / b; // derive log(t) from a + b*log(t) = log(fair)
      const tToday = Math.exp(logTToday);
      const tEnd = tToday * 1.5; // +50% forward
      const tStart = tToday * 0.5;

      const N = 30;
      const wls = [], ols = [];
      for (let i = 0; i <= N; i++) {
        const tD = tStart + (tEnd - tStart) * i / N;
        const lt = Math.log(tD);
        wls.push(Math.log10(Math.exp(a + b * lt)));
        // Burger: same intercept approach but with his b
        ols.push(Math.log10(Math.exp(a + burgerB * lt)));
      }
      const allY = [...wls, ...ols];
      const yMin = Math.min(...allY) - 0.1, yMax = Math.max(...allY) + 0.15;
      const tx = i => pad.left + (i / N) * cw;
      const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;
      const mk = pts => pts.map((y, i) => `${tx(i).toFixed(1)},${ty(y).toFixed(1)}`).join(" ");

      const todayI = Math.round((tToday - tStart) / (tEnd - tStart) * N);
      const yTicks = [];
      for (let y = Math.ceil(yMin * 2) / 2; y <= yMax; y += 0.5)
        yTicks.push({ py: ty(y).toFixed(1), label: "$" + Math.round(Math.pow(10, y) / 1000) + "k" });

      return { W, H, pad, wlsLine: mk(wls), olsLine: mk(ols), todayX: tx(todayI).toFixed(1), yTicks, wlsEndY: ty(wls[N]).toFixed(1), olsEndY: ty(ols[N]).toFixed(1), bVal: b.toFixed(2) };
    } catch (e) { console.error("DivergenceChart error:", e); return null; }
  }, [d]);

  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {svg.yTicks.map(tick => (
        <g key={tick.label}><line x1={svg.pad.left} y1={tick.py} x2={svg.W - svg.pad.right} y2={tick.py} stroke={t.border} strokeWidth={0.3} /><text x={svg.pad.left - 6} y={parseFloat(tick.py) + 3} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="end">{tick.label}</text></g>
      ))}
      <line x1={svg.todayX} y1={svg.pad.top} x2={svg.todayX} y2={svg.H - svg.pad.bottom} stroke={t.border} strokeWidth={0.5} strokeDasharray="4 4" />
      <text x={svg.todayX} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={bd} textAnchor="middle">{tr("wp.svg.today")}</text>
      <polyline points={svg.olsLine} fill="none" stroke="#EB5757" strokeWidth={1.3} opacity={0.5} strokeDasharray="6 3" />
      <polyline points={svg.wlsLine} fill="none" stroke={t.cream} strokeWidth={1.8} />
      <text x={svg.W - svg.pad.right - 4} y={parseFloat(svg.olsEndY) - 8} fill="#EB5757" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.6}>OLS b=5.85</text>
      <text x={svg.W - svg.pad.right - 4} y={parseFloat(svg.wlsEndY) + 14} fill={t.cream} fontSize={10} fontFamily={bd} textAnchor="end">WLS b={svg.bVal}</text>
    </svg>
  );
}

// ── SVG 3: Fat tails ──
function FatTailsChart({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const svg = useMemo(() => {
    try {
      if (!d?.resReturns?.length) return null;
      const returns = d.resReturns;
      const W = 680, H = 240;
      const pad = { left: 40, right: 20, top: 24, bottom: 36 };
      const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
      const nBins = 80, rMin = -0.12, rMax = 0.12, binW = (rMax - rMin) / nBins;
      const bins = Array(nBins).fill(0);
      let maxC = 0;
      for (const r of returns) { const idx = Math.floor((r - rMin) / binW); if (idx >= 0 && idx < nBins) { bins[idx]++; if (bins[idx] > maxC) maxC = bins[idx]; } }
      if (maxC === 0) return null;
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
      const gaussPts = Array.from({ length: nBins + 1 }, (_, i) => {
        const x = rMin + i * binW;
        const g = returns.length * binW * Math.exp(-0.5 * ((x - mean) / std) ** 2) / (std * Math.sqrt(2 * Math.PI));
        return `${(pad.left + (i / nBins) * cw).toFixed(1)},${(pad.top + ch - Math.min(1, g / maxC) * ch).toFixed(1)}`;
      }).join(" ");
      const bw = (cw / nBins) * 0.9;
      const rects = bins.map((c, i) => c > 0 ? {
        x: (pad.left + (i / nBins) * cw).toFixed(1), y: (pad.top + ch - (c / maxC) * ch).toFixed(1),
        h: ((c / maxC) * ch).toFixed(1), w: bw.toFixed(1), tail: Math.abs(rMin + (i + 0.5) * binW) > 0.05,
      } : null).filter(Boolean);
      return { W, H, pad, gaussPts, rects, cw };
    } catch (e) { console.error("FatTailsChart error:", e); return null; }
  }, [d]);

  if (!svg) return null;
  return (
    <svg viewBox={`0 0 ${svg.W} ${svg.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      <line x1={svg.pad.left} y1={svg.H - svg.pad.bottom} x2={svg.W - svg.pad.right} y2={svg.H - svg.pad.bottom} stroke={t.border} strokeWidth={0.5} />
      {svg.rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.tail ? "#EB5757" : t.faint} opacity={r.tail ? 0.5 : 0.25} rx={0.5} />)}
      <polyline points={svg.gaussPts} fill="none" stroke="#F2994A" strokeWidth={1.8} strokeDasharray="5 3" opacity={0.7} />
      <text x={svg.pad.left + 4} y={svg.pad.top + 14} fill="#EB5757" fontSize={10} fontFamily={bd} opacity={0.6}>{tr("wp.svg.fatTails")}</text>
      <text x={svg.pad.left + 4} y={svg.pad.top + 28} fill="#F2994A" fontSize={10} fontFamily={bd} opacity={0.6}>{tr("wp.svg.normalDist")}</text>
      <text x={svg.pad.left + svg.cw / 2} y={svg.H - 8} fill={t.dim} fontSize={9} fontFamily={mn} textAnchor="middle">{tr("wp.svg.dailyResiduals")}</text>
    </svg>
  );
}

// ── SVG 4: Sigma ruler ──
function SigmaRuler({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  if (!d) return null;
  const sig = d.sigmaFromPL || 0;
  const W = 680, H = 90, padL = 10, cw = W - 20;
  const zones = [
    { label: tr("zone.strongBuy"), min: -2.5, max: -1.0, color: "#1B8A4A", acc: "100%" },
    { label: tr("zone.buy"), min: -1.0, max: -0.5, color: "#27AE60", acc: "100%" },
    { label: tr("zone.accumulate"), min: -0.5, max: 0, color: "#6FCF97", acc: "100%" },
    { label: tr("zone.neutral"), min: 0, max: 0.3, color: t.faint, acc: "83%" },
    { label: tr("zone.caution"), min: 0.3, max: 0.5, color: "#E8A838", acc: "56%" },
    { label: tr("zone.reduce"), min: 0.5, max: 0.8, color: "#F2994A", acc: "33%" },
    { label: tr("zone.sell"), min: 0.8, max: 2.5, color: "#EB5757", acc: "0%" },
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
      <text x={mx} y={82} fill={t.cream} fontSize={10} fontFamily={mn} textAnchor="middle" fontWeight={600}>{"σ = " + sig.toFixed(2)}</text>
    </svg>
  );
}

// ── SVG 5: MC Calibration ──
function CalibrationChart({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const svg = useMemo(() => {
    try {
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
      const rows = zones.map((z, i) => ({
        label: z.label.replace(/\(.*\)/, "").trim(), y: pad.top + i * rowH,
        predicted: parseFloat(z.pLossAvg) || 0, actual: parseFloat(z.lossRate) || 0, barH,
      }));
      return { W, H, pad, tx, rows };
    } catch (e) { console.error("CalibrationChart error:", e); return null; }
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
      <text x={svg.pad.left + 14} y={svg.H - 11} fill={t.faint} fontSize={9} fontFamily={bd}>{tr("wp.svg.mcPredicted")}</text>
      <rect x={svg.pad.left + 120} y={svg.H - 18} width={10} height={8} fill="#EB5757" opacity={0.6} rx={1} />
      <text x={svg.pad.left + 134} y={svg.H - 11} fill={t.faint} fontSize={9} fontFamily={bd}>{tr("wp.svg.actualLoss")}</text>
    </svg>
  );
}

// ── Sections nav (id stays in English so deep links never break;
//    label is translated at render time) ──
const SECTIONS = [
  { id: "Foundation", labelKey: "wp.cat.foundation" },
  { id: "Divergence", labelKey: "wp.cat.divergence" },
  { id: "Fractals", labelKey: "wp.cat.fractals" },
  { id: "Simulation", labelKey: "wp.cat.simulation" },
  { id: "Signal", labelKey: "wp.cat.signal" },
  { id: "Validation", labelKey: "wp.cat.validation" },
];

export default function Whitepaper({ d }) {
  const { t } = useTheme();
  const { t: tr } = useI18n();
  const [activeCat, setActiveCat] = useState("Foundation");
  const renderMd = (str) => renderMdRaw(str, { dimColor: t.faint });

  const bValue = d?.b?.toFixed(2) || "5.36";

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      <div style={{ padding: "48px 0 36px", borderBottom: `1px solid ${t.border}` }}>
        <h2 style={{ fontFamily: bd, fontSize: 56, fontWeight: 800, color: t.cream, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>{tr("wp.title")}</h2>
        <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.5, margin: "12px 0 0", maxWidth: 560 }}>{tr("wp.subtitle")}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${t.border}`, gap: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <span style={{ fontFamily: mn, fontSize: 10, color: t.ghost, padding: "14px 0", marginRight: "auto", whiteSpace: "nowrap" }}>{tr("wp.sectionsCount")}</span>
        {SECTIONS.map(({ id, labelKey }) => (
          <span key={id} onClick={() => { trackWhitepaperSection(id); setActiveCat(id); document.getElementById("wp-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} style={{
            fontFamily: bd, fontSize: 13, fontWeight: 500, color: activeCat === id ? t.cream : t.faint,
            padding: "14px 20px", cursor: "pointer", whiteSpace: "nowrap",
            borderBottom: activeCat === id ? `2px solid ${t.cream}` : "2px solid transparent", marginBottom: -1,
          }}>{tr(labelKey)}</span>
        ))}
        <span style={{ fontFamily: bd, fontSize: 11, color: t.dim, padding: "14px 20px", marginLeft: "auto", borderLeft: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>Edu Forte · CommonSense</span>
      </div>

      <div id="wp-Foundation"><CatLabel label={tr("wp.cat.foundation")} />
        <WpToggle num="01" title={tr("wp.t01.title")}>
          <P>{renderMd(tr("wp.t01.p1"))}</P>
          <P><Dim>{tr("wp.t01.p2")}</Dim></P>
          <P>{renderMd(tr("wp.t01.p3"))}</P>
        </WpToggle>
        <WpToggle num="02" title={tr("wp.t02.title")}>
          <P>{renderMd(tr("wp.t02.p1"))}</P>
          <P><Dim>{tr("wp.t02.p2")}</Dim></P>
          <P>{renderMd(tr("wp.t02.p3"))}</P>
          <PLChart d={d} />
          <P>{renderMd(tr("wp.t02.p4"))}</P>
        </WpToggle>
      </div>

      <div id="wp-Divergence"><CatLabel label={tr("wp.cat.divergence")} />
        <WpToggle num="03" title={tr("wp.t03.title")}>
          <P>{renderMd(tr("wp.t03.p1"))}</P>
          <P>{renderMd(tr("wp.t03.p2").replace("{bValue}", bValue))}</P>
          <DivergenceChart d={d} />
          <P>{renderMd(tr("wp.t03.p3"))}</P>
          <P>{renderMd(tr("wp.t03.p4"))}</P>
          <P>{renderMd(tr("wp.t03.p5"))}</P>
          <P>{renderMd(tr("wp.t03.p6"))}</P>
        </WpToggle>
      </div>

      <div id="wp-Fractals"><CatLabel label={tr("wp.cat.fractals")} />
        <WpToggle num="04" title={tr("wp.t04.title")}>
          <P>{renderMd(tr("wp.t04.p1"))}</P>
          <FatTailsChart d={d} />
          <P>{renderMd(tr("wp.t04.p2"))}</P>
          <P>{renderMd(tr("wp.t04.p3"))}</P>
          <P>{renderMd(tr("wp.t04.p4"))}</P>
        </WpToggle>
      </div>

      <div id="wp-Simulation"><CatLabel label={tr("wp.cat.simulation")} />
        <WpToggle num="05" title={tr("wp.t05.title")}>
          <P>{renderMd(tr("wp.t05.p1"))}</P>
          <P>{renderMd(tr("wp.t05.p2"))}</P>
          <P>{renderMd(tr("wp.t05.p3"))}</P>
        </WpToggle>
      </div>

      <div id="wp-Signal"><CatLabel label={tr("wp.cat.signal")} />
        <WpToggle num="06" title={tr("wp.t06.title")}>
          <P>{renderMd(tr("wp.t06.p1"))}</P>
          <SigmaRuler d={d} />
          <P>{renderMd(tr("wp.t06.p2"))}</P>
          <P>{renderMd(tr("wp.t06.p3"))}</P>
          <P>{renderMd(tr("wp.t06.p4"))}</P>
          <P>{renderMd(tr("wp.t06.p5"))}</P>
        </WpToggle>
      </div>

      <div id="wp-Validation"><CatLabel label={tr("wp.cat.validation")} />
        <WpToggle num="07" title={tr("wp.t07.title")}>
          <P>{renderMd(tr("wp.t07.p1"))}</P>
          <P>{renderMd(tr("wp.t07.p2"))}</P>
          <CalibrationChart d={d} />
          <P>{renderMd(tr("wp.t07.p3"))}</P>
          <P>{renderMd(tr("wp.t07.p4"))}</P>
          <P>{renderMd(tr("wp.t07.p5"))}</P>
        </WpToggle>
      </div>

      <div style={{ padding: "32px 0", fontFamily: bd, fontSize: 12, color: t.dim, lineHeight: 1.6 }}>
        {tr("wp.builtBy")}
      </div>
    </div>
  );
}
