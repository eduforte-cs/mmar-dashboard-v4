import React, { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";
import { bd, mn } from "../theme/tokens";
import { fmtK, daysSinceGenesis } from "../engine/constants.js";
import { plPrice } from "../engine/powerlaw.js";

function Section({ n, title, children }) {
  const { t } = useTheme();
  return (
    <div style={{ padding: "40px 0", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginBottom: 20 }}>
        <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>{n}</span>
        <h2 style={{ fontFamily: bd, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 700, color: t.cream, letterSpacing: "-0.03em", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function P({ children }) {
  const { t } = useTheme();
  return <p style={{ fontFamily: bd, fontSize: 15, color: t.faint, lineHeight: 1.75, margin: "0 0 16px", maxWidth: 680 }}>{children}</p>;
}

function Strong({ children }) {
  const { t } = useTheme();
  return <strong style={{ color: t.cream, fontWeight: 600 }}>{children}</strong>;
}

// ── SVG 1: Power Law log-log ──
function PLChart({ d }) {
  const { t } = useTheme();
  const chart = useMemo(() => {
    if (!d) return null;
    const { a, b, resMean, resStd } = d;
    const W = 680, H = 320;
    const pad = { top: 20, right: 30, bottom: 30, left: 55 };
    const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

    // Data: monthly samples from 2011
    const raw = (d.sigmaChart || []).filter((_, i) => i % 3 === 0);
    if (raw.length < 10) return null;

    const logDays = raw.map(r => Math.log10(daysSinceGenesis(r.fullDate || r.date)));
    const logPrices = raw.map(r => Math.log10(r.price));
    const xMin = Math.min(...logDays), xMax = Math.max(...logDays);
    const yMin = Math.min(...logPrices) - 0.2, yMax = Math.max(...logPrices) + 0.3;
    const tx = v => pad.left + (v - xMin) / (xMax - xMin) * cw;
    const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;

    // Fair value line
    const fvPts = [xMin, xMin + (xMax - xMin) * 0.25, xMin + (xMax - xMin) * 0.5, xMin + (xMax - xMin) * 0.75, xMax].map(lx => {
      const tDays = Math.pow(10, lx);
      const lp = Math.log10(plPrice(a, b, tDays));
      return `${tx(lx).toFixed(1)},${ty(lp).toFixed(1)}`;
    });

    // +2σ and -support bands
    const bandPts = (sigma) => [xMin, (xMin + xMax) / 2, xMax].map(lx => {
      const tDays = Math.pow(10, lx);
      const lp = Math.log10(Math.exp(a + b * Math.log(tDays) + resMean + sigma * resStd));
      return `${tx(lx).toFixed(1)},${ty(lp).toFixed(1)}`;
    });

    // Price dots
    const dots = raw.map((r, i) => ({ x: tx(logDays[i]), y: ty(logPrices[i]), sig: r.sigma }));

    return { W, H, pad, fvPts, bandUp: bandPts(2), bandDown: bandPts(-1), dots, tx, ty, yMin, yMax };
  }, [d]);

  if (!chart) return null;
  return (
    <svg viewBox={`0 0 ${chart.W} ${chart.H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {/* Bands */}
      <polyline points={chart.bandUp.join(" ")} fill="none" stroke="#EB5757" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.4} />
      <polyline points={chart.fvPts.join(" ")} fill="none" stroke={t.cream} strokeWidth={1.5} opacity={0.6} />
      <polyline points={chart.bandDown.join(" ")} fill="none" stroke="#27AE60" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.4} />
      {/* Price dots */}
      {chart.dots.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r={1.5} fill={dot.sig < -0.5 ? "#27AE60" : dot.sig > 0.8 ? "#EB5757" : t.faint} opacity={0.6} />
      ))}
      {/* Labels */}
      <text x={chart.W - chart.pad.right} y={chart.pad.top + 14} fill="#EB5757" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.5}>+2σ bubble</text>
      <text x={chart.W - chart.pad.right} y={chart.pad.top + 80} fill={t.cream} fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.5}>Fair value</text>
      <text x={chart.W - chart.pad.right} y={chart.H - chart.pad.bottom - 10} fill="#27AE60" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.5}>Support floor</text>
      <text x={chart.pad.left - 8} y={chart.H - 6} fill={t.faint} fontSize={9} fontFamily={mn} textAnchor="end">log₁₀(days)</text>
      <text x={chart.pad.left - 8} y={chart.pad.top + 8} fill={t.faint} fontSize={9} fontFamily={mn} textAnchor="end">log₁₀($)</text>
    </svg>
  );
}

// ── SVG 2: OLS vs WLS divergence ──
function DivergenceChart({ d }) {
  const { t } = useTheme();
  if (!d) return null;
  const { a, b } = d;
  const burgerA = -17.016, burgerB = 5.845;
  const W = 680, H = 200;
  const pad = { left: 55, right: 30, top: 20, bottom: 30 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

  const today = daysSinceGenesis(new Date().toISOString().slice(0, 10));
  const future = today + 365 * 3;
  const LN10 = Math.log(10);
  const tRange = [today * 0.7, future];
  const xMin = Math.log10(tRange[0]), xMax = Math.log10(tRange[1]);
  const tx = v => pad.left + (v - xMin) / (xMax - xMin) * cw;

  const wlsPts = [], olsPts = [];
  for (let i = 0; i <= 20; i++) {
    const lx = xMin + (xMax - xMin) * i / 20;
    const tDays = Math.pow(10, lx);
    const wls = Math.log10(plPrice(a, b, tDays));
    const ols = burgerA + burgerB * Math.log10(tDays);
    wlsPts.push(wls); olsPts.push(ols);
  }
  const allY = [...wlsPts, ...olsPts];
  const yMin = Math.min(...allY) - 0.1, yMax = Math.max(...allY) + 0.1;
  const ty = v => pad.top + ch - (v - yMin) / (yMax - yMin) * ch;

  const mkLine = (pts) => pts.map((y, i) => {
    const lx = xMin + (xMax - xMin) * i / 20;
    return `${tx(lx).toFixed(1)},${ty(y).toFixed(1)}`;
  }).join(" ");

  const todayX = tx(Math.log10(today));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      <line x1={todayX} y1={pad.top} x2={todayX} y2={H - pad.bottom} stroke={t.border} strokeWidth={0.5} strokeDasharray="4 4" />
      <text x={todayX} y={H - 6} fill={t.faint} fontSize={9} fontFamily={bd} textAnchor="middle">today</text>
      <polyline points={mkLine(olsPts)} fill="none" stroke="#EB5757" strokeWidth={1.2} opacity={0.5} strokeDasharray="6 3" />
      <polyline points={mkLine(wlsPts)} fill="none" stroke={t.cream} strokeWidth={1.8} />
      <text x={W - pad.right} y={ty(olsPts[20]) - 6} fill="#EB5757" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.6}>OLS (Burger)</text>
      <text x={W - pad.right} y={ty(wlsPts[20]) + 14} fill={t.cream} fontSize={10} fontFamily={bd} textAnchor="end">WLS (ours)</text>
    </svg>
  );
}

// ── SVG 3: Fat tails histogram ──
function FatTailsChart({ d }) {
  const { t } = useTheme();
  if (!d?.resReturns) return null;
  const returns = d.resReturns;
  const W = 680, H = 220;
  const pad = { left: 40, right: 20, top: 20, bottom: 30 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;

  // Histogram bins
  const nBins = 60;
  const rMin = -0.15, rMax = 0.15;
  const binW = (rMax - rMin) / nBins;
  const bins = Array(nBins).fill(0);
  let maxCount = 0;
  for (const r of returns) {
    const idx = Math.floor((r - rMin) / binW);
    if (idx >= 0 && idx < nBins) { bins[idx]++; if (bins[idx] > maxCount) maxCount = bins[idx]; }
  }

  // Gaussian overlay
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
  const gaussPts = [];
  for (let i = 0; i <= nBins; i++) {
    const x = rMin + i * binW;
    const gVal = returns.length * binW * Math.exp(-0.5 * ((x - mean) / std) ** 2) / (std * Math.sqrt(2 * Math.PI));
    gaussPts.push(`${(pad.left + (i / nBins) * cw).toFixed(1)},${(pad.top + ch - (gVal / maxCount) * ch).toFixed(1)}`);
  }

  const tx = i => pad.left + (i / nBins) * cw;
  const ty = v => pad.top + ch - (v / maxCount) * ch;
  const barW = cw / nBins * 0.85;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {bins.map((c, i) => c > 0 && (
        <rect key={i} x={tx(i)} y={ty(c)} width={barW} height={ch - (ty(c) - pad.top)}
          fill={Math.abs(rMin + i * binW) > 0.06 ? "#EB5757" : t.faint} opacity={Math.abs(rMin + i * binW) > 0.06 ? 0.6 : 0.3} rx={1} />
      ))}
      <polyline points={gaussPts.join(" ")} fill="none" stroke="#F2994A" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
      <text x={W - pad.right} y={pad.top + 16} fill="#F2994A" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.6}>Normal distribution</text>
      <text x={W - pad.right} y={pad.top + 30} fill="#EB5757" fontSize={10} fontFamily={bd} textAnchor="end" opacity={0.6}>Actual fat tails</text>
      <text x={pad.left} y={H - 6} fill={t.faint} fontSize={9} fontFamily={mn}>Daily residual returns</text>
    </svg>
  );
}

// ── SVG 4: Sigma ruler ──
function SigmaRuler({ d }) {
  const { t } = useTheme();
  if (!d) return null;
  const sig = d.sigmaFromPL || 0;
  const W = 680, H = 80;
  const pad = { left: 20, right: 20 };
  const cw = W - pad.left - pad.right;

  const zones = [
    { label: "Strong Buy", min: -2.5, max: -1.0, color: "#1B8A4A", acc: "100%" },
    { label: "Buy", min: -1.0, max: -0.5, color: "#27AE60", acc: "100%" },
    { label: "Accumulate", min: -0.5, max: 0, color: "#6FCF97", acc: "100%" },
    { label: "Neutral", min: 0, max: 0.3, color: t.faint, acc: "83%" },
    { label: "Caution", min: 0.3, max: 0.5, color: "#E8A838", acc: "56%" },
    { label: "Reduce", min: 0.5, max: 0.8, color: "#F2994A", acc: "33%" },
    { label: "Sell", min: 0.8, max: 2.5, color: "#EB5757", acc: "0%" },
  ];

  const sigMin = -2.5, sigMax = 2.5;
  const tx = v => pad.left + Math.max(0, Math.min(1, (v - sigMin) / (sigMax - sigMin))) * cw;
  const markerX = tx(Math.max(sigMin, Math.min(sigMax, sig)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {zones.map(z => (
        <g key={z.label}>
          <rect x={tx(z.min)} y={20} width={tx(z.max) - tx(z.min)} height={24} fill={z.color} opacity={0.15} rx={2} />
          <text x={(tx(z.min) + tx(z.max)) / 2} y={16} fill={z.color} fontSize={8} fontFamily={bd} textAnchor="middle" fontWeight={500}>{z.label}</text>
          <text x={(tx(z.min) + tx(z.max)) / 2} y={60} fill={t.dim} fontSize={8} fontFamily={mn} textAnchor="middle">{z.acc}</text>
        </g>
      ))}
      {/* Marker */}
      <line x1={markerX} y1={18} x2={markerX} y2={48} stroke={t.cream} strokeWidth={2} />
      <circle cx={markerX} cy={32} r={4} fill={t.cream} />
      <text x={markerX} y={74} fill={t.cream} fontSize={9} fontFamily={mn} textAnchor="middle" fontWeight={600}>σ = {sig.toFixed(2)}</text>
    </svg>
  );
}

// ── SVG 5: MC Calibration bars ──
function CalibrationChart({ d }) {
  const { t } = useTheme();
  const cal = d?.backtestResults?.calibrationBuckets;
  if (!cal || cal.length === 0) return null;
  const zones = cal.filter(b => b.n > 0);
  const W = 680, H = 200;
  const pad = { left: 130, right: 30, top: 20, bottom: 40 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
  const rowH = ch / zones.length;
  const maxVal = 100;
  const tx = v => pad.left + (v / maxVal) * cw;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", margin: "24px 0" }}>
      {zones.map((z, i) => {
        const y = pad.top + i * rowH;
        const predicted = parseFloat(z.pLossAvg) || 0;
        const actual = parseFloat(z.lossRate) || 0;
        return (
          <g key={z.label}>
            <text x={pad.left - 8} y={y + rowH / 2 + 3} fill={t.faint} fontSize={10} fontFamily={bd} textAnchor="end">{z.label.replace(/\(.*\)/, "").trim()}</text>
            {/* Predicted */}
            <rect x={tx(0)} y={y + 4} width={Math.max(2, tx(predicted) - tx(0))} height={rowH * 0.35} fill="#F2994A" opacity={0.5} rx={2} />
            {predicted > 3 && <text x={tx(predicted) + 4} y={y + 4 + rowH * 0.25} fill="#F2994A" fontSize={9} fontFamily={mn} opacity={0.7}>{predicted}%</text>}
            {/* Actual */}
            <rect x={tx(0)} y={y + rowH * 0.45} width={Math.max(2, tx(actual) - tx(0))} height={rowH * 0.35} fill={actual > 30 ? "#EB5757" : "#27AE60"} opacity={0.6} rx={2} />
            {actual > 3 && <text x={tx(actual) + 4} y={y + rowH * 0.45 + rowH * 0.25} fill={actual > 30 ? "#EB5757" : "#27AE60"} fontSize={9} fontFamily={mn} opacity={0.7}>{actual}%</text>}
          </g>
        );
      })}
      {/* Legend */}
      <rect x={pad.left} y={H - 16} width={10} height={8} fill="#F2994A" opacity={0.5} rx={1} />
      <text x={pad.left + 14} y={H - 9} fill={t.faint} fontSize={9} fontFamily={bd}>MC predicted</text>
      <rect x={pad.left + 100} y={H - 16} width={10} height={8} fill="#EB5757" opacity={0.6} rx={1} />
      <text x={pad.left + 114} y={H - 9} fill={t.faint} fontSize={9} fontFamily={bd}>Actual loss rate</text>
    </svg>
  );
}

// ── Main Whitepaper ──
export default function Whitepaper({ d }) {
  const { t } = useTheme();

  return (
    <div style={{ animation: "fi 0.3s ease" }}>
      {/* Title */}
      <div style={{ padding: "48px 0 32px", borderBottom: `1px solid ${t.border}` }}>
        <h1 style={{
          fontFamily: bd, fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700,
          color: t.cream, letterSpacing: "-0.04em", lineHeight: 1.05, margin: 0,
        }}>
          Should I Buy Bitcoin Today?
        </h1>
        <p style={{
          fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 17px)",
          color: t.faint, lineHeight: 1.5, margin: "12px 0 0", maxWidth: 560,
        }}>
          A quantitative framework for answering the only question that matters
        </p>
        <div style={{ fontFamily: mn, fontSize: 11, color: t.dim, marginTop: 16 }}>
          Edu Forte · CommonSense Digital Asset Management · Barcelona
        </div>
      </div>

      {/* 1. The question */}
      <Section n="01" title="The question">
        <P>Everyone who looks at Bitcoin eventually asks the same thing: should I buy it now?</P>
        <P>The problem isn't information — there's too much of it. Twitter threads, YouTube analysts, on-chain metrics, technical indicators, macro takes. Most of it is noise dressed as signal. And the few tools that try to be rigorous tend to be either too academic to be useful or too simple to be honest.</P>
        <P>We wanted to build something different. A model that takes 16 years of daily price data, runs it through institutional-grade quantitative analysis, and gives you one answer: <Strong>yes or no</Strong>, with your actual odds of losing money at 1 year and 3 years.</P>
        <P>This is how it works.</P>
      </Section>

      {/* 2. The Power Law */}
      <Section n="02" title="The Power Law foundation">
        <P>In 2019, Giovanni Santostasi published an observation that would become one of the most debated ideas in Bitcoin analysis: Bitcoin's price follows a power law. Not approximately, not loosely — with an R² above 0.91 across the entire history of the asset.</P>
        <P>A power law means that when you plot price against time on a log-log scale, you get a straight line. This isn't a coincidence. Power laws appear in network effects, city sizes, earthquake magnitudes, and biological scaling. They describe systems where growth decelerates in a predictable way as the system matures.</P>
        <P>Harold Christopher Burger popularized this into a model: fit an ordinary least squares regression in log-log space, draw standard deviation bands around it, and you get a corridor that has contained virtually all of Bitcoin's price history. The bottom is the support floor. The top is the bubble zone. Fair value is the line in the middle.</P>
        {d && <PLChart d={d} />}
        <P>It's an elegant framework. And it's largely correct. But it has three problems.</P>
      </Section>

      {/* 3. Where we diverge */}
      <Section n="03" title="Where we diverge">
        <P><Strong>Problem 1: OLS treats all data equally.</Strong> Burger's model gives the same weight to a $1 trade in 2011 and a $70,000 trade in 2024. But these are fundamentally different markets. The early data is thin, illiquid, and dominated by a handful of actors. Today's market has deep liquidity, institutional participation, and derivatives.</P>
        <P>Our fix: <Strong>Weighted Least Squares (WLS)</Strong> with exponential decay. We give more weight to recent data using a 4-year half-life. The early data still shapes the long-term slope — we don't throw it away — but it doesn't distort the present. Our slope (b=5.36) is slightly lower than Burger's (b=5.85). That difference matters. It means our model sees Bitcoin's growth as decelerating — which is what you'd expect from a maturing asset.</P>
        {d && <DivergenceChart d={d} />}
        <P><Strong>Problem 2: The support floor ignores bubbles.</Strong> OLS fits to all data, including the peaks of 2013, 2017, and 2021. Those peaks pull the regression line up, which means the support floor is also pulled up. It becomes unreliable during crashes — precisely when you need it most.</P>
        <P>Our fix: <Strong>RANSAC</Strong> (Random Sample Consensus). A robust regression that automatically identifies and excludes outliers. In Bitcoin's case, the outliers are bubble peaks. The RANSAC fit has its own slope (b=6.11, steeper than WLS), meaning the support envelope has its own structural dynamics.</P>
        <P><Strong>Problem 3: The bubble ceiling is arbitrary.</Strong> Most Power Law models define the bubble zone as "+2.5σ" — a number chosen because it looks right. There's no statistical justification.</P>
        <P>Our fix: <Strong>Extreme Value Theory (EVT)</Strong> with a Generalized Pareto Distribution fitted to actual positive residuals above the 85th percentile. A data-driven cap instead of an arbitrary number.</P>
        <P>All three changes build on the same Power Law foundation. We're not replacing Santostasi and Burger. We're calibrating their model for today's market.</P>
      </Section>

      {/* 4. The fractal layer */}
      <Section n="04" title="The fractal layer">
        <P>Bitcoin's daily returns have a kurtosis above 10. A normal distribution has a kurtosis of 3. This means extreme moves happen roughly 5 to 10 times more often than a Gaussian model predicts.</P>
        {d && <FatTailsChart d={d} />}
        <P>This isn't a quirk. It's structural. Bitcoin's returns exhibit <Strong>fat tails</Strong> (extreme moves are common, not exceptional), <Strong>volatility clustering</Strong> (big moves follow big moves), and <Strong>long memory</Strong> (today's volatility is correlated with volatility months ago, measured by the Hurst exponent H &gt; 0.55).</P>
        <P>Standard Monte Carlo assumes returns are independent and normally distributed. It misses all three properties. This is why traditional risk models chronically underestimate Bitcoin's tail risk.</P>
        <P>Our solution is <Strong>Mandelbrot's Multifractal Model of Asset Returns (MMAR)</Strong>. Benoît Mandelbrot proposed that financial markets are better described by multifractal processes than by Brownian motion. Volatility isn't random — it has a self-similar structure across time scales.</P>
        <P>We implement MMAR through DFA (Detrended Fluctuation Analysis) for the Hurst exponent, multifractal partition function for the intermittency parameter λ², and regime-switching Ornstein-Uhlenbeck for calm/volatile state detection.</P>
      </Section>

      {/* 5. The simulation */}
      <Section n="05" title="2,000 possible futures">
        <P>With the Power Law giving structural fair value and MMAR giving realistic dynamics, we simulate 2,000 paths over a 3-year horizon. Each path uses fractal cascades, Hurst-correlated noise, empirical shock resampling, and a reflective floor at RANSAC support with calibrated break probability.</P>
        <P>What we deliberately excluded: <Strong>the Ornstein-Uhlenbeck mean-reversion force</Strong>. Early versions pulled simulated prices back toward fair value. The problem: this artificially dampened tail risk. We found the paths were more honest when we let them run on pure MMAR/Hurst dynamics and used the Power Law only as a reference for measuring distance, not as a force in the simulation.</P>
        <P>From 2,000 paths we extract percentiles at each horizon, probability of loss at 1 month through 3 years, and probability of reaching fair value or hitting the worst-case floor.</P>
      </Section>

      {/* 6. The signal */}
      <Section n="06" title="The signal">
        <P>The signal is simple. Not because we couldn't build something complex, but because we tested the complex version and it wasn't more accurate — just harder to defend.</P>
        {d && <SigmaRuler d={d} />}
        <P>σ is the number of standard deviations from Power Law fair value. No neural networks. No multi-factor weights. No optimization over historical data.</P>
        <P>Why not optimize? <Strong>Because optimization lies.</Strong> When you run a grid search over 625 weight combinations and report the best result, you're reporting in-sample accuracy. It looks perfect because it was designed to look perfect on that specific data.</P>
        <P>We know this because we tested it. We built a robust backtest that refits the Power Law at each historical test point using only data available at that moment. The robust backtest confirms: σ &lt; -0.5 works with 100% accuracy even when the PL is fitted with only 8 years of data. The threshold is structural, not optimized.</P>
        <P>The sell signal at σ ≥ 0.8 requires PL maturity (b &gt; 4.0). The Power Law needs roughly 8 years before the slope converges enough to reliably identify overextension.</P>
      </Section>

      {/* 7. What we know */}
      <Section n="07" title="What we know, and what we don't">
        <P><Strong>What the model gets right:</Strong> The buy signal has never been wrong. Every time Bitcoin was more than half a σ below fair value, the price was higher 12 months later. Across every cycle since 2016. The sell signal: when σ exceeded 0.8, 94% lost money at 12 months.</P>
        <P><Strong>What the model gets wrong:</Strong> The Monte Carlo systematically underestimates risk above σ = 0.5.</P>
        {d && <CalibrationChart d={d} />}
        <P>The MC predicts 6-24% loss probability in elevated zones. The actual rate is 62-94%. This is why the sell signal uses σ thresholds directly — the MC is informational context, not the decision engine.</P>
        <P>The Power Law is empirical, not physical. There is no law of nature that says Bitcoin must follow it forever. Episode analysis uses 5-7 completed episodes per zone — a tiny sample. The model cannot predict structural breaks.</P>
        <P>This is a probability map — the best one we know how to build. It has been remarkably accurate so far. That is not a guarantee.</P>
      </Section>

      {/* Footer */}
      <div style={{ padding: "32px 0", fontFamily: bd, fontSize: 12, color: t.dim, lineHeight: 1.6 }}>
        Built by Edu Forte and CommonSense Digital Asset Management. Barcelona.
        <br />Research paper: "Multifractality in the Residuals of Bitcoin's Power Law" — available on request.
      </div>
    </div>
  );
}
