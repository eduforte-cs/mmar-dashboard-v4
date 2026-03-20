// ── useEngine — cache-first, Web Worker fallback ──
// 1. Try Supabase cache (instant, <1s)
// 2. Fetch live spot from Binance
// 3. If cache hit: use cached params + fresh spot → instant display
// 4. If cache miss: fall back to Web Worker (full computation, ~30s)
// 5. Spot refresh every 60s (main thread, 200 paths MC)

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchSpotPrice } from "../data/fetch.js";
import { fetchCache } from "./useCache.js";
import {
  daysSinceGenesis, plPrice,
  simulatePathsPL, computePercentiles,
  computeMCLossHorizons, computeEpisodeAnalysis, detectRegime, generateVerdict,
  getVerdictPlain, getVolLabel, supportFloor,
} from "../engine/index.js";

export default function useEngine() {
  const [phase, setPhase] = useState("loading");
  const [msg, setMsg] = useState("Loading...");
  const [d, setD] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const workerRef = useRef(null);

  // ── Try cache, then fallback to worker ──
  const run = useCallback(async () => {
    setPhase("loading");

    // ── Step 1: Try Supabase cache ──
    setMsg("Checking cache...");
    try {
      const cached = await fetchCache();
      if (cached) {
        setMsg("Cache found. Fetching live price...");

        // Fetch live spot to update the cached σ
        const { spot } = await fetchSpotPrice();
        if (spot && spot > 1000) {
          const { a, b, resMean, resStd, resFloor, H, lambda2, ouRegimes,
            resReturns, evtCap, floorBreakProb, sigmaChart: prevSigmaChart } = cached;
          const tNow = daysSinceGenesis(new Date().toISOString().slice(0, 10));
          const plNow = plPrice(a, b, tNow);
          const newResidual = Math.log(spot) - Math.log(plNow);
          const newSigma = (newResidual - resMean) / resStd;

          // Update sigma chart with today's point
          const todayStr = new Date().toISOString().slice(0, 7);
          const todayFull = new Date().toISOString().slice(0, 10);
          const updatedSigmaChart = prevSigmaChart ? [
            ...prevSigmaChart.filter(p => p.date !== todayStr),
            { date: todayStr, fullDate: todayFull, sigma: +newSigma.toFixed(3), price: +spot.toFixed(0), fair: +plNow.toFixed(0) },
          ] : prevSigmaChart;

          // Quick MC with live spot (200 paths, fast)
          const N3Y = 365 * 3;
          const pathsUnified = simulatePathsPL(200, N3Y, H, lambda2, resStd, resMean, a, b, tNow, ouRegimes, newResidual, resReturns, resFloor, evtCap, floorBreakProb);
          const pct = computePercentiles(pathsUnified, 365);
          const pct3y = computePercentiles(pathsUnified, N3Y);

          setD({
            ...cached,
            S0: spot, t0: tNow, plToday: plNow, sigmaFromPL: newSigma,
            currentResidual: newResidual,
            percentiles: pct, percentiles3y: pct3y,
            pl1y: +plPrice(a, b, tNow + 365).toFixed(0),
            pl2y: +plPrice(a, b, tNow + 730).toFixed(0),
            pl3y: +plPrice(a, b, tNow + 365 * 3).toFixed(0),
            sigmaChart: updatedSigmaChart,
          });
        } else {
          // Spot failed, use cached data as-is
          setD(cached);
        }

        setPhase("done");
        setLastRefresh(new Date());
        return; // Cache hit — done
      }
    } catch (err) {
      console.warn("Cache failed, falling back to Worker:", err);
    }

    // ── Step 2: Fallback — Web Worker ──
    setMsg("No cache. Computing from scratch...");
    runWorker();

  }, []);

  // ── Worker launcher (separated for retry) ──
  function runWorker() {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    try {
      const worker = new Worker(
        new URL("../worker/engine.worker.js", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, msg: workerMsg, result } = e.data;
        if (type === "progress") {
          setMsg(workerMsg);
        } else if (type === "done") {
          setD(result);
          setPhase("done");
          setLastRefresh(new Date());
          worker.terminate();
          workerRef.current = null;
        } else if (type === "error") {
          setMsg(workerMsg || "Engine computation failed");
          setPhase("error");
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        setMsg(err?.message || "Worker crashed");
        setPhase("error");
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ type: "run" });
    } catch (err) {
      console.error("Worker init failed:", err);
      setMsg("Web Worker not available: " + (err?.message || "unknown error"));
      setPhase("error");
    }
  }

  useEffect(() => { run(); }, []);

  useEffect(() => {
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, []);

  // ── Spot refresh every 60s ──
  useEffect(() => {
    if (phase !== "done" || !d) return;
    const refreshSpot = async () => {
      try {
        const { spot } = await fetchSpotPrice();
        if (!spot) return;
        const { a, b, resMean, resStd, resFloor, H, lambda2, ouRegimes, resReturns, evtCap, floorBreakProb, sigmaChart: prevSigmaChart } = d;
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

  // ── Derived data ──
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

    const pl1yFuture = plPrice(a, b, t0 + 365);
    const pl1yBands = {
      p2up: Math.exp(Math.log(pl1yFuture) + resMean + 2 * resStd),
      p1up: Math.exp(Math.log(pl1yFuture) + resMean + resStd),
      fair: pl1yFuture,
      pSup: Math.exp(Math.log(pl1yFuture) + resFloor),
    };

    const mcLossHorizons = computeMCLossHorizons(percentiles, percentiles3y, S0);
    const episode = computeEpisodeAnalysis(sig, sigmaChart);
    const { domRegime } = detectRegime(sig, mom, H, lambda2, annualVol, halfLife);

    const supportPriceVal = supportFloor(t0, { a, b, resFloor, ransac });

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
      mcLossHorizons, episode, domRegime, supportPrice: supportPriceVal,
      verdict, mcP5, mcP95,
      volInfo: getVolLabel(annualVol),
      verdictPlain: getVerdictPlain(sig),
      fromCache: !!d._fromCache,
    };
  })() : null;

  return { phase, msg, d, derived, lastRefresh, retry: run };
}
