// ── Verdict generator — pure function, no React deps ──
// Receives all pre-computed data as a context object, returns verdict.
import { plPrice } from "./powerlaw.js";
import { computeHurstDivergences } from "./regime.js";
import { fmtK } from "./constants.js";

// Helper: interpolate probability from MC percentiles
function mcLossProb(pcts, day, spotPrice) {
  const idx = Math.min(Math.floor(day / 5), pcts.length - 1);
  const row = pcts[idx];
  if (!row) return null;
  const knownPcts = [
    { price: row.p5, prob: 5 },
    { price: row.p25, prob: 25 },
    { price: row.p50, prob: 50 },
    { price: row.p75, prob: 75 },
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

/**
 * Compute MC loss horizons from percentile data
 */
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
    ? Math.round((1 - longerEpisodes.length / episodeHistory.durations.length) * 100)
    : 0;
  const conditionalRemaining = longerEpisodes.length > 0
    ? longerEpisodes[Math.floor(longerEpisodes.length / 2)] - episodeDays
    : 0;
  const pastBranchPoint = episodeDays > episodeHistory.branchDay;
  const nEps = episodeHistory.durations.length;
  const nLonger = longerEpisodes.length;
  const nShorter = nEps - nLonger;
  const durRange = nEps > 0 ? `${Math.min(...episodeHistory.durations)}–${Math.max(...episodeHistory.durations)}` : "0";

  // Build callout text
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
    episodeCallout, episodeDays, episodePeak, episodeHistory,
    sigImproving, sigWorsening, sigDirection,
    conditionalRemaining, longerEpisodes, pctThrough, pastBranchPoint,
  };
}

/**
 * Regime detection
 */
export function detectRegime(sig, mom, H, lambda2, annualVol, halfLife) {
  const bullConds = [sig > 0.5, sig > 1.0, mom > 0.08, mom > 0.12, H > 0.58, H > 0.65, annualVol >= 0.45].filter(Boolean).length;
  const bearConds = [sig < -0.8, sig < -1.2, mom < -0.06, mom < -0.10, H > 0.60, annualVol >= 0.80, halfLife > 120].filter(Boolean).length;
  const rangeConds = [Math.abs(sig) < 0.4, Math.abs(sig) < 0.2, Math.abs(mom) < 0.05, Math.abs(mom) < 0.03, H < 0.58, lambda2 < 0.12, annualVol < 0.45].filter(Boolean).length;
  const accumConds = [sig < -0.7, sig < -1.0, mom > -0.04, H < 0.62, annualVol < 0.80, halfLife < 200, lambda2 < 0.20].filter(Boolean).length;
  const recovConds = [sig < 0.2, mom > 0.04, mom > 0.08, H > 0.55, annualVol < 0.80, sig > -1.0, halfLife < 180].filter(Boolean).length;
  const regimes = [
    { id: "bear", emoji: "🐻", label: "Bear Market", score: bearConds, color: "#EB5757", desc: "Sustained downward pressure" },
    { id: "range", emoji: "↔️", label: "Ranging", score: rangeConds, color: "#9B9A97", desc: "Sideways consolidation" },
    { id: "accum", emoji: "🎯", label: "Accumulation", score: accumConds, color: "#2F80ED", desc: "Smart money buying" },
    { id: "recov", emoji: "🌱", label: "Recovery", score: recovConds, color: "#27AE60", desc: "Early uptrend forming" },
    { id: "bull", emoji: "🚀", label: "Bull Run", score: bullConds, color: "#6FCF97", desc: "Strong upward momentum" },
  ];
  const domRegime = regimes.reduce((a, b) => a.score > b.score ? a : b);
  return { regimes, domRegime };
}

/**
 * Main verdict generator — pure function
 * @param {Object} ctx - All pre-computed data needed for the verdict
 */
