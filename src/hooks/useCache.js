// ── useCache — reads pre-computed results from Supabase ──
// Returns cached data if fresh (<26 hours old), null otherwise.
// The frontend then falls back to Web Worker computation.

import { supabase } from "../lib/supabase.js";

const MAX_AGE_MS = 26 * 60 * 60 * 1000; // 26 hours (gives buffer for daily cron)

export async function fetchCache() {
  try {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("mmar_cache")
      .select("*")
      .eq("id", 1)
      .single();

    if (error || !data) return null;

    // Check freshness
    const age = Date.now() - new Date(data.computed_at).getTime();
    if (age > MAX_AGE_MS) {
      console.log(`Cache stale: ${(age / 3600000).toFixed(1)}h old`);
      return null;
    }

    // Reconstruct the state object that useEngine expects
    const cached = {
      H: data.h,
      lambda2: data.lambda2,
      std: null, // not critical for UI, computed from resReturns if needed
      mean: null,
      annualVol: data.annualized_vol,
      S0: data.s0,
      t0: data.t0,
      n: data.res_returns?.length || 0,
      source: data.source,
      mom: data.momentum,
      lastDate: data.last_date,
      a: data.a,
      b: data.b,
      r2: data.r2,
      resMean: data.res_mean,
      resStd: data.res_std,
      resFloor: data.res_floor,
      resFloorSigma: data.res_floor_sigma,
      ransac: { a: data.ransac_a, b: data.ransac_b, floor: data.ransac_floor },
      plToday: data.pl_today,
      sigmaFromPL: data.sigma,
      kappa: data.kappa,
      halfLife: data.half_life,
      ouRegimes: data.ou_regimes,
      resReturns: data.res_returns || [],
      dailyResiduals: [],  // not stored, not needed for UI
      currentResidual: data.current_residual,
      tauData: null,  // not stored, not needed for UI
      sigmaChart: data.sigma_chart || [],
      rollingHurst: data.rolling_hurst || [],
      percentiles: data.percentiles_1y || [],
      percentiles3y: data.percentiles_3y || [],
      pFloorBreak1y: data.p_floor_break_1y,
      evtCap: data.evt_cap,
      floorBreakProb: data.floor_break_prob,
      empiricalFloorProb: null,
      adfResult: data.adf_result,
      backtestResults: data.backtest_results,
      calibratedThresholds: data.calibrated_thresholds,
      scoringParams: data.scoring_params,
      calibratedWeights: data.calibrated_weights,
      sellThresholds: data.sell_thresholds,
      pl1y: data.pl_1y,
      pl2y: data.pl_2y,
      pl3y: data.pl_3y,
      _fromCache: true,
      _cacheAge: age,
      _computedAt: data.computed_at,
    };

    console.log(`Cache hit: ${(age / 3600000).toFixed(1)}h old, computed at ${data.computed_at}`);
    return cached;

  } catch (err) {
    console.warn("Cache fetch failed:", err);
    return null;
  }
}
