// ─────────────────────────────────────────────────────────────────
// scripts/compute-engine.mjs
//
// Server-side runner of the MMAR engine. Intended to be executed
// by GitHub Actions on a daily cron (see .github/workflows/
// compute-cache.yml). Replicates the pipeline that the Web Worker
// runs in the browser and writes the result to Supabase
// `mmar_cache` row `id=1`, which the React client reads via
// `src/hooks/useCache.js`.
//
// Why GitHub Actions and not a Vercel Cron Function:
//   Vercel Hobby plan capped at 10 s per serverless function; the
//   engine takes 20–35 s on a cold compute (2 000 Monte Carlo paths
//   + walk-forward backtest). GitHub Actions runners have no
//   meaningful time limit (up to 6 h on the free tier), so the
//   compute fits comfortably.
//
// Secrets required (set in GitHub Actions repo secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   ← write access, NEVER exposed to client
//
// Local invocation (for debugging, optional):
//   export SUPABASE_URL=https://...
//   export SUPABASE_SERVICE_ROLE_KEY=...
//   node scripts/compute-engine.mjs [--dry-run]
//
// --dry-run flag runs the full compute but skips the Supabase write
// and prints a summary to stdout.
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// Engine imports — re-use exactly the same modules the browser uses.
// All of src/engine/ is pure ES modules with no DOM dependencies,
// so it runs in Node 20+ without modification.
import { daysSinceGenesis } from "../src/engine/constants.js";
import { fitPowerLaw, plPrice } from "../src/engine/powerlaw.js";
import { computeEVTcap, adfTest } from "../src/engine/stats.js";
import { hurstDFA, partitionFunction, fitLambda2 } from "../src/engine/fractal.js";
import { estimateRegimeSwitchingOU } from "../src/engine/regime.js";
import { simulatePathsPL, computePercentiles } from "../src/engine/montecarlo.js";
import { runWalkForwardBacktest } from "../src/engine/backtest.js";
import { fetchBTC } from "../src/data/fetch.js";

// ── Config ──────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
    console.error("   Set them before running, or pass --dry-run to skip the DB write.");
    process.exit(1);
  }
}

// ── Progress logging with monotonic timing ─────────────────────
const t0Start = Date.now();
function log(msg) {
  const elapsed = ((Date.now() - t0Start) / 1000).toFixed(1);
  console.log(`[${elapsed.padStart(5, " ")}s] ${msg}`);
}

