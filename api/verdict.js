// ─────────────────────────────────────────────────────────────────
// api/verdict.js — Vercel serverless function
//
// GET /api/verdict
//
// Public, read-only endpoint that returns the current MMAR signal
// as a stable JSON schema. Consumers:
//   • Telegram bot (future)
//   • Third-party integrations
//   • SEO crawlers / LLM scrapers
//
// Performance: ~500 ms. One Supabase SELECT + one live spot fetch
// to Binance + a small amount of JSON assembly. Fits comfortably
// under the Vercel Hobby 10-second function timeout.
//
// The heavy engine compute (~20-35 s) does NOT run in this
// function — it runs in a GitHub Actions daily cron that populates
// the mmar_cache table. See .github/workflows/compute-cache.yml.
//
// Env vars (already set in Vercel for the main app):
//   VITE_SUPABASE_URL            — Supabase project URL
//   VITE_SUPABASE_ANON_KEY       — anon read key (RLS allows SELECT
//                                   on mmar_cache)
//
// Using VITE_ prefixed vars here is fine because Vercel exposes
// them to both the client bundle AND server functions. We only
// need READ access, so the anon key is sufficient.
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// Fallbacks mirror src/lib/supabase.js so the endpoint works even
// if the VITE_ env vars aren't set on the server side. The anon
// key is public by design (RLS on mmar_cache only permits SELECT)
// so it is safe to hardcode as a fallback.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL
  || "https://ybnsgusvnlubdqomtiss.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnNndXN2bmx1YmRxb210aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODkyMjQsImV4cCI6MjA5MDQ2NTIyNH0.S8tuXuhGCP70KKWmTnXXXnNO01zGSMs4yV4D14fJiyY";

const STALE_THRESHOLD_MS = 26 * 60 * 60 * 1000; // 26 h (matches useCache.js)
const API_VERSION = "1.0.0";

// ── Live spot price (Binance, 5 s timeout, Kraken fallback) ────
async function fetchSpotPrice() {
  try {
    const r = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      { signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const j = await r.json();
      const spot = parseFloat(j.price);
      if (spot > 1000) return { spot, source: "binance", fetchedAt: new Date().toISOString() };
    }
  } catch (_) { /* fall through to Kraken */ }

  try {
    const r = await fetch(
      "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
      { signal: AbortSignal.timeout(5000) }
    );
    if (r.ok) {
      const j = await r.json();
      const spot = parseFloat(j.result?.XXBTZUSD?.c?.[0] || j.result?.XBTUSD?.c?.[0]);
      if (spot > 1000) return { spot, source: "kraken", fetchedAt: new Date().toISOString() };
    }
  } catch (_) { /* both failed */ }

  return { spot: null, source: null, fetchedAt: new Date().toISOString() };
}

// ── Narrative generator (short, bilingual) ─────────────────────
// Kept lightweight on purpose — the rich narrative lives in the
// React client via src/i18n/localizeVerdict.js and verdict.js.
// Server response gives a stable summary string callers can use
// directly in push notifications / embeds without parsing deeper.
function buildNarrative({ sigma, spot, plToday, backtestPrecision }) {
  const devPct = ((spot - plToday) / plToday * 100);
  const absPct = Math.abs(devPct).toFixed(0);
  const direction = devPct >= 0 ? "above" : "below";
  const directionEs = devPct >= 0 ? "por encima de" : "por debajo de";
  const sigFmt = sigma.toFixed(2);
  const sigFmtEs = sigFmt.replace(".", ",");

  let levelEn, levelEs;
  if (sigma < -1.0)      { levelEn = "strong buy"; levelEs = "compra fuerte"; }
  else if (sigma < -0.5) { levelEn = "buy";        levelEs = "compra"; }
  else if (sigma < 0.3)  { levelEn = "hold";       levelEs = "mantener"; }
  else if (sigma < 0.5)  { levelEn = "caution";    levelEs = "precaución"; }
  else if (sigma < 0.8)  { levelEn = "reduce";     levelEs = "reducir"; }
  else                   { levelEn = "sell";       levelEs = "vender"; }

  return {
    en: {
      short: `Bitcoin is ${absPct}% ${direction} fair value (σ = ${sigFmt}). Signal: ${levelEn}.`,
      long: sigma < -0.5
        ? `Bitcoin is ${absPct}% ${direction} where the Power Law model says it should be. σ = ${sigFmt}. Historically, ${backtestPrecision}% of the time the model said "buy" at this level, the price was higher 12 months later.`
        : `Bitcoin is ${absPct}% ${direction} where the Power Law model says it should be. σ = ${sigFmt}. Signal: ${levelEn}.`,
    },
    es: {
      short: `Bitcoin está ${absPct}% ${directionEs} su valor justo (σ = ${sigFmtEs}). Señal: ${levelEs}.`,
      long: sigma < -0.5
        ? `Bitcoin está ${absPct}% ${directionEs} donde el modelo Power Law dice que debería estar. σ = ${sigFmtEs}. Históricamente, el ${backtestPrecision}% de las veces que el modelo dijo "comprar" a este nivel, el precio estuvo más alto 12 meses después.`
        : `Bitcoin está ${absPct}% ${directionEs} donde el modelo Power Law dice que debería estar. σ = ${sigFmtEs}. Señal: ${levelEs}.`,
    },
  };
}

