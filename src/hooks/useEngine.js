// ── useEngine — orchestrates the full MMAR pipeline ──
import { useState, useCallback, useEffect } from "react";
import { fetchBTC, fetchSpotPrice } from "../data/fetch.js";
import {
  daysSinceGenesis, fitPowerLaw, plPrice, computeEVTcap,
  hurstDFA, partitionFunction, fitLambda2,
  estimateRegimeSwitchingOU, adfTest,
  simulatePathsPL, computePercentiles,
  runWalkForwardBacktest,
  computeMCLossHorizons, computeEpisodeAnalysis, detectRegime, generateVerdict,
  fmtK, getVerdictPlain, getVolLabel,
} from "../engine/index.js";

// Yield to UI between heavy steps
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

export default function useEngine() {
  const [phase, setPhase] = useState("loading"); // loading | done | error
  const [msg, setMsg] = useState("Connecting to market data...");
  const [d, setD] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const run = useCallback(async () => {
    setPhase("loading");
    try {
      // ── 1. Fetch prices ──
      setMsg("Connecting to market data...");
      const { data: prices, source, spot: liveSpot } = await fetchBTC(setMsg);

      // ── 2. Power Law ──
      setMsg("Fitting Power Law model...");
      await tick();
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
      setMsg("Analyzing price dynamics...");
      await tick();
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
      setMsg("Estimating fractal structure...");
      await tick();
      const { H } = hurstDFA(resReturns);
      const tauData = partitionFunction(resReturns);
      const lambda2 = fitLambda2(tauData);

      // ── 7. Rolling Hurst multi-scale ──
      setMsg("Computing multi-scale Hurst + volatility...");
      await tick();
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
          setMsg(`Computing Hurst + vol... ${rollingHurst.length} points`);
          await tick(5);
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
      setMsg("Running 2,000 Monte Carlo simulations...");
      await tick(30);
      let paths3y = [];
      let floorBreakAccum1y = 0;
      for (let batch = 0; batch < 20; batch++) {
        const chunk = simulatePathsPL(100, N3Y, H, lambda2, resStd, resMean, a, b, t0, ouRegimes, currentResidual, resReturns, resFloor, evtCap, floorBreakProb);
        floorBreakAccum1y += (chunk.floorBreakPct || 0) * chunk.length / 100;
        paths3y = paths3y.concat(chunk);
        setMsg(`Running Monte Carlo... ${(batch + 1) * 100}/2000`);
        await tick(10);
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
      setMsg("Running walk-forward backtest...");
      await tick();
      const backtestResults = runWalkForwardBacktest(prices, a, b, resMean, resStd, resFloor, evtCap, floorBreakProb, ouRegimes);

      // ── 12. Set state ──
      setD({
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
      });
      setPhase("done");
    } catch (e) {
      console.error("Engine error:", e);
      setMsg(e?.message || "Unexpected error");
      setPhase("error");
    }
  }, []);

  useEffect(() => { run(); }, []);

  // ── Spot refresh every 60s ──
  useEffect(() => {
    if (phase !== "done" || !d) return;
    const refreshSpot = async () => {
      try {
        const { spot } = await fetchSpotPrice();
        if (!spot) return;
        const { a, b, resMean, resStd, resFloor, H, lambda2, ouRegimes, t0, resReturns, evtCap, floorBreakProb, sigmaChart: prevSigmaChart } = d;
        const tNow = daysSinceGenesis(new Date().toISOString().slice(0, 10));
        const plNow = plPrice(a, b, tNow);
        const newResidual = Math.log(spot) - Math.log(plNow);
        const newSigma = (newResidual - resMean) / resStd;

        const todayStr = new Date().toISOString().slice(0, 7);
        const todayFull = new Date().toISOString().slice(0, 10);
        const updatedSigmaChart = prevSigmaChart ? [
          ...prevSigmaChart.filter(p => p.date !== todayStr),
          { date: todayStr, fullDate: todayFull, sigma: +newSigma.toFixed(3), price: +spot.toFixed(0), fair: +plNow.toFixed(0) },
        ] : prevSigmaChart;

        // Reduced MC on refresh (200 paths, not 2000)
        const N3Y = 365 * 3;
        const pathsUnified = simulatePathsPL(200, N3Y, H, lambda2, resStd, resMean, a, b, tNow, ouRegimes, newResidual, resReturns, resFloor, evtCap, floorBreakProb);
        const pct = computePercentiles(pathsUnified, 365);
        const pct3y = computePercentiles(pathsUnified, N3Y);

        setD(prev => ({
          ...prev,
          S0: spot, t0: tNow, plToday: plNow, sigmaFromPL: newSigma,
          currentResidual: newResidual,
          percentiles: pct, percentiles3y: pct3y,
          pl1y: +plPrice(a, b, tNow + 365).toFixed(0),
          pl2y: +plPrice(a, b, tNow + 730).toFixed(0),
          pl3y: +plPrice(a, b, tNow + 365 * 3).toFixed(0),
          sigmaChart: updatedSigmaChart,
        }));
        setLastRefresh(new Date());
      } catch (e) { console.warn("Refresh:", e); }
    };
    const timer = setInterval(refreshSpot, 60000);
    return () => clearInterval(timer);
  }, [phase, d?.a]);

  // ── Derived data (computed from state, not stored) ──
  const derived = d ? (() => {
    const { S0, a, b, t0, resMean, resStd, resFloor, ransac, plToday, sigmaFromPL: sig,
      H, lambda2, annualVol, mom, halfLife, ouRegimes,
      percentiles, percentiles3y, rollingHurst, sigmaChart,
      pFloorBreak1y, calibratedThresholds, scoringParams, calibratedWeights,
      backtestResults,
    } = d;

    const deviationPct = ((S0 - plToday) / plToday * 100);
    const last = percentiles[percentiles.length - 1];
    const mcP5 = last?.p5 || S0 * 0.5;
    const mcP95 = last?.p95 || S0 * 2;
    const upside = (mcP95 - S0) / S0;
    const downside = Math.max(0, (S0 - mcP5) / S0);
    const udRatio = downside > 0 ? upside / downside : 99;

    // PL bands at 1Y
    const pl1yFuture = plPrice(a, b, t0 + 365);
    const pl1yBands = {
      p2up: Math.exp(Math.log(pl1yFuture) + resMean + 2 * resStd),
      p1up: Math.exp(Math.log(pl1yFuture) + resMean + resStd),
      fair: pl1yFuture,
      pSup: Math.exp(Math.log(pl1yFuture) + resFloor),
    };

    // MC loss horizons
    const mcLossHorizons = computeMCLossHorizons(percentiles, percentiles3y, S0);

    // Episode analysis
    const episode = computeEpisodeAnalysis(sig, sigmaChart);

    // Regime detection
    const { domRegime } = detectRegime(sig, mom, H, lambda2, annualVol, halfLife);

    // Support price
    const supportPrice = ransac
      ? Math.exp(ransac.a + ransac.b * Math.log(t0) + ransac.floor)
      : Math.exp(Math.log(plToday) + resFloor);

    // Verdict
    const verdict = generateVerdict({
      sig, S0, a, b, t0, resMean, resStd, resFloor, ransac, plToday,
      mcLossHorizons, percentiles, percentiles3y,
      pFloorBreak1y, calibratedThresholds, scoringParams, calibratedWeights,
      ouRegimes, rollingHurst, backtestResults,
      episodeCallout: episode.episodeCallout,
      conditionalRemaining: episode.conditionalRemaining,
      sigImproving: episode.sigImproving,
      sigWorsening: episode.sigWorsening,
      domRegime, deviationPct,
    });

    return {
      sig, deviationPct, udRatio, pl1yBands, pl1yFuture,
      mcLossHorizons, episode, domRegime, supportPrice,
      verdict, mcP5, mcP95,
      volInfo: getVolLabel(annualVol),
      verdictPlain: getVerdictPlain(sig),
    };
  })() : null;

  return { phase, msg, d, derived, lastRefresh, retry: run };
}
