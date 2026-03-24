// ── Unified Backtest — daily sampling, benchmarks, risk metrics ──
// Step=1: tests every day, not every 30. "Should I buy today?" means every day.
// No MC per point — just PL + sigma + future return. Fast.
// Benchmarks: buy & hold, DCA, z-score simple.
// Risk: Sharpe, max drawdown, time underwater.
import { daysSinceGenesis } from "./constants.js";
import { plPrice } from "./powerlaw.js";

// ── Signal thresholds (matching verdict.js) ──
const SIG = { strongBuy: -1.0, buy: -0.5, reduce: 0.5, sell: 0.8 };

function levelOf(sig) {
  if (sig < SIG.strongBuy) return "strongBuy";
  if (sig < SIG.buy) return "buy";
  if (sig >= SIG.sell) return "sell";
  if (sig >= SIG.reduce) return "reduce";
  return "no";
}
function internalLevelOf(sig) {
  if (sig < SIG.strongBuy) return "strongBuy";
  if (sig < SIG.buy) return "buy";
  if (sig >= SIG.sell) return "sell";
  if (sig >= SIG.reduce) return "reduce";
  if (sig < 0) return "accumulate";
  if (sig < 0.3) return "neutral";
  return "caution";
}

// ── Z-score simple benchmark (200-day MA of log price) ──
function zScoreSignal(prices, i, window = 200) {
  if (i < window) return "no";
  let sum = 0, sum2 = 0;
  for (let j = i - window; j < i; j++) {
    const lp = Math.log(prices[j].price);
    sum += lp; sum2 += lp * lp;
  }
  const mean = sum / window;
  const std = Math.sqrt(sum2 / window - mean * mean);
  if (std < 1e-8) return "no";
  const z = (Math.log(prices[i].price) - mean) / std;
  if (z < -1.0) return "strongBuy";
  if (z < -0.5) return "buy";
  if (z > 1.0) return "sell";
  return "no";
}

