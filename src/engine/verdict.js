// ── Verdict generator v2 — pure sigma rules, validated by robust backtest ──
// Signal thresholds:
//   Strong Buy: σ < -1.0   (100% accuracy, worst +30%)
//   Buy:        σ < -0.5   (100% accuracy, worst +22%)
//   Hold:       -0.5 ≤ σ < 0.5  (internal: accumulate / neutral / caution)
//   Reduce:     0.5 ≤ σ < 0.8   (33% accuracy 12m, avg -3%)
//   Sell:       σ ≥ 0.8          (14% accuracy 12m, avg -34%)
//
// Hurst divergences retained as diagnostic (shown in Pro DriversPanel) but
// no longer drive the sell signal — sigma alone is sufficient and more reliable.

import { plPrice } from "./powerlaw.js";
import { supportFloor } from "./bands.js";
import { computeHurstDivergences } from "./regime.js";
import { fmtK } from "./constants.js";

// ── Signal thresholds ──
const SIG = {
  strongBuy: -1.0,
  buy: -0.5,
  reduce: 0.5,
  sell: 0.8,
  // Hold sub-zones (internal, user sees "Hold" for all)
  accumulate: { min: -0.5, max: 0 },    // 100% acc, avg +197%
  neutral:    { min: 0,    max: 0.3 },   // 83% acc, avg +53%
  caution:    { min: 0.3,  max: 0.5 },   // 56% acc, avg +41%
};

function mcLossProb(pcts, day, spotPrice) {
  const idx = Math.min(Math.floor(day / 5), pcts.length - 1);
  const row = pcts[idx];
  if (!row) return null;
  const knownPcts = [
    { price: row.p5, prob: 5 }, { price: row.p25, prob: 25 },
    { price: row.p50, prob: 50 }, { price: row.p75, prob: 75 },
    { price: row.p95, prob: 95 },
  ];
  if (spotPrice <= knownPcts[0].price) return 2.5;
  if (spotPrice >= knownPcts[4].price) return 97.5;
  for (let i = 0; i < knownPcts.length - 1; i++) {
    if (spotPrice >= knownPcts[i].price && spotPrice <= knownPcts[i + 1].price) {
      const t = (spotPrice - knownPcts[i].price) / (knownPcts[i + 1].price - knownPcts[i].price);
      return knownPcts[i].prob + t * (knownPcts[i + 1].prob - knownPcts[i].prob);
    }
  }
  return 50;
}

function probAbove(pcts, targetPrice) {
  const row = pcts[pcts.length - 1];
  if (!row) return 50;
  const pts = [{price:row.p5,prob:5},{price:row.p25,prob:25},{price:row.p50,prob:50},{price:row.p75,prob:75},{price:row.p95,prob:95}];
  if (targetPrice <= pts[0].price) return 97.5;
  if (targetPrice >= pts[4].price) return 2.5;
  for (let k = 0; k < pts.length - 1; k++) {
    if (targetPrice >= pts[k].price && targetPrice <= pts[k + 1].price) {
      const t = (targetPrice - pts[k].price) / (pts[k + 1].price - pts[k].price);
      return 100 - (pts[k].prob + t * (pts[k + 1].prob - pts[k].prob));
    }
  }
  return 50;
}

export function computeMCLossHorizons(percentiles, percentiles3y, S0) {
  return [
    { label: "1 month", days: 30, pcts: percentiles },
    { label: "3 months", days: 90, pcts: percentiles },
    { label: "6 months", days: 182, pcts: percentiles },
    { label: "1 year", days: 365, pcts: percentiles },
    { label: "3 years", days: 1095, pcts: percentiles3y },
  ].map(h => {
    const pLoss = mcLossProb(h.pcts, h.days, S0);
    const idx = Math.min(Math.floor(h.days / 5), h.pcts.length - 1);
    const row = h.pcts[idx] || {};
    return { label: h.label, days: h.days, pLoss, p50: row.p50, p5: row.p5, p95: row.p95 };
  });
}

/**
 * Episode analysis: time to fair value
 */