export function generateVerdict(ctx) {
  const {
    sig, S0, a, b, t0, resMean, resStd, resFloor, ransac, plToday,
    mcLossHorizons, percentiles, percentiles3y,
    pFloorBreak1y, calibratedThresholds, scoringParams, calibratedWeights,
    ouRegimes, rollingHurst, backtestResults,
    episodeCallout, conditionalRemaining, sigImproving, sigWorsening,
    domRegime, deviationPct,
  } = ctx;

  const loss1y = mcLossHorizons.find(h => h.days === 365);
  const loss3y = mcLossHorizons.find(h => h.days === 1095);
  const l1y = loss1y?.pLoss || 50;
  const l3y = loss3y?.pLoss || 50;
  const pl1yFutureLocal = plPrice(a, b, t0 + 365);
  const pl3yFuture = plPrice(a, b, t0 + 1095);
  const pl3yReturn = ((pl3yFuture - S0) / S0 * 100);

  // PL: structural anchor
  const supportPrice = ransac
    ? Math.exp(ransac.a + ransac.b * Math.log(t0) + ransac.floor)
    : Math.exp(Math.log(plToday) + resFloor);

  // MC: probabilistic outlook
  const pPos1y = Math.max(0, Math.min(100, 100 - l1y));
  const pPos3y = Math.max(0, Math.min(100, 100 - l3y));
  const pFloor = pFloorBreak1y || 0;

  // P(reaches fair value in 12m)
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

  // Continuous score calibrated by backtest
  const isVolatile = ouRegimes.currentRegime === 1;
  const sp = scoringParams;
  const thr = calibratedThresholds || { sig: -0.5, pLoss1y: 20, pFV: 40 };

  let buyScore = 0;
  let nCondsMet = 0;
  let cond1_discount = false, cond2_lossRisk = false, cond3_fvReach = false, cond4_noFloor = false;

  if (sp && calibratedWeights) {
    const f1 = -(sig - sp.sigMean);
    const f2 = sp.lossMean - l1y;
    const f3 = pFV - sp.fvMean;
    const f4 = sp.floorMean - pFloor;
    const w = calibratedWeights;
    buyScore = w.w1*f1 + w.w2*f2 + w.w3*f3 + w.w4*f4;
    cond1_discount = sig < thr.sig;
    cond2_lossRisk = l1y < thr.pLoss1y;
    cond3_fvReach  = pFV > thr.pFV;
    cond4_noFloor  = pFloor < (isVolatile ? 3 : 5);
    nCondsMet = [cond1_discount, cond2_lossRisk, cond3_fvReach, cond4_noFloor].filter(Boolean).length;
    if (isVolatile) buyScore *= 0.75;
  } else {
    cond1_discount = sig < thr.sig;
    cond2_lossRisk = l1y < (isVolatile ? thr.pLoss1y * 0.75 : thr.pLoss1y);
    cond3_fvReach  = pFV > (isVolatile ? thr.pFV * 1.15 : thr.pFV);
    cond4_noFloor  = pFloor < (isVolatile ? 3 : 5);
    nCondsMet = [cond1_discount, cond2_lossRisk, cond3_fvReach, cond4_noFloor].filter(Boolean).length;
    buyScore = nCondsMet >= 4 ? 1 : nCondsMet >= 2 && cond1_discount ? 0.3 : 0;
  }

  const strongScoreThresh = sp?.strongThresh || 1;
  const isStructuralDiscount = sig < -0.5;
  const isDeepDiscount       = sig < -1.0;
  const isStrongBuy = isDeepDiscount  || buyScore >= strongScoreThresh;
  const isBuy       = (!isStrongBuy && isStructuralDiscount) || (buyScore > 0 && !isStrongBuy);

  // Hurst divergence sell signal (path 1)
  const sellThr = backtestResults?.sellThresholds || { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 };
  const hurstDiv = computeHurstDivergences(rollingHurst, sig, 6, sellThr);
  const inOverheat = sig > 0.5;
  const isSellHurst   = inOverheat && hurstDiv.score === 3;
  const isReduceHurst = inOverheat && hurstDiv.score === 2;

  // PL bubble sell signal (path 2)
  const sellSigThr   = backtestResults?.calibratedBubbleSig ?? 1.0;
  const reduceSigThr = backtestResults?.calibratedReduceSig ?? 0.5;
  const bubbleSigThr = sellSigThr;
  const isBubble     = sig > sellSigThr;
  const isWarmBubble = sig > reduceSigThr && !isBubble;

  // Combined
  const isSellSignal   = isSellHurst || isBubble;
  const isWaitSellSign = !isSellSignal && (isReduceHurst || isWarmBubble);

  const sellReason = isBubble
    ? `Power Law: Bitcoin is ${Math.abs(deviationPct).toFixed(0)}% above fair value (σ ${sig.toFixed(2)} > ${sellSigThr}). Above this level, the average 6-month return has been negative historically.`
    : `All three momentum warning signals active. Trend persistence is breaking down while price is extended.`;
  const reduceReason = isWarmBubble
    ? `Bitcoin is above the reduce threshold (σ ${sig.toFixed(2)} > ${reduceSigThr}). Corrections happen more than a third of the time from here — consider reducing new exposure.`
    : `Two momentum warning signals active at elevated price. Early signs of exhaustion.`;

  // Verdict: sell signals take priority over buy
  let answer, answerColor, answerSub, confidence, subtitle, subtitleColor;
  if (isSellSignal) {
    answer = "NO"; answerColor = "#EB5757"; confidence = "high";
    subtitle = "Sell"; subtitleColor = "#EB5757";
    answerSub = sellReason;
  } else if (isWaitSellSign) {
    answer = "NO"; answerColor = "#F2994A"; confidence = "moderate";
    subtitle = "Reduce"; subtitleColor = "#F2994A";
    answerSub = reduceReason;
  } else if (isStrongBuy) {
    answer = "YES"; answerColor = "#27AE60"; confidence = "high";
    subtitle = "Strong Buy"; subtitleColor = "#1B8A4A";
    answerSub = "The model's strongest buy configuration. Risk is low and the upside case is well-supported.";
  } else if (isBuy) {
    answer = "YES"; answerColor = "#27AE60"; confidence = "moderate";
    subtitle = "Buy"; subtitleColor = "#27AE60";
    answerSub = "The odds are in your favor. Both the structural and probabilistic picture support entry.";
  } else {
    answer = "NO"; answerColor = "#E8A838"; confidence = "low";
    subtitle = "Hold"; subtitleColor = "#E8A838";
    answerSub = sig > 0
      ? "Price is above fair value with no buy signal. Risk/return is deteriorating — not a good entry. If you hold, that's fine. If you don't, wait."
      : "No clear signal in either direction. Fair value zone — patience required.";
  }

  // PL signals panel
  const plSignals = [
    { name: "Price vs fair value", value: `${sig.toFixed(2)}σ`, threshold: `< ${thr.sig}σ`, met: cond1_discount, detail: `${Math.abs(deviationPct).toFixed(0)}% ${deviationPct >= 0 ? "above" : "below"} fair value`, source: "pl" },
    { name: "Worst case floor", value: fmtK(supportPrice), threshold: `< 5%`, met: cond4_noFloor, detail: `−${((S0 - supportPrice) / S0 * 100).toFixed(0)}% from today`, source: "pl" },
  ];

  // MC signals panel
  const totalW = calibratedWeights ? calibratedWeights.w2 + calibratedWeights.w3 + calibratedWeights.w4 : 3;
  const w2pct = calibratedWeights ? Math.round(calibratedWeights.w2 / totalW * 100) : 33;
  const w3pct = calibratedWeights ? Math.round(calibratedWeights.w3 / totalW * 100) : 33;
  const w4pct = calibratedWeights ? Math.round(calibratedWeights.w4 / totalW * 100) : 34;

  const mcSignals = [
    { name: "Chance of loss (12m)", value: `${l1y.toFixed(0)}%`, threshold: `weight: ${w2pct}%`, met: cond2_lossRisk, detail: `P(loss in 3Y): ${l3y.toFixed(0)}% · ${pPos3y.toFixed(0)}% of paths profitable at 3Y`, source: "mc" },
    { name: "Chance of reaching fair value", value: `${pFV.toFixed(0)}%`, threshold: `weight: ${w3pct}%`, met: cond3_fvReach, detail: `Fair value in 12m: ${fmtK(pl1yFutureLocal)}`, source: "mc" },
    { name: "Chance of hitting worst case", value: `${pFloor.toFixed(1)}%`, threshold: `weight: ${w4pct}%`, met: cond4_noFloor, detail: `Empirically calibrated from historical floor touches`, source: "mc" },
  ];

  // Explanatory paragraphs
  const paras = [];
  const regimeNote = domRegime.id === "bull" ? "in a bull run" : domRegime.id === "bear" ? "in a bear market" : domRegime.id === "accum" ? "in an accumulation phase" : domRegime.id === "recov" ? "in early recovery" : "in a ranging market";

  if (sig > 1.8) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% above where the model says it should be (${fmtK(plToday)}). That's expensive — every time BTC got this stretched in the past, a correction followed.`);
  } else if (sig > 0.8) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% above its fair value of ${fmtK(plToday)}. You're paying a premium. Not bubble territory yet, but the easy money has been made.`);
  } else if (sig > -0.5) {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% ${deviationPct >= 0 ? "above" : "below"} its fair value of ${fmtK(plToday)}. That's a fair price — right in the middle of the normal range.`);
  } else {
    paras.push(`Bitcoin at ${fmtK(S0)} is ${Math.abs(deviationPct).toFixed(0)}% below its fair value of ${fmtK(plToday)}. It's on sale. These are the entries people look back on and wish they'd sized up.`);
  }

  const maxDownside = ((S0 - supportPrice) / S0 * 100);
  paras.push(`If you buy today and hold 1 year, there's a ${pFV.toFixed(0)}% chance the price reaches its fair value of ${fmtK(pl1yFutureLocal)}. The worst case floor — the lowest level Bitcoin has historically respected — is ${fmtK(supportPrice)} (−${maxDownside.toFixed(0)}% from today). Over 3 years, the fair value target is ${fmtK(pl3yFuture)} (${pl3yReturn >= 0 ? "+" : ""}${pl3yReturn.toFixed(0)}%).`);
  paras.push(episodeCallout || `Bitcoin is near its structural fair value. The market is ${regimeNote}.`);
  if (Math.abs(sig) >= 0.15 && conditionalRemaining > 0) {
    paras.push(`Based on how long previous episodes lasted, the model estimates about ${Math.round(conditionalRemaining / 30)} more months before Bitcoin returns to fair value. ${sigImproving ? "The trend is already improving — it could be faster." : sigWorsening ? "The trend is still worsening — it could take longer." : "The trend is flat — patience required."}`);
  }
  paras.push(`Your chance of being at a loss after 1 year: ~${l1y.toFixed(0)}%. After 3 years: ~${l3y.toFixed(0)}%.${l3y < 5 ? " Time is on your side." : l3y < 15 ? " The longer you hold, the better the odds." : ""}`);

  // 3Y verdict
  const pFV3y = Math.max(0, Math.min(100, probAbove(percentiles3y, pl3yFuture)));
  let verdict3y = "Hold", verdict3yColor = "#E8A838";
  if (sp && calibratedWeights) {
    const w = calibratedWeights;
    const score3y = (w.w1*(-(sig - sp.sigMean)) + w.w2*(sp.lossMean - l3y) + w.w3*(pFV3y - sp.fvMean) + w.w4*(sp.floorMean - pFloor)) * (isVolatile ? 0.75 : 1);
    if (score3y >= sp.strongThresh * 1.2) { verdict3y = "Strong Buy"; verdict3yColor = "#1B8A4A"; }
    else if (score3y > 0) { verdict3y = "Buy"; verdict3yColor = "#27AE60"; }
    else if (isSellSignal) { verdict3y = "Sell"; verdict3yColor = "#EB5757"; }
    else if (isWaitSellSign) { verdict3y = "Reduce"; verdict3yColor = "#F2994A"; }
  }

  // Horizon cards
  const supportAt = t => ransac
    ? Math.exp(ransac.a + ransac.b * Math.log(t) + ransac.floor)
    : supportPrice;

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

  return {
    answer, answerColor, answerSub, subtitle, subtitleColor,
    composite: (pFV - 50) / 50, confidence, paras,
    plSignals, mcSignals,
    pFV, pFV3y, pPos1y, pPos3y, pFloor, l1y, l3y,
    nCondsMet, thr: { sig: thr.sig, pLoss: thr.pLoss1y, pFV: thr.pFV },
    buyScore: +buyScore.toFixed(3),
    hurstDiv, horizonCards,
    isBubble, isWarmBubble, isSellHurst, isReduceHurst, bubbleSigThr,
  };
}
