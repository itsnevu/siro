import test from "node:test";
import assert from "node:assert/strict";
import { stockPriceUsd, depthUsd, deviation, hourBar, gapSigma, spreadRatio, regime, flags, benchmarkReturn, HOUR } from "../services/ingest/core.mjs";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);
// sqrtPriceX96 for a stock price p with token0 = USDG(6), token1 = stock(18): raw = 1e12 / p
const sqrtFor = p => BigInt(Math.round(Math.sqrt(1e12 / p) * 2 ** 96));

test("pool price inverts USDG/stock raw price with decimals", () => {
  close(stockPriceUsd(sqrtFor(170.9)), 170.9);
  close(stockPriceUsd(sqrtFor(356.84)), 356.84);
  // Observed on chain 2026-11-13: NVDA pool slot0 vs Chainlink 170.95 (0.03%).
  assert.throws(() => stockPriceUsd(0n));
});

test("depth: more liquidity means more USDG to move price; scales with move size", () => {
  const s = sqrtFor(170);
  const d1 = depthUsd(10n ** 18n, s, 0.02), d2 = depthUsd(2n * 10n ** 18n, s, 0.02);
  close(d2, 2 * d1);
  assert.ok(depthUsd(10n ** 18n, s, 0.04) > d1);
  assert.equal(depthUsd(0n, s, 0.02), 0);
});

test("hour bar: high/low include trades and boundaries", () => {
  const b = hourBar({ asset: "NVDA", openTs: 10 * HOUR, openPrice: 100, closePrice: 101, tradePrices: [99, 103], volumeUsd: 5000 });
  assert.deepEqual([b.open, b.high, b.low, b.close, b.close_ts], [100, 103, 99, 101, 11 * HOUR]);
  assert.throws(() => hourBar({ asset: "X", openTs: 0, openPrice: 0, closePrice: 1, tradePrices: [], volumeUsd: 0 }));
});

test("flags: dispute only against fresh Chainlink; staleness accumulates over no-trade hours", () => {
  const cl = { price: 100, ageSeconds: 10, heartbeat: 86400 };
  assert.equal(flags({ poolClose: 101.5, chainlink: cl, trades: 3, previousStaleTicks: 0 }).disputed, true);
  assert.equal(flags({ poolClose: 100.5, chainlink: cl, trades: 3, previousStaleTicks: 0 }).disputed, false);
  assert.equal(flags({ poolClose: 150, chainlink: { ...cl, ageSeconds: 90000 }, trades: 1, previousStaleTicks: 0 }).chainlink_status, "stale");
  const f = flags({ poolClose: 100, chainlink: null, trades: 0, previousStaleTicks: 2 });
  assert.deepEqual([f.filled, f.stale_ticks, f.chainlink_status], [true, 3, "missing"]);
});

test("gap sigma, spread ratio, benchmark return", () => {
  const bars = Array.from({ length: 60 }, (_, i) => ({ open: 100 + (i % 2), close: 100 + ((i + 1) % 2) }));
  assert.ok(gapSigma(bars, 59) >= 0);
  bars[59] = { open: 120, close: 120 };
  assert.ok(gapSigma(bars, 59) > 3);
  assert.equal(spreadRatio([10, 10, 10, 5], 3), 2);
  assert.equal(spreadRatio([10, 0], 1), 99);
  close(benchmarkReturn(100, 101), 0.01);
  assert.equal(benchmarkReturn(0, 101), 0);
  assert.equal(deviation(0, 1), null);
});

test("regime rule is deterministic and uses only past closes", () => {
  const flat = Array.from({ length: 70 }, () => 100);
  assert.equal(regime(flat), "long_chop");
  const up = Array.from({ length: 70 }, (_, i) => 100 * 1.002 ** i);
  assert.equal(regime(up), "bull");
  const down = Array.from({ length: 70 }, (_, i) => 100 * 0.998 ** i);
  assert.equal(regime(down), "bear");
  const gap = [...flat.slice(0, 69), 104];
  assert.equal(regime(gap), "vol_shock"); // a 4% jump after calm days is a vol shock first
  assert.equal(regime(flat.slice(0, 30)), "long_chop");
});
