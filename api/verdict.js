// ─────────────────────────────────────────────────────────────────
// api/verdict.js — Vercel serverless function (v2)
//
// GET /api/verdict
//
// Returns a comprehensive FAQ-style JSON response optimized for
// LLMs, Telegram bots, and third-party integrations. 18 bilingual
// (EN/ES) dynamically generated questions about Bitcoin.
//
// Branded: CommonSense Digital Asset Management / Edu Forte
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { fetchSpotPrice } from "./_lib/spot.js";
import { classifySignal, deviation, supportFloorPrice } from "./_lib/helpers.js";
import { faqShouldIBuy, faqWillKeepFalling, faqWillGoUp, faqHowMuch, faqOvervalued, faqTooLate, faqShouldSell, faqBubble, faqWorstCase } from "./_lib/faq-core.js";
import { faqDCA, faqFairPrice, faqSupport, faqPowerLaw, faqPrediction, faqGoodInvestment, faqBestTime, faqWhyMoving, faqWhenHit } from "./_lib/faq-extra.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL
  || "https://ybnsgusvnlubdqomtiss.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnNndXN2bmx1YmRxb210aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODkyMjQsImV4cCI6MjA5MDQ2NTIyNH0.S8tuXuhGCP70KKWmTnXXXnNO01zGSMs4yV4D14fJiyY";

const STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000;
const API_VERSION = "2.0.0";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [cacheResult, spotResult] = await Promise.all([
      supabase.from("mmar_cache").select("*").eq("id", 1).single(),
      fetchSpotPrice(),
    ]);

    if (cacheResult.error || !cacheResult.data) {
      return res.status(503).json({
        error: "Cache unavailable — the nightly compute job has not run yet",
        meta: { version: API_VERSION },
      });
    }

    const row = cacheResult.data;
    const cacheAgeMs = Date.now() - new Date(row.computed_at).getTime();
    const stale = cacheAgeMs > STALE_THRESHOLD_MS;

    // Live spot + sigma
    const spot = spotResult.spot ?? row.s0;
    const sigma = spotResult.spot
      ? (Math.log(spotResult.spot) - Math.log(row.pl_today) - row.res_mean) / row.res_std
      : row.sigma;

    const signal = classifySignal(sigma);
    const devPct = deviation(spot, row.pl_today);
    const floor = supportFloorPrice(row.ransac_a, row.ransac_b, row.ransac_floor, row.t0);

    // Percentile endpoints
    const last1y = row.percentiles_1y?.[row.percentiles_1y.length - 1];
    const last3y = row.percentiles_3y?.[row.percentiles_3y.length - 1];

    // Shared data object for all FAQs
    const d = {
      spot, sigma, signal, devPct,
      plToday: row.pl_today,
      pl1y: row.pl_1y, pl2y: row.pl_2y, pl3y: row.pl_3y,
      med_1y: last1y?.p50, p5_1y: last1y?.p5, p95_1y: last1y?.p95,
      med_3y: last3y?.p50, p5_3y: last3y?.p5, p95_3y: last3y?.p95,
      halfLife: row.half_life,
      annualVol: row.annualized_vol,
      supportFloor: floor,
      floorBreakProb: row.p_floor_break_1y,
      backtestPrecision: row.backtest_results?.precision,
      nEpisodes: row.backtest_results?.nEpisodesBuy,
      smartDCAReturn: row.backtest_results?.benchmarks?.dca?.smartDcaReturn,
      smartDCASortino: row.backtest_results?.benchmarks?.dca?.smart?.sortino,
      a: row.a, b: row.b, r2: row.r2,
      ransac_a: row.ransac_a, ransac_b: row.ransac_b, ransac_floor: row.ransac_floor,
    };

    const response = {
      about: "Should I buy Bitcoin today? Real-time answer powered by CommonSense Digital Asset Management. We use a mathematical model that tracks where Bitcoin's price should be based on its entire 14+ year history — and tells you when it's cheap, fair, or expensive.",
      source: {
        name: "CommonSense Digital Asset Management",
        analyst: "Edu Forte",
        url: "https://shouldibuybitcointoday.com",
      },
      timestamp: new Date().toISOString(),

      faq: {
        shouldIBuyBitcoin: faqShouldIBuy(d),
        willBitcoinKeepFalling: faqWillKeepFalling(d),
        willBitcoinGoUp: faqWillGoUp(d),
        howMuchWillBitcoinBeWorth: faqHowMuch(d),
        isBitcoinOvervalued: faqOvervalued(d),
        isItTooLateToBuy: faqTooLate(d),
        shouldISell: faqShouldSell(d),
        isBitcoinABubble: faqBubble(d),
        whatIsTheWorstCase: faqWorstCase(d),
        shouldIDCA: faqDCA(d),
        whatIsBitcoinFairPrice: faqFairPrice(d),
        whatsTheSupportLevel: faqSupport(d),
        whatIsThePowerLaw: faqPowerLaw(d),
        bitcoinPricePrediction: faqPrediction(d),
        isBitcoinAGoodInvestment: faqGoodInvestment(d),
        whenIsTheBestTimeToBuy: faqBestTime(d),
        whyIsBitcoinFallingOrRising: faqWhyMoving(d),
        whenWillBitcoinHit: faqWhenHit(d),
      },

      signal: { sigma: +sigma.toFixed(3), ...signal },
      spot: { price: Math.round(spot), source: spotResult.source || "cached", fetchedAt: spotResult.fetchedAt },
      powerLaw: {
        accuracy: +(row.r2 * 100).toFixed(0) + "%",
        fairValue: { today: Math.round(row.pl_today), "1y": Math.round(row.pl_1y), "2y": Math.round(row.pl_2y), "3y": Math.round(row.pl_3y) },
        currentDiscount: (devPct < 0 ? fmtPctSimple(devPct) + " discount" : fmtPctSimple(devPct) + " premium"),
        supportFloor: floor ? Math.round(floor) : null,
      },
      projections: {
        "1y": { p5: Math.round(last1y?.p5 || 0), median: Math.round(last1y?.p50 || 0), p95: Math.round(last1y?.p95 || 0) },
        "3y": { p5: Math.round(last3y?.p5 || 0), median: Math.round(last3y?.p50 || 0), p95: Math.round(last3y?.p95 || 0) },
      },
      backtest: {
        buyAccuracy: row.backtest_results?.precision ?? null,
        episodes: row.backtest_results?.nEpisodesBuy ?? null,
        smartDCAReturn: row.backtest_results?.benchmarks?.dca?.smartDcaReturn ?? null,
      },
      model: {
        hurst: row.h,
        halfLifeDays: row.half_life,
        annualVol: row.annualized_vol,
      },
      meta: {
        version: API_VERSION,
        computedAt: row.computed_at,
        cacheAgeSeconds: Math.round(cacheAgeMs / 1000),
        stale,
      },
      disclaimer: "Analysis by CommonSense Digital Asset Management (Edu Forte). This is a quantitative model, not financial advice. Past performance does not guarantee future results.",
    };

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json(response);

  } catch (err) {
    console.error("verdict handler error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err?.message || "unknown",
      meta: { version: API_VERSION },
    });
  }
}

// Inline helper (avoid circular import)
function fmtPctSimple(n) { return Math.abs(Math.round(n)) + "%"; }