export function computeEpisodeAnalysis(sig, sigmaChart) {
  const sigDirection = sig < -0.15 ? "below" : sig > 0.15 ? "above" : "at";
  const zoneThreshold = sig < -1.0 ? -1.0 : sig < -0.5 ? -0.5 : sig > 1.0 ? 1.0 : sig > 0.5 ? 0.5 : 0;

  let episodeStart = null, episodeDays = 0, episodePeak = sig;
  const todayMs = Date.now();
  if (sigmaChart?.length > 1 && Math.abs(zoneThreshold) > 0) {
    for (let i = sigmaChart.length - 1; i >= 0; i--) {
      const s = sigmaChart[i].sigma;
      if ((zoneThreshold < 0 && s > zoneThreshold) || (zoneThreshold > 0 && s < zoneThreshold)) {
        const crossPoint = sigmaChart[Math.min(i + 1, sigmaChart.length - 1)];
        episodeStart = crossPoint.fullDate || crossPoint.date;
        const startMs = new Date(episodeStart).getTime();
        episodeDays = Math.round((todayMs - startMs) / 86400000);
        break;
      }
      episodePeak = zoneThreshold < 0 ? Math.min(episodePeak, s) : Math.max(episodePeak, s);
    }
    if (!episodeStart) {
      const firstPoint = sigmaChart[0];
      episodeStart = firstPoint.fullDate || firstPoint.date;
      episodeDays = Math.round((todayMs - new Date(episodeStart).getTime()) / 86400000);
    }
  }

  let sigTrend = 0;
  if (sigmaChart?.length > 6) {
    const recent = sigmaChart[sigmaChart.length - 1].sigma;
    const lookback = sigmaChart[Math.max(0, sigmaChart.length - 7)].sigma;
    sigTrend = sig < 0 ? (recent - lookback) : (lookback - recent);
  }
  const sigImproving = sigTrend > 0.03;
  const sigWorsening = sigTrend < -0.03;

  const episodeHistory = sig < -1.0
    ? { durations: [93, 229, 462, 859], branchDay: 229, shortAvg: 161, longAvg: 660, median: 346, label: "deeply undervalued", deepThreshold: -1.2 }
    : sig < -0.5
    ? { durations: [74, 168, 233, 608, 870], branchDay: 233, shortAvg: 158, longAvg: 739, median: 233, label: "discount", deepThreshold: -1.0 }
    : sig > 1.0
    ? { durations: [64, 332, 397, 492], branchDay: 64, shortAvg: 64, longAvg: 407, median: 365, label: "bubble", deepThreshold: 1.5 }
    : sig > 0.5
    ? { durations: [33, 64, 80, 94, 350, 423, 508], branchDay: 94, shortAvg: 67, longAvg: 427, median: 94, label: "overheated", deepThreshold: 1.0 }
    : { durations: [], branchDay: 0, shortAvg: 0, longAvg: 0, median: 0, label: "at fair value", deepThreshold: 0 };

  const isDeepEnough = sig < 0
    ? episodePeak < (episodeHistory.deepThreshold || -1.0)
    : episodePeak > (episodeHistory.deepThreshold || 1.0);

  const longerEpisodes = episodeHistory.durations.filter(d => d > episodeDays);
  const pctThrough = episodeHistory.durations.length > 0
    ? Math.round((1 - longerEpisodes.length / episodeHistory.durations.length) * 100) : 0;
  const conditionalRemaining = longerEpisodes.length > 0
    ? longerEpisodes[Math.floor(longerEpisodes.length / 2)] - episodeDays : 0;
  const pastBranchPoint = episodeDays > episodeHistory.branchDay;
  const nEps = episodeHistory.durations.length;
  const nLonger = longerEpisodes.length;
  const nShorter = nEps - nLonger;
  const durRange = nEps > 0 ? `${Math.min(...episodeHistory.durations)}–${Math.max(...episodeHistory.durations)}` : "0";

  let episodeCallout = "";
  if (Math.abs(sig) < 0.15) {
    episodeCallout = "";
  } else if (sig < 0) {
    if (pctThrough < 25) {
      episodeCallout = `BTC has been in ${episodeHistory.label} territory for ${episodeDays} days. The ${nEps} previous episodes of this type lasted ${durRange} days. It's early — ${nLonger} of ${nEps} episodes lasted longer than this.${sigWorsening ? " The price is still drifting further from fair value, suggesting the bottom may not be in yet." : ""}${sigImproving ? ` However, the price is already moving back toward fair value — if this holds, it resembles the shorter episodes (${episodeHistory.shortAvg}d avg).` : ""}`;
    } else if (!pastBranchPoint) {
      episodeCallout = `Day ${episodeDays}: longer than ${nShorter} of ${nEps} historical episodes. The short bounces (${episodeHistory.shortAvg}d avg) would have ended by now${nShorter > 0 ? ` — ${nShorter} of ${nEps} did` : ""}. If we're still here past day ~${episodeHistory.branchDay}, the pattern matches a crypto winter (${episodeHistory.longAvg}d avg).${isDeepEnough ? ` The depth (${episodePeak.toFixed(2)}σ) suggests the longer scenario.` : ` The depth (${episodePeak.toFixed(2)}σ) is relatively shallow — still consistent with a bounce.`}`;
    } else if (pctThrough < 80) {
      episodeCallout = `Day ${episodeDays}: past the branch point (day ${episodeHistory.branchDay}). This is now a structurally long episode — only the ${nLonger} longest historical episodes (${longerEpisodes.join(", ")}d) went further. Every time BTC stayed below fair value this long, the eventual rally was 200–400%.${sigImproving ? " The price is starting to move back toward fair value — the turn may be forming." : ""}`;
    } else {
      episodeCallout = `Day ${episodeDays}: longer than ${pctThrough}% of all historical ${episodeHistory.label} episodes. ${nLonger === 0 ? "This is unprecedented — no previous episode lasted this long." : `Only ${nLonger} episode${nLonger > 1 ? "s" : ""} went further.`} In the ${nEps - nLonger} comparable episodes that ended near this point, the subsequent 12-month return was strongly positive — though the sample is small (n=${nEps}).${sigImproving ? " The price is already moving back toward fair value." : ""}`;
    }
  } else {
    if (pctThrough < 25) {
      episodeCallout = `BTC has been in ${episodeHistory.label} territory for ${episodeDays} days. Previous episodes lasted ${durRange} days. It's early in the move — ${nLonger} of ${nEps} episodes lasted longer.${sigImproving ? " The price is cooling off, which could signal an early exit." : ""}${sigWorsening ? " The price is still pushing higher — the move has momentum." : ""}`;
    } else if (!pastBranchPoint) {
      episodeCallout = `Day ${episodeDays}: the short spikes (${episodeHistory.shortAvg}d avg) would be correcting by now — ${nShorter} of ${nEps} already did. If we cross day ~${episodeHistory.branchDay} without correcting, history says this becomes a full bull run (${episodeHistory.longAvg}d avg).${isDeepEnough ? ` The peak of ${episodePeak.toFixed(2)}σ is in bull run territory.` : ` The peak of ${episodePeak.toFixed(2)}σ is modest — more consistent with a spike.`}`;
    } else if (pctThrough < 80) {
      episodeCallout = `Day ${episodeDays}: past the branch point. This is a full cycle — only extended bull runs (${longerEpisodes.join(", ")}d) lasted longer. The correction risk grows with each passing day. Historically, the drawdown from these levels was 40–70%.${sigImproving ? " The price is starting to cool off — an early warning sign." : ""}`;
    } else {
      episodeCallout = `Day ${episodeDays}: longer than ${pctThrough}% of all historical ${episodeHistory.label} episodes. ${nLonger === 0 ? "No previous episode lasted this long." : `Only ${nLonger} went further.`} The risk of a sharp correction is at maximum. Every overheated episode that lasted this long ended with a 50–70% drawdown within 6 months.`;
    }
  }

  return {
    episodeCallout, conditionalRemaining, sigImproving, sigWorsening,
    episodeDays, episodeStart, episodePeak, pctThrough,
    episodeHistory, isDeepEnough, pastBranchPoint,
    longerEpisodes, nEps, nLonger, nShorter, durRange,
  };
}

