// Secondary source: Yahoo Finance chart API for the underlying equities and SPY/QQQ benchmarks.
// Raw responses go to the write-once store. Bars exist only while the exchange is open.
import { HOUR } from "./core.mjs";

export function createYahoo(store, fetchImpl = fetch) {
  async function chart(symbol, interval, fromMs, toMs) {
    const p1 = Math.floor(fromMs / 1000), p2 = Math.ceil(toMs / 1000);
    return store.once(`yahoo/${symbol}/${interval}-${p1}-${p2}`, async () => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&period1=${p1}&period2=${p2}&includePrePost=false`;
      const r = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "siro-ingest" } });
      if (!r.ok) throw new Error(`Yahoo ${symbol} HTTP ${r.status}`);
      return r.json();
    });
  }
  /** Map hour-start (ms) -> close of the 1h bar that ends inside that hour (bars start at :30). */
  async function hourlyCloses(symbol, fromMs, toMs) {
    const res = (await chart(symbol, "1h", fromMs - 3 * 86_400_000, toMs)).chart?.result?.[0];
    const map = new Map();
    if (!res?.timestamp) return map;
    const closes = res.indicators.quote[0].close;
    res.timestamp.forEach((t, i) => {
      const c = closes[i];
      if (!(c > 0)) return;
      const end = Math.min(t * 1000 + HOUR, (res.meta?.currentTradingPeriod?.regular?.end ?? Infinity) * 1000);
      map.set(Math.floor(end / HOUR) * HOUR, c);
    });
    return map;
  }
  /** Daily closes with their session dates (ms of the bar start). */
  async function dailyCloses(symbol, fromMs, toMs) {
    const res = (await chart(symbol, "1d", fromMs - 120 * 86_400_000, toMs)).chart?.result?.[0];
    if (!res?.timestamp) return [];
    return res.timestamp.map((t, i) => ({ ts: t * 1000, close: res.indicators.quote[0].close[i] })).filter(d => d.close > 0);
  }
  return { hourlyCloses, dailyCloses };
}