// ── Signal classification ──────────────────────────────────────
function classifySignal(sigma) {
  if (sigma < -1.0)      return { level: "strongBuy", answer: "yes", subtitle: "Strong Buy", subtitleColor: "#1B8A4A", confidence: "high" };
  if (sigma < -0.5)      return { level: "buy",       answer: "yes", subtitle: "Buy",        subtitleColor: "#27AE60", confidence: "high" };
  if (sigma <  0.3)      return { level: "hold",      answer: "hold", subtitle: "Hold",      subtitleColor: "#E8A838", confidence: "moderate" };
  if (sigma <  0.5)      return { level: "caution",   answer: "hold", subtitle: "Caution",   subtitleColor: "#E8A838", confidence: "low" };
  if (sigma <  0.8)      return { level: "reduce",    answer: "no",  subtitle: "Reduce",     subtitleColor: "#F2994A", confidence: "moderate" };
  return                       { level: "sell",      answer: "no",  subtitle: "Sell",       subtitleColor: "#EB5757", confidence: "high" };
}

// ── Handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS — permissive for MVP. Can be restricted later if needed.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Read cache + fetch spot in parallel
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

    // Use live spot if available, fall back to cached s0
    const spotPrice = spotResult.spot ?? row.s0;
    const sigmaLive = spotResult.spot
      ? (Math.log(spotResult.spot) - Math.log(row.pl_today) - row.res_mean) / row.res_std
      : row.sigma;

    // Classification + narrative
    const signal = {
      sigma: +sigmaLive.toFixed(3),
      ...classifySignal(sigmaLive),
    };

    // Loss horizons from percentiles
    const last1y = row.percentiles_1y?.[row.percentiles_1y.length - 1] || null;
    const last3y = row.percentiles_3y?.[row.percentiles_3y.length - 1] || null;

    const horizon = (pcts, plTarget) => {
      if (!pcts) return null;
      const probLoss = pcts.p50 != null
        ? Math.max(0, Math.min(100, 100 * (spotPrice > pcts.p5 ? (spotPrice - pcts.p5) < 0 ? 50 : 0 : 50)))
        : null;
      return {
        median: Math.round(pcts.p50 ?? 0),
        p5: Math.round(pcts.p5 ?? 0),
        p95: Math.round(pcts.p95 ?? 0),
        fairValue: Math.round(plTarget ?? 0),
      };
    };

    // Narrative (depends on finalized sigma + backtest)
    const narrative = buildNarrative({
      sigma: sigmaLive,
      spot: spotPrice,
      plToday: row.pl_today,
      backtestPrecision: row.backtest_results?.precision ?? 100,
    });

    // Build the stable public response
    const response = {
      meta: {
        version: API_VERSION,
        computedAt: row.computed_at,
        cacheAgeSeconds: Math.round(cacheAgeMs / 1000),
        stale,
        locale: ["en", "es"],
      },
      spot: {
        price: Math.round(spotPrice),
        source: spotResult.source || "cached",
        fetchedAt: spotResult.fetchedAt,
      },
      signal,
      powerLaw: {
        a: row.a,
        b: row.b,
        r2: row.r2,
        fairValueToday: Math.round(row.pl_today),
        supportFloor: row.ransac
          ? Math.round(Math.exp(row.ransac_a + row.ransac_b * Math.log(row.t0) + row.ransac_floor))
          : null,
      },
      horizons: {
        "1y": horizon(last1y, row.pl_1y),
        "3y": horizon(last3y, row.pl_3y),
      },
      backtest: {
        buyAccuracy: row.backtest_results?.precision ?? null,
        nTested: row.backtest_results?.nTotal ?? null,
        nEpisodes: row.backtest_results?.nEpisodesBuy ?? null,
        smartDCAReturn: row.backtest_results?.benchmarks?.dca?.smartDcaReturn ?? null,
        smartDCASortino: row.backtest_results?.benchmarks?.dca?.smart?.sortino ?? null,
      },
      narrative,
      model: {
        hurst: row.h,
        lambda2: row.lambda2,
        kappa: row.kappa,
        halfLifeDays: row.half_life,
        annualVol: row.annualized_vol,
      },
    };

    // Cache headers — browsers/CDN can hold onto the response for
    // 60 seconds. Beyond that, hit us again (which is still fast
    // because the Supabase read is cheap).
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
