// ── Engine Web Worker — runs heavy computation off the main thread ──
// Receives "run" message, posts progress + final results back.

import { daysSinceGenesis } from "../engine/constants.js";
import { fitPowerLaw, plPrice } from "../engine/powerlaw.js";
import { computeEVTcap, adfTest } from "../engine/stats.js";
import { hurstDFA, partitionFunction, fitLambda2 } from "../engine/fractal.js";
import { estimateRegimeSwitchingOU } from "../engine/regime.js";
import { simulatePathsPL, computePercentiles } from "../engine/montecarlo.js";
import { runWalkForwardBacktest } from "../engine/backtest.js";
import { fetchBTC } from "../data/fetch.js";

function post(type, payload) {
  self.postMessage({ type, ...payload });
}

function progress(msg) {
  post("progress", { msg });
}

self.onmessage = async (e) => {
  if (e.data.type !== "run") return;

  try {
    // ── 1. Fetch prices ──
    progress("Connecting to market data...");
    const { data: prices, source, spot: liveSpot } = await fetchBTC(progress);

    // ── 2. Power Law ──
    progress("Fitting Power Law model...");
    const pl = fitPowerLaw(prices);
    const { a, b, residuals, resMean, resStd, resFloor, resFloorSigma, r2, ransac, ransacResiduals, supportPriceFn } = pl;
    const evtCap = computeEVTcap(ransacResiduals);

    // ── 3. Floor break probability ──
    const liquidStart = daysSinceGenesis("2013-04-01");
    const ptsLiquid = pl.pts.filter(p => p.t > liquidStart);
    const ransacResidualsByDay = ptsLiquid.map(p => ({
      t: p.t,
      r: Math.log(p.price) - (ransac.a + ransac.b * Math.log(p.t))
    }));
    const blockSize = 365;
    let blocksTotal = 0, blocksWithBreak = 0;
    for (let i = 0; i <= ransacResidualsByDay.length - blockSize; i += 30) {
      const block = ransacResidualsByDay.slice(i, i + blockSize);
      blocksTotal++;
      if (block.some(dd => dd.r < ransac.floor)) blocksWithBreak++;
    }
    const empiricalFloorProb = ptsLiquid.length > 0
      ? ptsLiquid.filter(p => Math.log(p.price) - (ransac.a + ransac.b * Math.log(p.t)) < ransac.floor).length / ptsLiquid.length
      : 0.01;
    const floorBreakProb = blocksTotal >= 5
      ? Math.min(blocksWithBreak / blocksTotal, 0.20)
      : Math.min(1 - Math.pow(1 - empiricalFloorProb, 365), 0.15);

    // ── 4. Current position ──
    const lastPrice = prices[prices.length - 1];
    const S0 = lastPrice.price;
    const t0 = daysSinceGenesis(lastPrice.date);
    const plToday = plPrice(a, b, t0);
    const currentResidual = Math.log(S0) - Math.log(plToday);
    const sigmaFromPL = (currentResidual - resMean) / resStd;

    // ── 5. Daily dynamics ──
    progress("Analyzing price dynamics...");
    const calYearsBack = 4;
    const calCutoff = new Date(lastPrice.date);
    calCutoff.setFullYear(calCutoff.getFullYear() - calYearsBack);
    const calCutoffStr = calCutoff.toISOString().slice(0, 10);
    const dailyStart = prices.findIndex(p => p.date >= calCutoffStr);
    const dailyPrices = prices.slice(dailyStart);
    const dailyResiduals = dailyPrices.map(p => {
      const t = daysSinceGenesis(p.date);
      return Math.log(p.price) - Math.log(plPrice(a, b, t));
    });
    const resReturns = [];
    for (let i = 1; i < dailyResiduals.length; i++) resReturns.push(dailyResiduals[i] - dailyResiduals[i - 1]);
    const n = resReturns.length;
    const mean = resReturns.reduce((s, x) => s + x, 0) / n;
    const variance = resReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const annualVol = std * Math.sqrt(252);

    // ── 6. Fractal structure ──
    progress("Estimating fractal structure...");
    const { H } = hurstDFA(resReturns);
    const tauData = partitionFunction(resReturns);
    const lambda2 = fitLambda2(tauData);

    // ── 7. Rolling Hurst multi-scale ──
    progress("Computing multi-scale Hurst + volatility...");
    const hurstScales = [30, 90, 180, 365];
    const rollingHurst = [];
    const maxWindow = 365;
    for (let i = maxWindow; i < resReturns.length; i += 5) {
      const dateIdx = dailyStart + i + 1;
      if (dateIdx >= prices.length) continue;
      const p = prices[dateIdx];
      const t = daysSinceGenesis(p.date);
      const plV = plPrice(a, b, t);
      const res = Math.log(p.price) - Math.log(plV);
      const sig = (res - resMean) / resStd;
      const point = { date: p.date.slice(0, 7), sigma: +sig.toFixed(2), price: +p.price.toFixed(0) };
      for (const w of hurstScales) {
        if (i >= w) {
          const { H: hVal } = hurstDFA(resReturns.slice(i - w, i));
          point[`h${w}`] = +hVal.toFixed(3);
        }
      }
      point.H = point.h90 || point.h30 || 0.5;
      const volStd = arr => { const m = arr.reduce((s, x) => s + x, 0) / arr.length; return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length); };
      const vol30slice = resReturns.slice(Math.max(0, i - 30), i);
      const vol90slice = resReturns.slice(Math.max(0, i - 90), i);
      point.vol30 = +(volStd(vol30slice) * Math.sqrt(252) * 100).toFixed(1);
      point.vol90 = +(volStd(vol90slice) * Math.sqrt(252) * 100).toFixed(1);
      point.volRatio = point.vol90 > 0 ? +(point.vol30 / point.vol90).toFixed(3) : 1;
      rollingHurst.push(point);
      if (rollingHurst.length % 50 === 0) {
        progress(`Computing Hurst + vol... ${rollingHurst.length} points`);
      }
    }
    if (rollingHurst.length > 0) {
      const last = rollingHurst[rollingHurst.length - 1];
      last.H = +H.toFixed(3);
      last.h90 = +H.toFixed(3);
      last.sigma = +sigmaFromPL.toFixed(2);
    }

    // ── 8. Regime switching OU ──
    const ouRegimes = estimateRegimeSwitchingOU(dailyResiduals, resReturns);
    const kappa = ouRegimes.globalKappa;
    const halfLife = ouRegimes.halfLife;
    const adfResult = adfTest(dailyResiduals);

    // ── 9. Monte Carlo (2000 paths, unified 3Y) ──
    const N3Y = 365 * 3;
    progress("Running 2,000 Monte Carlo simulations...");
    let paths3y = [];
    let floorBreakAccum1y = 0;
    for (let batch = 0; batch < 20; batch++) {
      const chunk = simulatePathsPL(100, N3Y, H, lambda2, resStd, resMean, a, b, t0, ouRegimes, currentResidual, resReturns, resFloor, evtCap, floorBreakProb);
      floorBreakAccum1y += (chunk.floorBreakPct || 0) * chunk.length / 100;
      paths3y = paths3y.concat(chunk);
      progress(`Running Monte Carlo... ${(batch + 1) * 100}/2000`);
    }
    const pFloorBreak1y = +(floorBreakAccum1y / paths3y.length * 100).toFixed(2);
    const percentiles = computePercentiles(paths3y, 365);
    const percentiles3y = computePercentiles(paths3y, N3Y);

    // ── 10. Charts data ──
    const sigmaChart = prices.map((p, i) => {
      if (i % 5 !== 0 && i !== prices.length - 1) return null;
      const t = daysSinceGenesis(p.date);
      const plV = plPrice(a, b, t);
      const res = Math.log(p.price) - Math.log(plV);
      return { date: p.date.slice(0, 7), fullDate: p.date, sigma: +((res - resMean) / resStd).toFixed(3), price: +p.price.toFixed(0), fair: +plV.toFixed(0) };
    }).filter(Boolean);

    // Autocorrelation for momentum
    const rrMean = resReturns.reduce((s, x) => s + x, 0) / (resReturns.length || 1);
    const rrVar = resReturns.reduce((s, x) => s + (x - rrMean) ** 2, 0) / (resReturns.length || 1);
    const acLags = [1, 2, 3, 5].map(lag => {
      const nn = resReturns.length - lag;
      if (nn < 10) return 0;
      let cov = 0;
      for (let i = 0; i < nn; i++) cov += (resReturns[i] - rrMean) * (resReturns[i + lag] - rrMean);
      return cov / nn / (rrVar || 1);
    });
    const mom = acLags.reduce((s, x) => s + x, 0) / acLags.length;

    // ── 11. Walk-forward backtest ──
    progress("Running walk-forward backtest...");
    const backtestResults = runWalkForwardBacktest(prices, a, b, resMean, resStd, resFloor, evtCap, floorBreakProb, ouRegimes);

    // ── 12. Send results ──
    // Note: Float64Arrays are not cloneable by postMessage, so we only send
    // the data the UI actually needs (no raw paths).
    post("done", {
      result: {
        H, lambda2, std, mean, annualVol, S0, t0, n, source, mom,
        lastDate: lastPrice.date, a, b, r2, resMean, resStd, resFloor, resFloorSigma, ransac,
        plToday, sigmaFromPL, kappa, halfLife, ouRegimes, resReturns, dailyResiduals, currentResidual,
        tauData, sigmaChart, rollingHurst,
        percentiles, percentiles3y,
        pFloorBreak1y, evtCap, floorBreakProb, empiricalFloorProb,
        adfResult, backtestResults,
        calibratedThresholds: backtestResults?.thresholds || { sig: -0.5, pLoss1y: 20, pFV: 40 },
        scoringParams: backtestResults?.scoringParams || null,
        calibratedWeights: backtestResults?.weights || null,
        sellThresholds: backtestResults?.sellThresholds || { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 },
        pl1y: +plPrice(a, b, t0 + 365).toFixed(0),
        pl2y: +plPrice(a, b, t0 + 730).toFixed(0),
        pl3y: +plPrice(a, b, t0 + 365 * 3).toFixed(0),
      }
    });

  } catch (err) {
    post("error", { msg: err?.message || "Worker error" });
  }
};
