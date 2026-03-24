// ── Robust Backtest Lite — local PL refit, no MC, fast ──
// Purpose: validate that sigma thresholds work without look-ahead bias.
// Refits WLS at each test point using ONLY data up to that point.
// No MC, no grid search — just PL + sigma + future return.
// Runs in ~500ms vs 3-4s of the full version.
import { daysSinceGenesis } from "./constants.js";

const SIG = { strongBuy: -1.0, buy: -0.5, reduce: 0.5, sell: 0.8, maturityB: 4.0 };

function levelOf(sig, b) {
  if (sig < SIG.strongBuy) return "strongBuy";
  if (sig < SIG.buy) return "buy";
  const isMature = b > SIG.maturityB;
  if (isMature && sig >= SIG.sell) return "sell";
  if (isMature && sig >= SIG.reduce) return "reduce";
  return "no";
}

function fitWLS(pts) {
  const logT = pts.map(p => Math.log(p.t));
  const logP = pts.map(p => Math.log(p.price));
  const n = pts.length;
  const tMax = logT[n - 1];
  const halfLife = Math.log(daysSinceGenesis("2020-01-01")) - Math.log(daysSinceGenesis("2016-01-01"));
  const decay = Math.LN2 / halfLife;
  const rawW = logT.map(lt => Math.exp(-decay * (tMax - lt)));
  const wSum = rawW.reduce((s, w) => s + w, 0);
  const w = rawW.map(wi => wi / wSum);
  const mT = logT.reduce((s, x, i) => s + w[i] * x, 0);
  const mP = logP.reduce((s, y, i) => s + w[i] * y, 0);
  const b = logT.reduce((s, x, i) => s + w[i] * (x - mT) * (logP[i] - mP), 0) /
    logT.reduce((s, x, i) => s + w[i] * (x - mT) ** 2, 0);
  const a = mP - b * mT;
  const residuals = pts.map(p => Math.log(p.price) - (a + b * Math.log(p.t)));
  const resMean = residuals.reduce((s, r) => s + r, 0) / n;
  const resStd = Math.sqrt(residuals.reduce((s, r) => s + (r - resMean) ** 2, 0) / n);
  return { a, b, resMean, resStd };
}

export function runRobustBacktestLite(prices) {
  const allPts = prices.map(p => ({ t: daysSinceGenesis(p.date), price: p.price })).filter(p => p.t > 0 && p.price > 0);
  const minData = 365 * 4;
  const horizon = 365;
  // Sample every 7 days for speed (still ~500+ points)
  const step = 7;

  let nBuy = 0, nBuyCorrect = 0, nSell = 0, nSellCorrect = 0, nTotal = 0;
  let nEpisodes = 0, inBuyEpisode = false;
  let worstBuy = Infinity;
  const bHistory = [];

  for (let i = minData; i < prices.length - horizon; i += step) {
    const p = prices[i];
    const t0 = daysSinceGenesis(p.date);
    if (t0 <= 0 || p.price <= 0) continue;

    const ptsSlice = allPts.slice(0, i + 1);
    const fit = fitWLS(ptsSlice);
    const plNow = Math.exp(fit.a + fit.b * Math.log(t0));
    const sig = (Math.log(p.price) - Math.log(plNow) - fit.resMean) / fit.resStd;

    const futurePrice = prices[i + horizon]?.price;
    if (!futurePrice) continue;
    const ret12m = (futurePrice - p.price) / p.price * 100;

    const level = levelOf(sig, fit.b);
    nTotal++;

    if (level === "strongBuy" || level === "buy") {
      nBuy++;
      if (ret12m > 0) nBuyCorrect++;
      if (ret12m < worstBuy) worstBuy = ret12m;
      if (!inBuyEpisode) { nEpisodes++; inBuyEpisode = true; }
    } else {
      inBuyEpisode = false;
    }

    if (level === "sell") {
      nSell++;
      const fut6m = prices[i + 182]?.price;
      if (fut6m && fut6m < p.price) nSellCorrect++;
    }

    if (i % (step * 20) === 0) bHistory.push({ date: p.date, b: +fit.b.toFixed(3) });
  }

  return {
    type: "robust-lite",
    nTotal,
    nBuy,
    nBuyCorrect,
    buyPrecision: nBuy > 0 ? +(nBuyCorrect / nBuy * 100).toFixed(1) : null,
    worstBuyReturn: worstBuy < Infinity ? +worstBuy.toFixed(1) : null,
    nEpisodes,
    nSell,
    nSellCorrect,
    sellPrecision: nSell > 0 ? +(nSellCorrect / nSell * 100).toFixed(1) : null,
    bHistory,
    step,
    note: `Validated with local PL refit at each point (step=${step}d). No look-ahead. Maturity gate b > ${SIG.maturityB}.`,
  };
}