// ── Pipeline — same order as src/worker/engine.worker.js ───────
async function run() {
  log("→ Starting compute pipeline");

  // 1. Fetch prices (BTC history + live spot)
  log("1/12 Fetching BTC price history…");
  const { data: prices, source, spot: liveSpot } = await fetchBTC(log);
  log(`      ${prices.length.toLocaleString()} days loaded (source: ${source})`);

  // 2. Power Law fit
  log("2/12 Fitting Power Law (WLS + RANSAC)…");
  const pl = fitPowerLaw(prices);
  const { a, b, resMean, resStd, resFloor, resFloorSigma, r2, ransac, ransacResiduals } = pl;
  const evtCap = computeEVTcap(ransacResiduals);

  // 3. Floor break probability
  log("3/12 Computing floor break probability…");
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

  // 4. Current position
  log("4/12 Computing current position…");
  const lastPrice = prices[prices.length - 1];
  const S0 = lastPrice.price;
  const t0 = daysSinceGenesis(lastPrice.date);
  const plToday = plPrice(a, b, t0);
  const currentResidual = Math.log(S0) - Math.log(plToday);
  const sigmaFromPL = (currentResidual - resMean) / resStd;

  // 5. Daily dynamics
  log("5/12 Analyzing price dynamics…");
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

  // 6. Fractal structure (Hurst + lambda²)
  log("6/12 Estimating fractal structure…");
  const { H } = hurstDFA(resReturns);
  const tauData = partitionFunction(resReturns);
  const lambda2 = fitLambda2(tauData);

  // 7. Rolling Hurst multi-scale
  log("7/12 Computing multi-scale Hurst + volatility…");
  const hurstScales = [30, 90, 180, 365];
  const rollingHurst = [];
  const maxWindow = 365;
  for (let i = maxWindow; i < resReturns.length; i += 5) {
    const dateIdx = dailyStart + i + 1;
    if (dateIdx >= prices.length) continue;
    const p = prices[dateIdx];
    const tt = daysSinceGenesis(p.date);
    const plV = plPrice(a, b, tt);
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
  }
  if (rollingHurst.length > 0) {
    const last = rollingHurst[rollingHurst.length - 1];
    last.H = +H.toFixed(3);
    last.h90 = +H.toFixed(3);
    last.sigma = +sigmaFromPL.toFixed(2);
  }

  // 8. Regime switching OU
  log("8/12 Fitting regime-switching Ornstein-Uhlenbeck…");
  const ouRegimes = estimateRegimeSwitchingOU(dailyResiduals, resReturns);
  const kappa = ouRegimes.globalKappa;
  const halfLife = ouRegimes.halfLife;
  const adfResult = adfTest(dailyResiduals);

  // 9. Monte Carlo 2 000 paths over 3 Y
  log("9/12 Running 2,000-path Monte Carlo over 3 years…");
  const N3Y = 365 * 3;
  let paths3y = [];
  let floorBreakAccum1y = 0;
  for (let batch = 0; batch < 20; batch++) {
    const chunk = simulatePathsPL(100, N3Y, H, lambda2, resStd, resMean, a, b, t0, ouRegimes, currentResidual, resReturns, resFloor, evtCap, floorBreakProb);
    floorBreakAccum1y += (chunk.floorBreakPct || 0) * chunk.length / 100;
    paths3y = paths3y.concat(chunk);
    if ((batch + 1) % 5 === 0) log(`      MC progress: ${(batch + 1) * 100}/2000 paths`);
  }
  const pFloorBreak1y = +(floorBreakAccum1y / paths3y.length * 100).toFixed(2);
  const percentiles = computePercentiles(paths3y, 365);
  const percentiles3y = computePercentiles(paths3y, N3Y);

  // 9b. Bootstrap CI for P(reaches FV)
  log("9b/12 Bootstrapping P(reaches FV) CI…");
  const nBoot = 200;
  const targetPrice1y = S0 * 1.30;
  const p30Boots = [];
  for (let bo = 0; bo < nBoot; bo++) {
    const bootPaths = Array.from({ length: 200 }, () => paths3y[Math.floor(Math.random() * paths3y.length)]);
    const bootPcts = computePercentiles(bootPaths, 365);
    const row = bootPcts[bootPcts.length - 1];
    if (!row) continue;
    const pts = [{price:row.p5,prob:5},{price:row.p25,prob:25},{price:row.p50,prob:50},{price:row.p75,prob:75},{price:row.p95,prob:95}];
    let pLoss = 50;
    if (targetPrice1y <= pts[0].price) pLoss = 2.5;
    else if (targetPrice1y >= pts[4].price) pLoss = 97.5;
    else {
      for (let k = 0; k < pts.length - 1; k++) {
        if (targetPrice1y >= pts[k].price && targetPrice1y <= pts[k+1].price) {
          const tt = (targetPrice1y - pts[k].price) / (pts[k+1].price - pts[k].price);
          pLoss = pts[k].prob + tt * (pts[k+1].prob - pts[k].prob);
          break;
        }
      }
    }
    p30Boots.push(Math.max(0, Math.min(100, 100 - pLoss)));
  }
  p30Boots.sort((x, y) => x - y);
  const p30CI = {
    lo: +p30Boots[Math.floor(nBoot * 0.05)].toFixed(1),
    hi: +p30Boots[Math.floor(nBoot * 0.95)].toFixed(1),
  };

  // 10. Charts data
  log("10/12 Building sigma chart…");
  const sigmaChart = prices.map((p, i) => {
    if (i % 5 !== 0 && i !== prices.length - 1) return null;
    const tt = daysSinceGenesis(p.date);
    const plV = plPrice(a, b, tt);
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

  // 11. Walk-forward backtest
  log("11/12 Running walk-forward backtest…");
  const backtestResults = runWalkForwardBacktest(prices, a, b, resMean, resStd, resFloor, evtCap, floorBreakProb, ouRegimes);

  // 12. Build the cache row — snake_case field names to match the
  //     existing mmar_cache schema expected by src/hooks/useCache.js
  log("12/12 Assembling cache row…");
  const computedAt = new Date().toISOString();
  const cacheRow = {
    id: 1,
    computed_at: computedAt,
    s0: S0,
    t0,
    source,
    last_date: lastPrice.date,
    a, b, r2,
    res_mean: resMean,
    res_std: resStd,
    res_floor: resFloor,
    res_floor_sigma: resFloorSigma,
    ransac_a: ransac.a,
    ransac_b: ransac.b,
    ransac_floor: ransac.floor,
    pl_today: plToday,
    sigma: sigmaFromPL,
    h: H,
    lambda2,
    annualized_vol: annualVol,
    momentum: mom,
    kappa,
    half_life: halfLife,
    ou_regimes: ouRegimes,
    res_returns: resReturns,
    current_residual: currentResidual,
    sigma_chart: sigmaChart,
    rolling_hurst: rollingHurst,
    percentiles_1y: percentiles,
    percentiles_3y: percentiles3y,
    p_floor_break_1y: pFloorBreak1y,
    evt_cap: evtCap,
    floor_break_prob: floorBreakProb,
    adf_result: adfResult,
    backtest_results: backtestResults,
    calibrated_thresholds: backtestResults?.thresholds || { sig: -0.5, pLoss1y: 20, pFV: 40 },
    scoring_params: backtestResults?.scoringParams || null,
    calibrated_weights: backtestResults?.weights || null,
    sell_thresholds: backtestResults?.sellThresholds || { sigmaDelta: 0.10, hDelta: -0.03, volRatio: 1.15 },
    pl_1y: +plPrice(a, b, t0 + 365).toFixed(0),
    pl_2y: +plPrice(a, b, t0 + 730).toFixed(0),
    pl_3y: +plPrice(a, b, t0 + 365 * 3).toFixed(0),
    p30_ci: p30CI,
  };

  // Summary for stdout
  const summary = {
    computed_at: computedAt,
    price: S0,
    sigma: sigmaFromPL.toFixed(3),
    pl_today: plToday.toFixed(0),
    r2: r2.toFixed(4),
    H: H.toFixed(3),
    lambda2: lambda2.toFixed(4),
    kappa: kappa.toFixed(5),
    half_life_days: halfLife,
    mc_paths: paths3y.length,
    buy_precision: backtestResults?.precision ?? "N/A",
    row_size_kb: (JSON.stringify(cacheRow).length / 1024).toFixed(1),
  };
  log("─".repeat(50));
  log("SUMMARY");
  for (const [k, v] of Object.entries(summary)) {
    log(`  ${k.padEnd(20, " ")} ${v}`);
  }
  log("─".repeat(50));

  if (DRY_RUN) {
    log("✓ Dry-run complete — Supabase write skipped.");
    return;
  }

  // ── Write to Supabase ────────────────────────────────────────
  log("→ Writing to Supabase mmar_cache…");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase
    .from("mmar_cache")
    .upsert(cacheRow, { onConflict: "id" });

  if (error) {
    console.error("❌ Supabase write failed:", error);
    process.exit(1);
  }

  log("✓ Cache row written successfully.");
  log(`  Total pipeline time: ${((Date.now() - t0Start) / 1000).toFixed(1)}s`);
}

run().catch(err => {
  console.error("❌ Pipeline failed:", err);
  console.error(err.stack);
  process.exit(1);
});