/**
 * Detect market regime via 2D matrix: Position (σ) × Direction (momentum).
 * No scoring, no ambiguity — deterministic lookup.
 * H, vol, halfLife become diagnostics, not regime inputs.
 */
export function detectRegime(sig, mom, H, lambda2, annualVol, halfLife) {
  // ── Axis 1: Position (σ, validated by backtest) ──
  const sigZone = sig < -1.0 ? "deepValue" : sig < -0.5 ? "discount" : sig < 0.3 ? "fair" : sig < 0.8 ? "elevated" : "overheated";

  // ── Axis 2: Direction (momentum autocorrelation) ──
  const momZone = mom < -0.05 ? "negative" : mom > 0.05 ? "positive" : "flat";

  // ── 2D lookup — 15 distinct states ──
  const MATRIX = {
    deepValue:  { negative: "capitulation", flat: "deepValue",      positive: "earlyRecovery" },
    discount:   { negative: "bear",         flat: "accumulation",   positive: "recovery" },
    fair:       { negative: "cooling",      flat: "ranging",        positive: "warming" },
    elevated:   { negative: "correcting",   flat: "elevated",       positive: "bullRun" },
    overheated: { negative: "crash",        flat: "bubblePlateau",  positive: "euphoria" },
  };

  const regimeId = MATRIX[sigZone][momZone];

  // ── Regime metadata ──
  const REGIMES = {
    capitulation: {
      id: "capitulation", label: "Capitulation", zone: "Strong Buy",
      desc: "Bitcoin is deeply below fair value and still falling. This is panic selling — forced liquidations, capitulation, maximum fear. Historically, these are the absolute best entries.",
      history: "Previous capitulation phases (σ < -1.0 with negative momentum) lasted weeks to months. Every single one preceded a rally of 100-400%.",
      implication: "Maximum opportunity. The price may keep falling in the short term, but every historical entry from this level was profitable at 12 months.",
    },
    deepValue: {
      id: "deepValue", label: "Deep value", zone: "Strong Buy",
      desc: "Bitcoin is deeply discounted and the selling pressure has stopped. The price is sitting at the bottom, not falling further. Smart money accumulates here while the market is quiet.",
      history: "Deep value with flat momentum has been the launchpad for every major rally. Duration: weeks to a few months before recovery begins.",
      implication: "Strongest buying opportunity. The discount is maximum and the trend is stabilizing.",
    },
    earlyRecovery: {
      id: "earlyRecovery", label: "Early recovery", zone: "Strong Buy",
      desc: "Bitcoin is deeply discounted but momentum has turned positive — the first signs of recovery from a major bottom. A V-shaped bounce may be forming.",
      history: "Early recoveries from deep value are fast and violent. Typical 3-month return: +50-150%.",
      implication: "Strong buy. The discount is still deep and the trend just turned in your favor.",
    },
    bear: {
      id: "bear", label: "Bear market", zone: "Buy",
      desc: "Bitcoin is below fair value and still falling. The market hasn't found its floor yet. Sentiment is negative, volume is declining, and each bounce sells off.",
      history: "Bear markets at this σ level lasted 93–860 days. Every single one ended with a rally to new all-time highs.",
      implication: "Good entry if you can handle short-term pain. The price may keep falling, but 100% of the time it was higher 12 months later from this level.",
    },
    accumulation: {
      id: "accumulation", label: "Accumulation", zone: "Buy",
      desc: "Bitcoin is below fair value and momentum has flattened — the price isn't falling anymore, but it isn't recovering either. The market is building a base. Smart money is buying while retail has given up.",
      history: "Accumulation phases typically last 3-12 months. They're the quiet period between capitulation and the next leg up, characterized by low volatility and sideways action.",
      implication: "Strong buying opportunity with patience. The worst of the decline is likely over, but the recovery may take months.",
    },
    recovery: {
      id: "recovery", label: "Recovery", zone: "Buy",
      desc: "Bitcoin is below fair value but momentum has turned positive — the market is recovering. Confidence is returning and buyers are stepping in.",
      history: "Recovery phases from the discount zone are typically 1-3 months. They often accelerate as the price approaches fair value.",
      implication: "Good entry. Less discount than accumulation but the trend is now working for you.",
    },
    cooling: {
      id: "cooling", label: "Cooling", zone: "Hold",
      desc: "Bitcoin is near fair value but drifting lower. Momentum is negative — the market is cooling off. This could be a mild pullback or the start of a deeper correction.",
      history: "Cooling from fair value either resolves into a buying opportunity (if σ drops below -0.5) or stabilizes near fair value.",
      implication: "Wait. If you're holding, continue holding. If you want to enter, a better price may be coming.",
    },
    ranging: {
      id: "ranging", label: "Ranging", zone: "Hold",
      desc: "Bitcoin is trading near its structural fair value with no clear direction. The market is in equilibrium — waiting for the next catalyst.",
      history: "Ranging periods last weeks to months. They resolve into either a bull run or a correction depending on external catalysts.",
      implication: "No strong edge. Hold existing positions, avoid adding size at this level.",
    },
    warming: {
      id: "warming", label: "Warming", zone: "Hold",
      desc: "Bitcoin is near fair value and drifting higher. Momentum is positive — the market is warming up. Could be the start of a new trend or just a bounce.",
      history: "Warming phases often precede bull runs if accompanied by increasing volume and Hurst persistence above 0.55.",
      implication: "Modestly positive. If you're holding, stay in. If you want to enter, you're paying fair value — not a discount.",
    },
    correcting: {
      id: "correcting", label: "Correction starting", zone: "Reduce",
      desc: "Bitcoin is above fair value and momentum has turned negative — the trend is breaking. This is often the first phase of a correction, as profit-taking begins and new buyers hesitate.",
      history: "When elevated prices meet negative momentum, corrections of 20-40% typically follow within 1-3 months.",
      implication: "Consider reducing exposure. The trend has turned against you at an elevated level.",
    },
    elevated: {
      id: "elevated", label: "Elevated", zone: "Reduce",
      desc: "Bitcoin is above fair value but stable — not rising or falling sharply. The market is extended but holding. This is a plateau that typically resolves with a correction.",
      history: "Elevated plateaus (σ 0.3-0.8 with flat momentum) tend to precede corrections rather than further rallies. Duration: weeks to a few months.",
      implication: "Not a good time to add. If you're in, consider your exit plan.",
    },
    bullRun: {
      id: "bullRun", label: "Bull run", zone: "Reduce",
      desc: "Bitcoin is above fair value with strong positive momentum — a classic bull run. FOMO is building, leverage is increasing, and media attention is growing. The trend is strong but unsustainable.",
      history: "Previous bull runs lasted 64–500 days above σ > 0.3. The longer and higher, the sharper the eventual correction (40-70%).",
      implication: "Enjoy the ride but have a plan. The model says this ends badly for new buyers — historically, only 33% were in profit 12 months later from this zone.",
    },
    crash: {
      id: "crash", label: "Crash", zone: "Sell",
      desc: "Bitcoin is well above fair value and momentum has turned sharply negative — the bubble is bursting. This is the most dangerous phase: rapid price declines, liquidation cascades, and panic.",
      history: "Every major Bitcoin crash started from σ > 0.8 with momentum turning negative. Average drawdown: -50-70% over 3-6 months.",
      implication: "Exit or reduce immediately. The trend has broken at an extremely elevated level.",
    },
    bubblePlateau: {
      id: "bubblePlateau", label: "Bubble plateau", zone: "Sell",
      desc: "Bitcoin is well above fair value and momentum has flattened — the rally has stalled at extreme levels. This is the top. Historically, flat momentum at σ > 0.8 precedes the sharpest corrections.",
      history: "Bubble plateaus are brief (days to weeks). They're the moment between euphoria and crash.",
      implication: "Strongest sell signal. Take profit. 94% of the time the price was lower 12 months later from this level.",
    },
    euphoria: {
      id: "euphoria", label: "Euphoria", zone: "Sell",
      desc: "Bitcoin is well above fair value and still accelerating — maximum greed, maximum leverage, maximum media frenzy. This is the peak of the cycle.",
      history: "Euphoria phases (σ > 0.8 with positive momentum) are the final leg before major corrections. They can last days to weeks but always end the same way.",
      implication: "Take profit. The momentum feels unstoppable but every previous euphoria phase was followed by a 50-70% crash.",
    },
  };

  const regime = REGIMES[regimeId] || REGIMES.ranging;

  // ── Diagnostics (shown but don't determine regime) ──
  const diagnostics = [
    { label: "Hurst exponent (90d)", value: H.toFixed(2), interpretation: H > 0.65 ? "Strong trend persistence" : H > 0.55 ? "Moderate persistence" : "Weak / mean-reverting" },
    { label: "Intermittency λ²", value: lambda2.toFixed(2), interpretation: lambda2 > 0.15 ? "High vol clustering" : lambda2 > 0.08 ? "Moderate" : "Low clustering" },
    { label: "Annualized volatility", value: `${(annualVol * 100).toFixed(0)}%`, interpretation: annualVol > 0.8 ? "High" : annualVol > 0.4 ? "Normal" : "Low" },
    { label: "Mean-reversion half-life", value: `${halfLife}d`, interpretation: halfLife < 30 ? "Fast reversion" : halfLife < 90 ? "Moderate" : "Slow reversion" },
  ];

  // Backward compat: domRegime shape
  const domRegime = {
    id: regime.id, label: regime.label, score: 0, // score deprecated
    narrative: { desc: regime.desc, history: regime.history, implication: regime.implication },
    zone: regime.zone, sigZone, momZone,
  };

  // All 5 position zones with their current momentum state
  const regimes = [
    { id: "overheated", label: REGIMES[MATRIX.overheated[momZone]]?.label || "Overheated", score: sigZone === "overheated" ? 1 : 0 },
    { id: "elevated", label: REGIMES[MATRIX.elevated[momZone]]?.label || "Elevated", score: sigZone === "elevated" ? 1 : 0 },
    { id: "fair", label: REGIMES[MATRIX.fair[momZone]]?.label || "Ranging", score: sigZone === "fair" ? 1 : 0 },
    { id: "discount", label: REGIMES[MATRIX.discount[momZone]]?.label || "Discount", score: sigZone === "discount" ? 1 : 0 },
    { id: "deepValue", label: REGIMES[MATRIX.deepValue[momZone]]?.label || "Deep value", score: sigZone === "deepValue" ? 1 : 0 },
  ];

  return { domRegime, regimes, diagnostics, sigZone, momZone, MATRIX, REGIMES };
}