// ── Max drawdown during holding period ──
function maxDrawdown(prices, startIdx, days) {
  let peak = prices[startIdx].price;
  let maxDD = 0;
  const end = Math.min(startIdx + days, prices.length - 1);
  for (let i = startIdx; i <= end; i++) {
    if (prices[i].price > peak) peak = prices[i].price;
    const dd = (peak - prices[i].price) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return +(maxDD * 100).toFixed(1);
}

// ── Time underwater (days until breakeven) ──
function timeUnderwater(prices, startIdx, days) {
  const entry = prices[startIdx].price;
  const end = Math.min(startIdx + days, prices.length - 1);
  let underwaterDays = 0;
  for (let i = startIdx + 1; i <= end; i++) {
    if (prices[i].price < entry) underwaterDays++;
  }
  return underwaterDays;
}

// ── Episode counter ──
function countEpisodes(results, levelFilter) {
  let inEpisode = false;
  let episodes = 0;
  for (const r of results) {
    const match = levelFilter(r);
    if (match && !inEpisode) { episodes++; inEpisode = true; }
    if (!match) inEpisode = false;
  }
  return episodes;
}

export function runWalkForwardBacktest(prices, a, b, resMean, resStd, resFloor, evtCap, floorBreakProb, ouRegimes) {
  const results = [];
  const horizon = 365;
  const horizonSell = 182;
  const minTrainDays = 365 * 4;

  // ── Daily loop (step=1) ──
  for (let i = minTrainDays; i < prices.length - horizon; i++) {
    const p = prices[i];
    const t0 = daysSinceGenesis(p.date);
    if (t0 <= 0 || p.price <= 0) continue;

    const plNow = plPrice(a, b, t0);
    const residual = Math.log(p.price) - Math.log(plNow);
    const sig = (residual - resMean) / resStd;

    // Future returns
    const futurePrice12 = prices[i + horizon]?.price;
    if (!futurePrice12) continue;
    const realReturn = (futurePrice12 - p.price) / p.price * 100;
    const isGoodBuy = realReturn > 0;

    const futurePrice6 = prices[i + horizonSell]?.price;
    const ret6m = futurePrice6 ? (futurePrice6 - p.price) / p.price * 100 : null;

    // Signal
    const level = levelOf(sig);
    const internalLevel = internalLevelOf(sig);

    // Risk metrics for this entry
    const dd = maxDrawdown(prices, i, horizon);
    const underwater = timeUnderwater(prices, i, horizon);

    // Z-score benchmark
    const zLevel = zScoreSignal(prices, i);

    results.push({
      date: p.date, sig: +sig.toFixed(3), price: +p.price.toFixed(0),
      realReturn: +realReturn.toFixed(1), ret6m: ret6m != null ? +ret6m.toFixed(1) : null,
      isGoodBuy, level, internalLevel,
      maxDD: dd, underwaterDays: underwater,
      zLevel,
    });
  }

  if (results.length === 0) return emptyResult();

  // ── Helpers ──
  const avg = arr => arr.length > 0 ? +(arr.reduce((s, r) => s + r.realReturn, 0) / arr.length).toFixed(1) : null;
  const avg6 = arr => { const f = arr.filter(r => r.ret6m != null); return f.length > 0 ? +(f.reduce((s, r) => s + r.ret6m, 0) / f.length).toFixed(1) : null; };
  const prec = arr => arr.length > 0 ? +(arr.filter(r => r.isGoodBuy).length / arr.length * 100).toFixed(1) : null;
  const minR = arr => arr.length > 0 ? +Math.min(...arr.map(r => r.realReturn)).toFixed(1) : null;
  const maxR = arr => arr.length > 0 ? +Math.max(...arr.map(r => r.realReturn)).toFixed(1) : null;
  const avgDD = arr => arr.length > 0 ? +(arr.reduce((s, r) => s + r.maxDD, 0) / arr.length).toFixed(1) : null;
  const maxDDOf = arr => arr.length > 0 ? +Math.max(...arr.map(r => r.maxDD)).toFixed(1) : null;
  const avgUW = arr => arr.length > 0 ? Math.round(arr.reduce((s, r) => s + r.underwaterDays, 0) / arr.length) : null;

  // ── Sharpe ratio (annualized) ──
  function sharpe(arr) {
    if (arr.length < 5) return null;
    const rets = arr.map(r => r.realReturn / 100);
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const std = Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length);
    if (std < 1e-6) return null;
    return +((mean / std) * Math.sqrt(1)).toFixed(2); // already 12m returns, no annualization needed
  }

  // ── By level ──
  const strongBuyR = results.filter(r => r.level === "strongBuy");
  const buyR = results.filter(r => r.level === "buy");
  const yesR = results.filter(r => r.level === "strongBuy" || r.level === "buy");
  const noR = results.filter(r => r.level === "no");
  const reduceR = results.filter(r => r.level === "reduce");
  const sellR = results.filter(r => r.level === "sell");

  // Internal sub-zones
  const accumR = results.filter(r => r.internalLevel === "accumulate");
  const neutralR = results.filter(r => r.internalLevel === "neutral");
  const cautionR = results.filter(r => r.internalLevel === "caution");

  const levelStats = (arr) => ({
    n: arr.length,
    precision: prec(arr),
    avgReturn: avg(arr),
    minReturn: minR(arr),
    maxReturn: maxR(arr),
    avgMaxDD: avgDD(arr),
    worstMaxDD: maxDDOf(arr),
    avgUnderwaterDays: avgUW(arr),
    sharpe: sharpe(arr),
  });

  const byLevel = {
    strongBuy: levelStats(strongBuyR),
    buy: levelStats(buyR),
    no: levelStats(noR),
    accumulate: levelStats(accumR),
    neutral: levelStats(neutralR),
    caution: levelStats(cautionR),
  };

  // ── Episodes (independent) ──
  const nEpisodesBuy = countEpisodes(results, r => r.level === "strongBuy" || r.level === "buy");
  const nEpisodesStrongBuy = countEpisodes(results, r => r.level === "strongBuy");
  const nEpisodesSell = countEpisodes(results, r => r.level === "sell");

  // ── Sell metrics (6m) ──
  const sellWith6 = sellR.filter(r => r.ret6m != null);
  const reduceWith6 = reduceR.filter(r => r.ret6m != null);
  const plBubbleMetrics = {
    sell: {
      n: sellWith6.length,
      avgRet6m: avg6(sellR),
      pctAnyLoss: sellWith6.length > 0 ? +(sellWith6.filter(r => r.ret6m < 0).length / sellWith6.length * 100).toFixed(1) : null,
      pct20: sellWith6.length > 0 ? +(sellWith6.filter(r => r.ret6m < -20).length / sellWith6.length * 100).toFixed(1) : null,
      maxDrawdown: sellWith6.length > 0 ? +Math.min(...sellWith6.map(r => r.ret6m)).toFixed(1) : null,
    },
    reduce: {
      n: reduceWith6.length,
      avgRet6m: avg6(reduceR),
      pctAnyLoss: reduceWith6.length > 0 ? +(reduceWith6.filter(r => r.ret6m < 0).length / reduceWith6.length * 100).toFixed(1) : null,
      pct20: reduceWith6.length > 0 ? +(reduceWith6.filter(r => r.ret6m < -20).length / reduceWith6.length * 100).toFixed(1) : null,
      maxDrawdown: reduceWith6.length > 0 ? +Math.min(...reduceWith6.map(r => r.ret6m)).toFixed(1) : null,
    },
  };

  // ── Base rate ──
  const baseRate = +(results.filter(r => r.isGoodBuy).length / results.length * 100).toFixed(1);
  const unconditionalMean = avg(results);

  // ── Cross-validation by era ──
  const crossValidation = [
    { label: "2014–2017", s: "2014-01-01", e: "2017-12-31" },
    { label: "2018–2021", s: "2018-01-01", e: "2021-12-31" },
    { label: "2022–present", s: "2022-01-01", e: "2099-12-31" },
  ].map(era => {
    const pts = results.filter(r => r.date >= era.s && r.date <= era.e);
    const buy = pts.filter(r => r.level === "strongBuy" || r.level === "buy");
    return { label: era.label, n: pts.length, nYes: buy.length, precision: prec(buy), avgReturn: avg(buy), nEpisodes: countEpisodes(pts, r => r.level === "strongBuy" || r.level === "buy") };
  }).filter(cv => cv.n > 0);

  const precisions = crossValidation.map(cv => parseFloat(cv.precision || 0)).filter(p => p > 0);
  const stabilityDelta = precisions.length >= 2 ? +(Math.max(...precisions) - Math.min(...precisions)).toFixed(1) : null;

  // ── Sigma buckets (6m) ──
  const with6m = results.filter(r => r.ret6m != null);
  const sigmaBuckets = [
    { label: "σ < 0", min: -Infinity, max: 0 },
    { label: "0 – 0.5", min: 0, max: 0.5 },
    { label: "0.5 – 1.0", min: 0.5, max: 1.0 },
    { label: "1.0 – 1.5", min: 1.0, max: 1.5 },
    { label: "1.5 – 2.0", min: 1.5, max: 2.0 },
    { label: "2.0+", min: 2.0, max: Infinity },
  ].map(bucket => {
    const pts = with6m.filter(r => r.sig >= bucket.min && r.sig < bucket.max);
    const nFell = pts.filter(r => r.ret6m < -20).length;
    return { label: bucket.label, min: bucket.min, n: pts.length, nFell,
      pct20: pts.length > 0 ? +(nFell / pts.length * 100).toFixed(1) : 0,
      avgRet: pts.length > 0 ? +(pts.reduce((s, r) => s + r.ret6m, 0) / pts.length).toFixed(1) : 0 };
  });

  // ── Calibration buckets (MC predicted vs actual) ──
  // Note: no MC per point in daily backtest, so pLossAvg comes from overall MC at this sigma range
  const calibrationBuckets = [
    { label: "Deep value (σ < -1)", min: -99, max: -1.0 },
    { label: "Discount (σ -1 to -0.5)", min: -1.0, max: -0.5 },
    { label: "Neutral (σ ±0.5)", min: -0.5, max: 0.5 },
    { label: "Elevated (σ 0.5 to 1)", min: 0.5, max: 1.0 },
    { label: "Overheated (σ > 1)", min: 1.0, max: 99 },
  ].map(bucket => {
    const pts = results.filter(r => r.sig > bucket.min && r.sig <= bucket.max);
    if (pts.length === 0) return { ...bucket, n: 0, lossRate: null, avgReturn: null, pLossAvg: null };
    const n = pts.length;
    const lossRate = +(pts.filter(r => !r.isGoodBuy).length / n * 100).toFixed(1);
    const ar = avg(pts);
    return { ...bucket, n, lossRate, avgReturn: ar, pLossAvg: null };
  });

  // ═══ BENCHMARKS ═══

  // 1. Buy & hold: every day is a buy
  const bhPrecision = baseRate;
  const bhAvgReturn = unconditionalMean;
  const bhSharpe = sharpe(results);
  const bhAvgDD = avgDD(results);
  const bhWorstDD = maxDDOf(results);

  // 2. Z-score simple (200-day MA)
  const zBuyR = results.filter(r => r.zLevel === "strongBuy" || r.zLevel === "buy");
  const zSellR = results.filter(r => r.zLevel === "sell");
  const zBenchmark = {
    buyN: zBuyR.length,
    buyPrecision: prec(zBuyR),
    buyAvgReturn: avg(zBuyR),
    buyMinReturn: minR(zBuyR),
    buySharpe: sharpe(zBuyR),
    buyAvgDD: avgDD(zBuyR),
    sellN: zSellR.length,
    sellAvgRet6m: avg6(zSellR),
    nEpisodes: countEpisodes(results, r => r.zLevel === "strongBuy" || r.zLevel === "buy"),
  };

  // 3. DCA benchmark: invest fixed amount every 30 days vs signal-only
  const dcaInterval = 30;
  let dcaTotal = 0, dcaBtc = 0, sigTotal = 0, sigBtc = 0;
  const dcaAmount = 100; // $100 per period
  for (let i = minTrainDays; i < prices.length; i += dcaInterval) {
    const p = prices[i];
    if (!p || p.price <= 0) continue;
    // DCA: always buy
    dcaTotal += dcaAmount;
    dcaBtc += dcaAmount / p.price;
    // Signal DCA: only buy when signal says buy
    const t0 = daysSinceGenesis(p.date);
    const plNow = plPrice(a, b, t0);
    const sig = (Math.log(p.price) - Math.log(plNow) - resMean) / resStd;
    if (sig < SIG.buy) {
      sigTotal += dcaAmount;
      sigBtc += dcaAmount / p.price;
    }
  }
  const lastPrice = prices[prices.length - 1].price;
  const dcaReturn = dcaTotal > 0 ? +((dcaBtc * lastPrice - dcaTotal) / dcaTotal * 100).toFixed(1) : 0;
  const sigDcaReturn = sigTotal > 0 ? +((sigBtc * lastPrice - sigTotal) / sigTotal * 100).toFixed(1) : 0;
  const dcaBenchmark = {
    dcaReturn, sigDcaReturn,
    dcaInvested: Math.round(dcaTotal),
    dcaValue: Math.round(dcaBtc * lastPrice),
    sigInvested: Math.round(sigTotal),
    sigValue: Math.round(sigBtc * lastPrice),
    dcaPeriods: Math.floor((prices.length - minTrainDays) / dcaInterval),
    sigPeriods: Math.round(sigTotal / dcaAmount),
  };

  // ═══ RISK METRICS ═══
  const riskMetrics = {
    signal: {
      sharpe: sharpe(yesR),
      avgMaxDD: avgDD(yesR),
      worstMaxDD: maxDDOf(yesR),
      avgUnderwaterDays: avgUW(yesR),
      worstUnderwaterDays: yesR.length > 0 ? Math.max(...yesR.map(r => r.underwaterDays)) : null,
    },
    buyAndHold: {
      sharpe: bhSharpe,
      avgMaxDD: bhAvgDD,
      worstMaxDD: bhWorstDD,
      avgUnderwaterDays: avgUW(results),
      worstUnderwaterDays: results.length > 0 ? Math.max(...results.map(r => r.underwaterDays)) : null,
    },
  };

  // ═══ RETURN ═══
  return {
    // Backward compat
    thresholds: { sig: SIG.buy, pLoss1y: 20, pFV: 40 },
    weights: { w1: 2, w2: 0.5, w3: 0, w4: 0 },
    scoringParams: { sigMean: 0, lossMean: 0, fvMean: 0, floorMean: 0, strongThresh: 1.0 },
    sellThresholds: { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 },

    // Core
    precision: prec(yesR),
    nYes: yesR.length,
    nNo: noR.length,
    nSell: sellR.length,
    nReduce: reduceR.length,
    nTotal: results.length,
    avgReturnYes: avg(yesR),
    avgReturnHold: avg(noR),
    avgReturnSell: avg6(sellR),
    baseRate,
    unconditionalMean,

    // By level (with risk)
    byLevel,

    // Episodes
    nEpisodesBuy,
    nEpisodesStrongBuy,
    nEpisodesSell,

    // Sell
    plBubbleMetrics,
    calibratedBubbleSig: SIG.sell,
    calibratedReduceSig: SIG.reduce,

    // Cross-validation
    crossValidation,
    stabilityDelta,

    // Sigma buckets
    sigmaBuckets,

    // Calibration
    calibrationBuckets,

    // Benchmarks
    benchmarks: {
      buyAndHold: { precision: bhPrecision, avgReturn: bhAvgReturn, sharpe: bhSharpe, avgMaxDD: bhAvgDD, worstMaxDD: bhWorstDD },
      zScore: zBenchmark,
      dca: dcaBenchmark,
    },

    // Risk
    riskMetrics,

    // Step info
    step: 1,
    sampling: "daily",
  };
}

function emptyResult() {
  return { precision: null, nYes: 0, nNo: 0, nTotal: 0, results: [], byLevel: {}, benchmarks: {}, riskMetrics: {},
    thresholds: { sig: -0.5, pLoss1y: 20, pFV: 40 }, weights: { w1: 2, w2: 0.5, w3: 0, w4: 0 },
    scoringParams: null, sellThresholds: {}, step: 1, sampling: "daily" };
}
