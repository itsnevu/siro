// Pure functions for phase 9 ingestion. No IO. Every number written to market data comes
// from one of these, so each one is tested in tests/ingest.test.mjs.
export const HOUR = 3_600_000;
export const DISPUTE_THRESHOLD = 0.01; // pool vs Chainlink deviation that blocks trading
export const STALE_TICKS = 2; // hours without a fresh trade before entries are vetoed

/**
 * USD price of the stock token from a Uniswap v3 sqrtPriceX96 where token0 = USDG (6 decimals)
 * and token1 = stock (18 decimals). Raw price = token1 per token0; USD price is its inverse.
 */
export function stockPriceUsd(sqrtPriceX96, { usdgIsToken0 = true, usdgDecimals = 6, stockDecimals = 18 } = {}) {
  const s = Number(sqrtPriceX96) / 2 ** 96;
  if (!Number.isFinite(s) || s <= 0) throw new Error("invalid sqrtPriceX96");
  const raw = s * s; // token1 per token0, in raw units
  const decimalsAdjusted = usdgIsToken0 ? raw * 10 ** (usdgDecimals - stockDecimals) : raw * 10 ** (stockDecimals - usdgDecimals);
  return usdgIsToken0 ? 1 / decimalsAdjusted : decimalsAdjusted;
}

/**
 * USDG needed to push the stock price up by `move` (e.g. 0.02) using only the liquidity active at
 * the current tick. Approximation: ignores liquidity changes across tick boundaries.
 * With token0 = USDG, buying stock is a zeroForOne swap: amount0 = L * (1/sqrt(P1) - 1/sqrt(P0)),
 * and a stock price increase of (1+move) means raw P falls by the same factor.
 */
export function depthUsd(liquidity, sqrtPriceX96, move = 0.02, usdgDecimals = 6) {
  const L = Number(liquidity), s0 = Number(sqrtPriceX96) / 2 ** 96;
  if (!(L >= 0) || !(s0 > 0) || !(move > 0)) throw new Error("invalid depth input");
  const s1 = s0 / Math.sqrt(1 + move);
  return (L * (1 / s1 - 1 / s0)) / 10 ** usdgDecimals;
}

export const deviation = (a, b) => (a > 0 && b > 0 ? Math.abs(a / b - 1) : null);

/** OHLC for one hour. Open/close are pool state at the hour boundaries; high/low include every trade. */
export function hourBar({ asset, openTs, openPrice, closePrice, tradePrices, volumeUsd }) {
  const all = [openPrice, closePrice, ...tradePrices];
  if (!all.every(p => Number.isFinite(p) && p > 0)) throw new Error("invalid price in hour");
  return { asset, open_ts: openTs, close_ts: openTs + HOUR, open: openPrice, high: Math.max(...all), low: Math.min(...all), close: closePrice, volume: volumeUsd };
}

const std = v => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)); };

/** |open - previous close| in units of the trailing 48-bar return standard deviation. */
export function gapSigma(bars, i) {
  if (i < 2) return 0;
  const window = bars.slice(Math.max(1, i - 47), i + 1);
  const returns = window.map((b, k) => (k === 0 ? bars[Math.max(0, i - 48)].close : window[k - 1].close)).map((prev, k) => window[k].close / prev - 1);
  const sd = std(returns);
  const gap = Math.abs(bars[i].open / bars[i - 1].close - 1);
  return sd > 0 ? gap / sd : 0;
}

/** Spread proxy: trailing median depth over current depth (thinner book than usual => ratio > 1). */
export function spreadRatio(depths, i) {
  const w = depths.slice(Math.max(0, i - 47), i + 1).filter(d => d > 0).sort((a, b) => a - b);
  if (!w.length || !(depths[i] > 0)) return 99;
  return w[Math.floor(w.length / 2)] / depths[i];
}

/**
 * Published regime rule (docs/data.md), from SPY daily closes up to the hour (no look-ahead):
 * vol_shock if 5-day realised vol > 2x 60-day; gap_news if |last daily move| > 3%;
 * bull if 20-day return > +3%; bear if < -3%; otherwise long_chop.
 */
export function regime(spyDailyCloses) {
  const c = spyDailyCloses;
  if (c.length < 61) return "long_chop";
  const r = c.slice(1).map((x, k) => x / c[k] - 1);
  const v5 = std(r.slice(-5)), v60 = std(r.slice(-60));
  if (v60 > 0 && v5 > 2 * v60) return "vol_shock";
  if (Math.abs(r.at(-1)) > 0.03) return "gap_news";
  const r20 = c.at(-1) / c.at(-21) - 1;
  return r20 > 0.03 ? "bull" : r20 < -0.03 ? "bear" : "long_chop";
}

/**
 * Validation flags for one asset-hour.
 * disputed: pool close and Chainlink-as-of-close differ by more than 1% (Chainlink fresh).
 * stale_ticks: consecutive hours, including this one, with no pool trade.
 * filled: no trade this hour; price is carried pool state, exposed rather than hidden.
 */
export function flags({ poolClose, chainlink, trades, previousStaleTicks }) {
  const clFresh = chainlink && chainlink.ageSeconds <= chainlink.heartbeat;
  const dev = clFresh ? deviation(poolClose, chainlink.price) : null;
  const filled = trades === 0;
  return {
    filled,
    stale_ticks: filled ? previousStaleTicks + 1 : 0,
    disputed: dev !== null && dev > DISPUTE_THRESHOLD,
    chainlink_deviation: dev,
    chainlink_status: !chainlink ? "missing" : clFresh ? "fresh" : "stale",
  };
}

/** Return of a benchmark between two hourly closes; 0 when the market had no bar (closed). */
export const benchmarkReturn = (prev, cur) => (prev > 0 && cur > 0 ? cur / prev - 1 : 0);
