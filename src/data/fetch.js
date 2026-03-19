// ── Data fetching — Binance klines + spot price ──
import btcHistory from "./btc-history.json";

function mergeAndDedupe(...sources) {
  const map = new Map();
  for (const src of sources) {
    for (const d of src) {
      if (d.price > 0) map.set(d.date, d);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchSpotPrice() {
  try {
    const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    const spot = parseFloat(j.price);
    if (spot > 1000) return { spot, source: "Binance" };
  } catch (e) { /* try Kraken */ }
  try {
    const r = await fetch("https://api.kraken.com/0/public/Ticker?pair=XBTUSD", { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    const spot = parseFloat(j.result?.XXBTZUSD?.c?.[0] || j.result?.XBTUSD?.c?.[0]);
    if (spot > 1000) return { spot, source: "Kraken" };
  } catch (e) { /* both failed */ }
  return { spot: null, source: null };
}

export async function fetchRecentKlines(onStatus, lastHardcodedDate) {
  const startMs = new Date(lastHardcodedDate).getTime();
  const nowMs = Date.now();
  const daysNeeded = Math.ceil((nowMs - startMs) / 86400000) + 2;

  if (daysNeeded <= 0) return [];

  onStatus?.(`Fetching ${Math.min(daysNeeded, 1000)}+ days from Binance...`);

  const allKlines = [];
  let cursor = startMs;
  const chunkLimit = 1000;

  while (cursor < nowMs) {
    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${cursor}&limit=${chunkLimit}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`Binance ${r.status}`);
      const raw = await r.json();
      if (!Array.isArray(raw) || raw.length === 0) break;
      allKlines.push(...raw.map(k => ({ date: new Date(k[0]).toISOString().slice(0, 10), price: parseFloat(k[4]) })));
      const lastTs = raw[raw.length - 1][0];
      cursor = lastTs + 86400000;
      if (raw.length < chunkLimit) break;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.warn("Binance klines failed:", e.message);
      break;
    }
  }
  return allKlines;
}

export async function fetchBTC(onStatus) {
  onStatus?.("Loading historical data...");

  // Base: hardcoded data (2010 monthly → 2026-03-10 daily from CoinGecko)
  const base = mergeAndDedupe(btcHistory.early, btcHistory.history);
  const lastHardcoded = base[base.length - 1].date;

  // Extend from last hardcoded date to today via Binance
  const recent = await fetchRecentKlines(onStatus, lastHardcoded);
  const merged = mergeAndDedupe(base, recent);

  // Get live spot price
  onStatus?.("Fetching live spot price...");
  const { spot, source: spotSource } = await fetchSpotPrice();

  if (spot && merged.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const lastEntry = merged[merged.length - 1];
    if (lastEntry.date === today) {
      lastEntry.price = spot;
    } else {
      merged.push({ date: today, price: spot });
    }
  }

  const liveLabel = recent.length > 0 ? "Binance" : "hardcoded";
  const source = `${liveLabel}${spotSource ? ` + ${spotSource} spot` : ""} (${merged.length.toLocaleString()} days)`;
  return { data: merged, source, spot };
}
