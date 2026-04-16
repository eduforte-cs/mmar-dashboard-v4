// ─────────────────────────────────────────────────────────────────
// api/chat.js — Vercel serverless function
//
// POST /api/chat
//
// Streams Claude responses via SSE, using live market data from
// the same Supabase cache + spot price used by the verdict API.
//
// Branded: CommonSense Digital Asset Management / Edu Forte
// ─────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { fetchSpotPrice } from "./_lib/spot.js";
import { classifySignal, deviation, supportFloorPrice } from "./_lib/helpers.js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL
  || "https://ybnsgusvnlubdqomtiss.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnNndXN2bmx1YmRxb210aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODkyMjQsImV4cCI6MjA5MDQ2NTIyNH0.S8tuXuhGCP70KKWmTnXXXnNO01zGSMs4yV4D14fJiyY";

// ── Rate limiting ──
const rateMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// Periodically clean stale entries (avoid memory leak on long-running instance)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now - entry.windowStart > RATE_WINDOW_MS * 2) rateMap.delete(ip);
  }
}, RATE_WINDOW_MS * 2);

// ── Fetch market data (same approach as verdict.js) ──
async function fetchMarketData() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [cacheResult, spotResult] = await Promise.all([
    supabase.from("mmar_cache").select("*").eq("id", 1).single(),
    fetchSpotPrice(),
  ]);

  if (cacheResult.error || !cacheResult.data) {
    return null;
  }

  const row = cacheResult.data;
  const spot = spotResult.spot ?? row.s0;
  const sigma = spotResult.spot
    ? (Math.log(spotResult.spot) - Math.log(row.pl_today) - row.res_mean) / row.res_std
    : row.sigma;

  const signal = classifySignal(sigma);
  const devPct = deviation(spot, row.pl_today);
  const floor = supportFloorPrice(row.ransac_a, row.ransac_b, row.ransac_floor, row.t0);

  const last1y = row.percentiles_1y?.[row.percentiles_1y.length - 1];
  const last3y = row.percentiles_3y?.[row.percentiles_3y.length - 1];

  return {
    spot: Math.round(spot),
    spotSource: spotResult.source || "cached",
    sigma: +sigma.toFixed(3),
    signal: signal.level,
    answer: signal.answer,
    confidence: signal.confidence,
    fairValue: Math.round(row.pl_today),
    fairValue1y: Math.round(row.pl_1y),
    fairValue2y: Math.round(row.pl_2y),
    fairValue3y: Math.round(row.pl_3y),
    deviationPct: Math.round(devPct),
    supportFloor: floor ? Math.round(floor) : null,
    floorBreakProb1y: row.p_floor_break_1y,
    halfLifeDays: row.half_life,
    annualVol: Math.round((row.annualized_vol || 0) * 100),
    monteCarlo1y: last1y ? {
      p5: Math.round(last1y.p5),
      median: Math.round(last1y.p50),
      p95: Math.round(last1y.p95),
    } : null,
    monteCarlo3y: last3y ? {
      p5: Math.round(last3y.p5),
      median: Math.round(last3y.p50),
      p95: Math.round(last3y.p95),
    } : null,
    backtestPrecision: row.backtest_results?.precision ?? null,
    backtestEpisodes: row.backtest_results?.nEpisodesBuy ?? null,
    smartDCAReturn: row.backtest_results?.benchmarks?.dca?.smartDcaReturn ?? null,
    r2: row.r2 ? +(row.r2 * 100).toFixed(0) : null,
    computedAt: row.computed_at,
  };
}

// ── Build system prompt ──
function buildSystemPrompt(data, lang) {
  const langInstruction = lang === "es"
    ? "The user speaks Spanish. Respond entirely in Spanish."
    : "The user speaks English. Respond entirely in English.";

  return `You are the AI assistant for CommonSense Digital Asset Management, created by Edu Forte.

${langInstruction}

Your role is to answer questions about Bitcoin using ONLY the real-time market data provided below. You must NEVER invent numbers, fabricate statistics, or speculate beyond what the data shows.

Tone: friendly, direct, no jargon. Explain concepts simply. Keep answers concise but informative.

Always mention CommonSense as the source of the analysis when relevant.

End every response with a brief disclaimer that this is quantitative analysis from CommonSense Digital Asset Management, not financial advice.

── LIVE MARKET DATA (as of now) ──
${JSON.stringify(data, null, 2)}

── KEY DEFINITIONS ──
- Signal levels: strongBuy (sigma < -1), buy (-1 to -0.5), hold (-0.5 to 0.3), caution (0.3 to 0.5), reduce (0.5 to 0.8), sell (> 0.8)
- Sigma: how many standard deviations the price is from fair value (negative = undervalued, positive = overvalued)
- Fair value: Power Law model's estimate of where Bitcoin should be priced
- Deviation: current price vs fair value as a percentage (negative = discount, positive = premium)
- Support floor: RANSAC regression lower bound — the historical price floor
- Monte Carlo: 2000 simulated price paths; p5/median/p95 are percentile outcomes
- R2: Power Law model accuracy (how well it fits 14+ years of data)
- Half-life: mean-reversion speed in days — how fast price tends to return to fair value
- Annual volatility: yearly price swing magnitude
- Backtest precision: historical accuracy of the buy signal

Do NOT answer questions unrelated to Bitcoin, crypto markets, or CommonSense's model. Politely redirect.`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded. Max 10 messages per minute." });
  }

  try {
    const { message, history = [], lang = "en" } = req.body || {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Missing or empty message" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    // Fetch live market data
    const data = await fetchMarketData();
    if (!data) {
      return res.status(503).json({
        error: "Market data temporarily unavailable. Please try again later.",
      });
    }

    // Build messages array for Claude
    const systemPrompt = buildSystemPrompt(data, lang);

    // Convert history (last 10 messages) to Claude format
    const historyMessages = (Array.isArray(history) ? history : [])
      .slice(-10)
      .map(h => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: typeof h.text === "string" ? h.text : String(h.text || ""),
      }));

    // Add current user message
    const claudeMessages = [
      ...historyMessages,
      { role: "user", content: message.trim() },
    ];

    // Initialize Anthropic client
    const anthropic = new Anthropic();

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Stream response from Claude
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    stream.on("text", (text) => {
      res.write(`data: ${JSON.stringify({ type: "text", text })}\n\n`);
    });

    stream.on("error", (err) => {
      console.error("Claude stream error:", err);
      res.write(`data: ${JSON.stringify({ type: "error", error: "Stream error" })}\n\n`);
      res.end();
    });

    stream.on("end", () => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    // Wait for the stream to complete
    await stream.finalMessage();

  } catch (err) {
    console.error("chat handler error:", err);

    // If headers already sent (streaming started), try to send error event
    if (res.headersSent) {
      try {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Internal error" })}\n\n`);
        res.end();
      } catch (_) { /* ignore */ }
      return;
    }

    return res.status(500).json({
      error: "Internal server error",
      message: err?.message || "unknown",
    });
  }
}
