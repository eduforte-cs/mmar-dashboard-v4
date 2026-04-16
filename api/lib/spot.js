// Live spot price — Binance with Kraken fallback
export async function fetchSpotPrice() {
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
  } catch (_) { /* fall through */ }

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