export function generateVerdict(ctx) {
  const {
    sig, S0, a, b, t0, resMean, resStd, resFloor, ransac, plToday,
    mcLossHorizons, percentiles, percentiles3y,
    pFloorBreak1y, calibratedThresholds, scoringParams, calibratedWeights,
    ouRegimes, rollingHurst, backtestResults,
    episodeCallout, conditionalRemaining, sigImproving, sigWorsening,
    episodeDays, episodeHistory,
    domRegime, deviationPct,
  } = ctx;

  const loss1y = mcLossHorizons.find(h => h.days === 365);
  const loss3y = mcLossHorizons.find(h => h.days === 1095);
  const l1y = loss1y?.pLoss || 50;
  const l3y = loss3y?.pLoss || 50;
  const pl1yFutureLocal = plPrice(a, b, t0 + 365);
  const pl3yFuture = plPrice(a, b, t0 + 1095);
  const pl3yReturn = ((pl3yFuture - S0) / S0 * 100);

  const supportPrice = supportFloor(t0, { a, b, resFloor, ransac });

  const pPos1y = Math.max(0, Math.min(100, 100 - l1y));
  const pPos3y = Math.max(0, Math.min(100, 100 - l3y));
  const pFloor = pFloorBreak1y || 0;

  const pFV = Math.max(0, Math.min(100, (() => {
    const target = pl1yFutureLocal;
    const row = percentiles[percentiles.length - 1];
    if (!row) return 50;
    const pts = [{price:row.p5,prob:5},{price:row.p25,prob:25},{price:row.p50,prob:50},{price:row.p75,prob:75},{price:row.p95,prob:95}];
    if (target <= pts[0].price) return 97.5;
    if (target >= pts[4].price) return 2.5;
    for (let k = 0; k < pts.length - 1; k++) {
      if (target >= pts[k].price && target <= pts[k+1].price) {
        const t = (target - pts[k].price) / (pts[k+1].price - pts[k].price);
        return 100 - (pts[k].prob + t * (pts[k+1].prob - pts[k].prob));
      }
    }
    return 50;
  })()));

  // ── Signal: pure sigma rules ──
  let level, internalLevel;
  if (sig < SIG.strongBuy)     { level = "strongBuy"; internalLevel = "strongBuy"; }
  else if (sig < SIG.buy)      { level = "buy";       internalLevel = "buy"; }
  else if (sig < 0)            { level = "hold";      internalLevel = "accumulate"; }
  else if (sig < 0.3)          { level = "hold";      internalLevel = "neutral"; }
  else if (sig < SIG.reduce)   { level = "hold";      internalLevel = "caution"; }
  else if (sig < SIG.sell)     { level = "reduce";    internalLevel = "reduce"; }
  else                         { level = "sell";       internalLevel = "sell"; }

  // MC pLoss safety check: if in accumulate zone but pLoss > 40%, downgrade to neutral
  if (internalLevel === "accumulate" && l1y > 40) {
    internalLevel = "neutral";
  }

  // Hurst divergences — kept as diagnostic, NOT used for signal
  const sellThr = backtestResults?.sellThresholds || { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 };
  const hurstDiv = computeHurstDivergences(rollingHurst, sig, 6, sellThr);

  // Buy score — simplified: sigma distance, reported for UI
  const buyScore = sig < SIG.buy ? +((-sig - 0.5) * 2).toFixed(3) : 0;

  // ── Verdict text by level ──
  let answer, answerColor, answerSub, confidence, subtitle, subtitleColor;

  if (level === "sell") {
    answer = "NO"; answerColor = "#EB5757"; confidence = "high";
    subtitle = "Sell"; subtitleColor = "#EB5757";
    answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% above fair value (σ ${sig.toFixed(2)}). Historically, every time Bitcoin was this extended, the 12-month return was negative. The average outcome from here is −34%.`;
  } else if (level === "reduce") {
    answer = "NO"; answerColor = "#F2994A"; confidence = "moderate";
    subtitle = "Reduce"; subtitleColor = "#F2994A";
    answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% above fair value (σ ${sig.toFixed(2)}). Only 33% of the time was the price higher 12 months later from this zone. Corrections happen more often than not — reduce exposure or wait.`;
  } else if (level === "strongBuy") {
    answer = "YES"; answerColor = "#27AE60"; confidence = "high";
    subtitle = "Strong Buy"; subtitleColor = "#1B8A4A";
    answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% below fair value (σ ${sig.toFixed(2)}). Deep discount — the model's strongest configuration. Historically, 100% of the time the price was higher 12 months later, with a worst case of +30%.`;
  } else if (level === "buy") {
    answer = "YES"; answerColor = "#27AE60"; confidence = "moderate";
    subtitle = "Buy"; subtitleColor = "#27AE60";
    answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% below fair value (σ ${sig.toFixed(2)}). Structural discount — 100% accuracy historically, worst case +22%. The odds are clearly in your favor.`;
  } else {
    // Hold — text depends on internal level
    if (internalLevel === "accumulate") {
      answer = "YES"; answerColor = "#27AE60"; confidence = "low";
      subtitle = "Hold"; subtitleColor = "#E8A838";
      answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% ${deviationPct >= 0 ? "above" : "below"} fair value (σ ${sig.toFixed(2)}). Not technically at a discount, but every time Bitcoin was in this zone, it was higher 12 months later. Good entry if you're building a position.`;
    } else if (internalLevel === "caution") {
      answer = "NO"; answerColor = "#E8A838"; confidence = "low";
      subtitle = "Hold"; subtitleColor = "#E8A838";
      answerSub = `Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% above fair value (σ ${sig.toFixed(2)}). Getting warm. From this zone, it's close to a coin flip whether the price is higher in 12 months. If you're already in, hold. If you're not, wait.`;
    } else {
      // neutral
      answer = "NO"; answerColor = "#E8A838"; confidence = "low";
      subtitle = "Hold"; subtitleColor = "#E8A838";
      answerSub = `Bitcoin is ${deviationPct >= 0 ? Math.abs(deviationPct).toFixed(0) + "% above" : Math.abs(deviationPct).toFixed(0) + "% below"} fair value (σ ${sig.toFixed(2)}). Fair value zone — odds still favor you (83% historically) but downside risk appears. Patience.`;
    }
  }

  // ── Signals panel (simplified — sigma-driven) ──
  const thr = { sig: SIG.buy, pLoss1y: 20, pFV: 40 };
  const plSignals = [
    { name: "Price vs fair value", value: `${sig.toFixed(2)}σ`, threshold: `< ${SIG.buy}σ`, met: sig < SIG.buy, detail: `${Math.abs(deviationPct).toFixed(0)}% ${deviationPct >= 0 ? "above" : "below"} fair value`, source: "pl" },
    { name: "Worst case floor", value: fmtK(supportPrice), threshold: `< 5%`, met: pFloor < 5, detail: `−${((S0 - supportPrice) / S0 * 100).toFixed(0)}% from today`, source: "pl" },
  ];
  const mcSignals = [
    { name: "Chance of loss (12m)", value: `${l1y.toFixed(0)}%`, threshold: "context", met: l1y < 20, detail: `P(loss in 3Y): ${l3y.toFixed(0)}%`, source: "mc" },
    { name: "Chance of reaching fair value", value: `${pFV.toFixed(0)}%`, threshold: "context", met: pFV > 40, detail: `Fair value in 12m: ${fmtK(pl1yFutureLocal)}`, source: "mc" },
    { name: "Chance of hitting worst case", value: `${pFloor.toFixed(1)}%`, threshold: "context", met: pFloor < 5, detail: `Empirically calibrated`, source: "mc" },
  ];

  // ── Explanatory paragraphs ──
  const paras = [];
  const regimeNote = `in ${domRegime.label.toLowerCase()}`;

  if (sig > 1.8) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% above where the model says it should be (${fmtK(plToday)}). That's expensive — every time BTC got this stretched in the past, a correction followed.`);
  } else if (sig > 0.8) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% above its fair value of ${fmtK(plToday)}. You're paying a premium. Historically, from this zone the 12-month return was negative on average.`);
  } else if (sig > 0.3) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% above its fair value of ${fmtK(plToday)}. Getting warm — the risk/reward starts to shift against you from here.`);
  } else if (sig > -0.5) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% ${deviationPct >= 0 ? "above" : "below"} its fair value of ${fmtK(plToday)}. That's a fair price — right in the middle of the normal range.`);
  } else {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% below its fair value of ${fmtK(plToday)}. It's on sale. These are the entries people look back on and wish they'd sized up.`);
  }

  const maxDownside = ((S0 - supportPrice) / S0 * 100);
  const mcWorst3y = loss3y?.p5 ? ((loss3y.p5 - S0) / S0 * 100) : -30;
  paras.push(`If you buy today and hold 1 year, there's a ${pFV.toFixed(0)}% chance the price reaches its fair value of ${fmtK(pl1yFutureLocal)}. The worst case floor — the lowest level Bitcoin has historically respected — is ${fmtK(supportPrice)} (−${maxDownside.toFixed(0)}% from today). Over 3 years, the fair value target is ${fmtK(pl3yFuture)} (${pl3yReturn >= 0 ? "+" : ""}${pl3yReturn.toFixed(0)}%).${mcWorst3y > 0 ? " Even in the worst 5% of simulations, you're in profit at 3 years." : ""}`);
  paras.push(episodeCallout || `Bitcoin is near its structural fair value. The market is ${regimeNote}.`);
  if (Math.abs(sig) >= 0.15 && conditionalRemaining > 0) {
    paras.push(`Based on how long previous episodes lasted, the model estimates about ${Math.round(conditionalRemaining / 30)} more months before Bitcoin returns to fair value. ${sigImproving ? "The trend is already improving — it could be faster." : sigWorsening ? "The trend is still worsening — it could take longer." : "The trend is flat — patience required."}`);
  }
  paras.push(`Your chance of being at a loss after 1 year: ~${l1y.toFixed(0)}%. After 3 years: ~${l3y.toFixed(0)}%.${l3y < 5 ? " Time is on your side." : l3y < 15 ? " The longer you hold, the better the odds." : ""}`);

  // ── 3Y verdict — sigma-based ──
  const pFV3y = Math.max(0, Math.min(100, probAbove(percentiles3y, pl3yFuture)));
  let verdict3y, verdict3yColor;
  if (sig < SIG.strongBuy)    { verdict3y = "Strong Buy"; verdict3yColor = "#1B8A4A"; }
  else if (sig < SIG.buy)     { verdict3y = "Buy";        verdict3yColor = "#27AE60"; }
  else if (sig < 0)           { verdict3y = "Buy";        verdict3yColor = "#27AE60"; } // accumulate → buy at 3Y
  else if (sig < SIG.reduce)  { verdict3y = "Hold";       verdict3yColor = "#E8A838"; }
  else if (sig < SIG.sell)    { verdict3y = "Reduce";     verdict3yColor = "#F2994A"; }
  else                        { verdict3y = "Sell";        verdict3yColor = "#EB5757"; }

  // Horizon cards
  const supportAt = t => supportFloor(t, { a, b, resFloor, ransac });
  const horizonCards = [
    {
      horizon: "1 year", plTarget: pl1yFutureLocal,
      plReturn: ((pl1yFutureLocal - S0) / S0 * 100),
      pProfit: pPos1y, pLoss: l1y, pFairValue: pFV,
      worstCase: supportAt(t0 + 365),
      verdict: subtitle, verdictColor: subtitleColor, answer, answerColor,
    },
    {
      horizon: "3 years", plTarget: pl3yFuture,
      plReturn: pl3yReturn, pProfit: pPos3y, pLoss: l3y, pFairValue: pFV3y,
      worstCase: supportAt(t0 + 1095),
      verdict: verdict3y, verdictColor: verdict3yColor,
      answer: verdict3y === "Sell" || verdict3y === "Reduce" || verdict3y === "Hold" ? "NO" : "YES",
      answerColor: verdict3y === "Strong Buy" || verdict3y === "Buy" ? "#27AE60" : verdict3y === "Sell" ? "#EB5757" : "#F2994A",
    },
  ];

  // Backward-compat flags (for DriversPanel display)
  const isBubble = sig >= SIG.sell;
  const isWarmBubble = sig >= SIG.reduce && sig < SIG.sell;
  const bubbleSigThr = SIG.sell;

  // ── Lite texts — no jargon, retail-friendly ──
  const isBuyZone = level === "strongBuy" || level === "buy" || (level === "hold" && internalLevel === "accumulate");
  const isSellZone = level === "sell" || level === "reduce";
  const action = isSellZone ? "hold" : "buy";

  // MC worst cases
  const mc1y = percentiles?.[percentiles.length - 1] || {};
  const mc3y = percentiles3y?.[percentiles3y.length - 1] || {};
  const worst1y = mc1y.p5 || 0;
  const worst3y = mc3y.p5 || 0;
  const worst1yPct = worst1y > 0 ? ((worst1y - S0) / S0 * 100).toFixed(0) : null;
  const worst3yPct = worst3y > 0 ? ((worst3y - S0) / S0 * 100).toFixed(0) : null;
  const best1y = mc1y.p95 || 0;
  const pl1yReturn = ((pl1yFutureLocal - S0) / S0 * 100);

  // Backtest accuracy by zone (from backtest or hardcoded from analysis)
  const btAcc = { strongBuy: 100, buy: 100, accumulate: 100, neutral: 83, caution: 56, reduce: 33, sell: 6 };
  const btWorst = { strongBuy: "+30%", buy: "+22%", accumulate: "+30%", neutral: "-13%", caution: "-28%", reduce: "-57%", sell: "-67%" };
  const acc = btAcc[internalLevel] || 50;
  const accStr = acc === 100 ? "100% of the time" : `${acc}% of the time`;
  const lossAcc = 100 - acc;

  // Loss curve from mcLossHorizons
  const lossCurve = mcLossHorizons.map(h => ({ label: h.label, pct: Math.round(h.pLoss) }));

  // ── answerSubLite ──
  let answerSubLite;
  if (internalLevel === "strongBuy") {
    answerSubLite = `If you buy Bitcoin today at ${fmtK(S0)}, according to our model's backtest, every single time Bitcoin was this cheap, the price was higher after 1 year. Even the worst entry returned +30%. After 3 years, your chance of being at a loss: less than 5%. This is the best buying opportunity the model can identify.`;
  } else if (internalLevel === "buy") {
    answerSubLite = `If you buy Bitcoin today at ${fmtK(S0)}, according to our model's backtest, 100% of the time the price was higher after 1 year from this level. The worst entry still returned +22%. After 3 years, your chance of being at a loss: less than 5%.`;
  } else if (internalLevel === "accumulate") {
    answerSubLite = `If you buy Bitcoin today at ${fmtK(S0)}, according to our model's backtest, 100% of the time the price was higher after 1 year. Not technically a discount, but it has never failed from here. After 3 years, your chance of being at a loss: less than 10%.`;
  } else if (internalLevel === "neutral") {
    answerSubLite = `If you buy Bitcoin today at ${fmtK(S0)}, according to our model's backtest, the price was higher after 1 year 83% of the time. After 3 years, 88%. The odds are in your favor, but it's not a clear signal.`;
  } else if (internalLevel === "caution") {
    answerSubLite = `If you buy Bitcoin today at ${fmtK(S0)}, according to our model's backtest, the price was higher after 1 year only 56% of the time. After 3 years, 72%. That's close to a coin flip. Not the time to enter.`;
  } else if (internalLevel === "reduce") {
    answerSubLite = `If you hold Bitcoin today at ${fmtK(S0)}, according to our model's backtest, the price was lower after 1 year 67% of the time. After 3 years, 45% still at a loss. Consider reducing your position.`;
  } else {
    answerSubLite = `If you hold Bitcoin today at ${fmtK(S0)}, according to our model's backtest, the price was lower after 1 year 94% of the time, with an average loss of -34%. After 3 years, 70% still at a loss. Consider taking profit.`;
  }

  // ── parasLite — 6 paragraphs ──
  const parasLite = [];

  // 1. Where you are + backtest (same as answerSubLite but expanded)
  const devDir = deviationPct >= 0 ? "more expensive" : "cheaper";
  parasLite.push(`Bitcoin is trading at ${fmtK(S0)}. Our model says it should be worth ${fmtK(plToday)} — that means it's ${Math.abs(deviationPct).toFixed(0)}% ${devDir} than where it should be. ${isBuyZone ? "That's a discount." : isSellZone ? "That's historically dangerous." : "That's close to fair value."}`);

  // 2. What the model projects
  if (isSellZone) {
    parasLite.push(`Looking forward, the model's fair value in 1 year is ${fmtK(pl1yFutureLocal)} — that's ${pl1yReturn >= 0 ? Math.abs(pl1yReturn).toFixed(0) + "% above" : Math.abs(pl1yReturn).toFixed(0) + "% below"} where you are now. In 3 years, ${fmtK(pl3yFuture)}. ${pl1yReturn < 0 ? "The structural trajectory is below your entry price." : "Even the fair value target barely justifies the risk."}`);
  } else {
    parasLite.push(`Looking forward, the model's fair value target in 1 year is ${fmtK(pl1yFutureLocal)} (${pl1yReturn >= 0 ? "+" : ""}${pl1yReturn.toFixed(0)}% from today). In 3 years, ${fmtK(pl3yFuture)} (${pl3yReturn >= 0 ? "+" : ""}${pl3yReturn.toFixed(0)}%). These aren't predictions — they're where the structural growth trajectory points. The actual path will be volatile, but the destination has been remarkably consistent.`);
  }

  // 3. Worst case from MC (1Y and 3Y)
  if (worst1y > 0 && worst3y > 0) {
    if (isSellZone) {
      parasLite.push(`In the worst 5% of the model's simulations, Bitcoin is at ${fmtK(worst1y)} after 1 year (${worst1yPct > 0 ? "+" : ""}${worst1yPct}% from here) and ${fmtK(worst3y)} after 3 years (${worst3yPct > 0 ? "+" : ""}${worst3yPct}%).${parseFloat(worst1yPct) < 0 && parseFloat(worst3yPct) < 0 ? " Even the optimistic scenarios barely recover your entry price." : ""}`);
    } else {
      parasLite.push(`In the worst 5% of the model's simulations, Bitcoin is at ${fmtK(worst1y)} after 1 year (${worst1yPct > 0 ? "+" : ""}${worst1yPct}% from here) and ${fmtK(worst3y)} after 3 years (${worst3yPct > 0 ? "+" : ""}${worst3yPct}%).${parseFloat(worst3yPct) > 0 ? " Even the pessimistic path ends in profit." : ""}`);
    }
  }

  // 4. Episode timing
  if (episodeCallout && Math.abs(sig) >= 0.15) {
    const epDays = episodeDays || 0;
    const epHist = episodeHistory || {};
    const nEps = epHist.durations?.length || 0;
    const durRange = nEps > 0 ? `${Math.min(...epHist.durations)}–${Math.max(...epHist.durations)}` : null;
    if (epDays > 0 && durRange) {
      if (sig < 0) {
        parasLite.push(`Bitcoin has been below fair value for ${epDays} days. Previous episodes like this lasted ${durRange} days. ${conditionalRemaining > 0 ? `The model estimates about ${Math.round(conditionalRemaining / 30)} more months before the price returns to fair value.` : ""}${sigImproving ? " The price is already starting to recover." : sigWorsening ? " The price is still falling — the bottom may not be in yet." : ""}`);
      } else {
        parasLite.push(`Bitcoin has been above fair value for ${epDays} days. Previous episodes like this lasted ${durRange} days. ${conditionalRemaining > 0 ? `The model estimates about ${Math.round(conditionalRemaining / 30)} more months before a correction.` : ""}${sigImproving ? " The price is starting to cool off." : sigWorsening ? " The price is still rising — the move has momentum." : ""}`);
      }
    }
  }

  // 5. Loss curve
  const lc = lossCurve.filter(h => h.pct > 0 || h.label === "3 years");
  if (lc.length > 0) {
    const lcStr = lc.map(h => `after ${h.label}: ~${h.pct}%`).join(", ");
    if (isSellZone) {
      parasLite.push(`Your risk of being at a loss: ${lcStr}. Time does not help enough from this level.`);
    } else {
      parasLite.push(`Your risk of being at a loss: ${lcStr}.${l3y < 5 ? " Time is on your side." : l3y < 15 ? " The longer you hold, the better the odds." : ""}`);
    }
  }

  // 6. Short-term disclaimer
  if (isBuyZone) {
    parasLite.push("Important: this model is calibrated for 1-year and 3-year horizons. In the short term, Bitcoin can drop 20-30% even during a bull market — that's normal. A buy signal does not mean the price goes up tomorrow. It means that if you buy today and hold for at least 12 months, history is on your side.");
  } else if (isSellZone) {
    parasLite.push("Important: this model is calibrated for 1-year and 3-year horizons. In the short term, Bitcoin can rally 20-30% even in overheated territory — that's normal. A sell signal does not mean the price drops tomorrow. It means that holding from this level for 12 months has historically resulted in losses.");
  } else {
    parasLite.push("Important: this model is calibrated for 1-year and 3-year horizons. In the short term, anything can happen — Bitcoin routinely moves 10-20% in either direction within weeks. The model has no opinion about short-term moves.");
  }

  return {
    answer, answerColor, answerSub, answerSubLite, subtitle, subtitleColor,
    composite: (pFV - 50) / 50, confidence, paras, parasLite,
    level, internalLevel,
    plSignals, mcSignals,
    pFV, pFV3y, pPos1y, pPos3y, pFloor, l1y, l3y,
    nCondsMet: 0, thr,
    buyScore,
    hurstDiv, horizonCards,
    isBubble, isWarmBubble, isSellHurst: false, isReduceHurst: false, bubbleSigThr,
    thresholds: SIG,
  };
}
