// Phase 9 backfill: real hourly data for tokenized stocks on Robinhood Chain.
//
//   node services/ingest/backfill.mjs --assets NVDA,AAPL --from 2026-10-20T00:00:00Z --through 2026-11-13T00:00:00Z --out data/real/nvda-aapl
//
// Sources, in order of authority:
//   primary    Uniswap v3 USDG pools (official factory): hour open/close from slot0 at the boundary
//              blocks, high/low from every Swap event in the hour, volume = USDG traded, depth from
//              active liquidity. Archive reads need 2-endpoint agreement when 2 archive RPCs exist.
//   comparator Chainlink equity feed answer as of the boundary block (on-chain, archive read).
//   secondary  Yahoo Finance hourly bars (exchange hours only) for the underlying and SPY/QQQ.
// Outputs bars.jsonl (tickstore), market.jsonl (runner points), manifest.json (provenance, counts).
// Raw responses live under <out>/raw and are never overwritten.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRpc, DEFAULT_ENDPOINTS } from "./rpc.mjs";
import { createChain, USDG, WETH } from "./chain.mjs";
import { createStore } from "./store.mjs";
import { createYahoo } from "./yahoo.mjs";
import { HOUR, stockPriceUsd, depthUsd, hourBar, gapSigma, spreadRatio, regime, flags, benchmarkReturn, deviation } from "./core.mjs";

const arg = name => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const assets = (arg("assets") ?? "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
const from = Date.parse(arg("from") ?? ""), through = Date.parse(arg("through") ?? "");
const out = resolve(arg("out") ?? "data/real/run");
if (!assets.length || !Number.isFinite(from) || !Number.isFinite(through) || from % HOUR || through % HOUR || through <= from)
  throw new Error("usage: --assets NVDA,AAPL --from ISO_HOUR --through ISO_HOUR --out DIR");
try { process.loadEnvFile(".env.local"); } catch { /* optional */ }
const urls = [...(process.env.ALCHEMY_RPC_URL_4663 ? [process.env.ALCHEMY_RPC_URL_4663] : []), ...(process.env.SIRO_INGEST_RPCS?.split(",").map(s => s.trim()).filter(Boolean) ?? DEFAULT_ENDPOINTS)];
const LOOKBACK = 49; // features need 48 closed bars before the first tick
const GAS_PER_SWAP = 250_000n;

mkdirSync(out, { recursive: true });
const store = createStore(join(out, "raw"));
const rpc = createRpc(urls);
const chain = createChain(rpc, store);
const yahoo = createYahoo(store);
const log = m => process.stderr.write(`${new Date().toISOString()} ${m}\n`);

const { head, endpoints } = await rpc.probe();
log(`head ${head}; endpoints ${endpoints.map(e => `${e.host}[${e.caps.join(",")}]`).join(" ")}`);
if (!endpoints.some(e => e.caps.includes("archive"))) throw new Error("No archive-capable RPC: historical backfill impossible");

// Universe: official token allowlist only (symbols are not trusted). Deepest USDG pool per token,
// found through the official factory's getPool for each fee tier.
const allow = JSON.parse(readFileSync(resolve("config/universe/official-tokens.json"), "utf8"));
async function deepest(symbol, token) {
  let best = null;
  for (const fee of [100, 500, 3000, 10000]) {
    const pool = await chain.getPool(token, fee);
    if (!pool) continue;
    const liq = await chain.liquidity(pool, BigInt(head));
    if (!best || liq > best.liq) best = { symbol, token, pool, fee, liq, usdgIsToken0: (await chain.token0(pool)) === USDG };
  }
  return best;
}
const weth = await deepest("WETH", allow.gas_reference.address);
if (!weth || weth.token !== WETH) throw new Error("WETH/USDG pool not found; gas cannot be priced");
const legs = [];
for (const a of assets) {
  const entry = allow.tokens.find(t => t.symbol === a);
  if (!entry) throw new Error(`${a} is not in config/universe/official-tokens.json`);
  const l = await deepest(a, entry.address);
  if (!l) throw new Error(`No USDG pool for ${a}`);
  if ((await chain.symbol(l.token)).toUpperCase() !== a) throw new Error(`On-chain symbol of ${entry.address} is not ${a}`);
  legs.push({ ...l, sector: entry.sector });
}
for (const l of [...legs, weth]) l.decimals = await chain.decimals(l.token);
const feedDir = await store.once("chainlink/directory", async () => (await fetch("https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json", { signal: AbortSignal.timeout(15_000) })).json());
for (const l of legs) {
  const f = feedDir.find(x => x.docs?.assetClass === "Equity" && x.docs?.baseAsset === l.symbol);
  l.feed = f ? { address: f.proxyAddress, heartbeat: f.heartbeat } : null;
}
log(`legs ${legs.map(l => `${l.symbol}:${l.pool}(fee ${l.fee}, feed ${l.feed ? "yes" : "none"})`).join(" ")}`);

// Hour boundary blocks, each searched from the previous one.
const hours = [];
for (let t = from - LOOKBACK * HOUR; t <= through + HOUR; t += HOUR) hours.push(t);
const blocks = new Map();
let lower = 1n;
for (const t of hours) { const b = await chain.blockAt(t, BigInt(head), lower); blocks.set(t, b); lower = b; }
log(`resolved ${blocks.size} hour boundaries`);

const opts = l => ({ usdgIsToken0: l.usdgIsToken0, usdgDecimals: 6, stockDecimals: l.decimals });
const spyHourly = await yahoo.hourlyCloses("SPY", hours[0], through + HOUR);
const qqqHourly = await yahoo.hourlyCloses("QQQ", hours[0], through + HOUR);
const spyDaily = await yahoo.dailyCloses("SPY", hours[0], through + HOUR);
const underlying = Object.fromEntries(await Promise.all(legs.map(async l => [l.symbol, await yahoo.hourlyCloses(l.symbol, hours[0], through + HOUR)])));
const lastClose = (map, t) => { for (let k = t; k > t - 4 * 24 * HOUR; k -= HOUR) if (map.has(k)) return map.get(k); return null; };

// Prefetch every raw read in parallel into the write-once store; the deterministic pass below
// then reads only cached payloads.
async function pool(tasks, width = 8) {
  // Failed tasks are retried in later passes; results already stored are never refetched.
  let pending = tasks;
  for (let pass = 1; pending.length && pass <= 4; pass++) {
    let next = 0, done = 0;
    const failed = [];
    await Promise.all(Array.from({ length: width }, async () => {
      while (next < pending.length) {
        const task = pending[next++];
        try { await task(); } catch (e) { failed.push(task); log(`task failed (pass ${pass}): ${e.message.slice(0, 160)}`); }
        if (++done % 50 === 0) log(`pass ${pass}: ${done}/${pending.length}`);
      }
    }));
    pending = failed;
    if (pending.length) { log(`${pending.length} task(s) failed; retrying after a pause`); await new Promise(r => setTimeout(r, 15_000 * pass)); }
  }
  if (pending.length) throw new Error(`${pending.length} prefetch task(s) still failing; rerun to resume from the raw store`);
}
const tasks = [];
for (let i = 0; i + 1 < hours.length; i++) {
  const b0 = blocks.get(hours[i]), b1 = blocks.get(hours[i + 1]);
  tasks.push(() => chain.header(b1));
  tasks.push(() => chain.slot0(weth.pool, b1));
  for (const l of legs) {
    tasks.push(async () => { await chain.slot0(l.pool, b0); await chain.liquidity(l.pool, b0); });
    tasks.push(() => chain.swaps(l.pool, b0, b1));
    tasks.push(async () => { await chain.slot0(l.pool, b1); await chain.liquidity(l.pool, b1); if (l.feed) await chain.chainlinkAt(l.feed.address, b1); });
  }
}
await pool(tasks, 4);
log(`prefetch complete: ${tasks.length} tasks`);

const bars = [], points = [], counts = {};
for (const l of legs) {
  counts[l.symbol] = { hours: 0, filled: 0, disputed: 0, chainlink_stale_or_missing: 0, single_source_logs: 0, yahoo_compared: 0, yahoo_max_deviation: 0 };
  const legBars = [], depths = [];
  let stale = 0;
  for (let i = 0; i + 1 < hours.length; i++) {
    const t = hours[i], b0 = blocks.get(t), b1 = blocks.get(hours[i + 1]);
    const s0 = await chain.slot0(l.pool, b0), s1 = await chain.slot0(l.pool, b1);
    if (!s0 || !s1) { legBars.length = 0; depths.length = 0; continue; } // pool not deployed yet
    const swaps = await chain.swaps(l.pool, b0, b1);
    const bar = hourBar({ asset: l.symbol, openTs: t, openPrice: stockPriceUsd(s0, opts(l)), closePrice: stockPriceUsd(s1, opts(l)), tradePrices: swaps.map(s => stockPriceUsd(s.sqrtPriceX96, opts(l))), volumeUsd: swaps.reduce((v, s) => v + Math.abs(Number(l.usdgIsToken0 ? s.amount0 : s.amount1)) / 1e6, 0) });
    legBars.push(bar);
    const liq = await chain.liquidity(l.pool, b0);
    depths.push(depthUsd(liq, s0, 0.02));
    bars.push(bar); // lookback bars are written too: features need 48 closed bars before the first tick
    if (t < from - HOUR) continue;
    // Point at the bar's close (tick = t + 1h): state at block b1, flags from the hour that just closed.
    const tick = t + HOUR, k = legBars.length - 1;
    const cl = l.feed ? await chain.chainlinkAt(l.feed.address, b1) : null;
    const headerTs = Number((await chain.header(b1)).timestamp);
    const f = flags({ poolClose: bar.close, chainlink: cl && { price: cl.price, ageSeconds: headerTs - cl.updatedAt, heartbeat: l.feed.heartbeat }, trades: swaps.length, previousStaleTicks: stale });
    stale = f.stale_ticks;
    const yClose = underlying[l.symbol].get(tick);
    const yDev = yClose ? deviation(bar.close, yClose) : null;
    if (tick < from || tick > through) continue;
    const c = counts[l.symbol];
    c.hours++; c.filled += f.filled; c.disputed += f.disputed; c.chainlink_stale_or_missing += f.chainlink_status !== "fresh";
    if (swaps.length) c.single_source_logs++;
    if (yDev !== null) { c.yahoo_compared++; c.yahoo_max_deviation = Math.max(c.yahoo_max_deviation, yDev); }
    const blk = await chain.header(b1);
    const ethUsd = await chain.priceAt(weth.pool, b1, opts(weth));
    const gasUsd = Number(BigInt(blk.baseFeePerGas ?? "0x0") * GAS_PER_SWAP) / 1e18 * ethUsd;
    const depth1 = depthUsd(await chain.liquidity(l.pool, b1), s1, 0.02);
    const spyDay = spyDaily.filter(d => d.ts + 86_400_000 <= tick).map(d => d.close);
    points.push({
      market: { ts: tick, asset: l.symbol, open: bar.close, depth_usd: depth1, funding_bps_hour: 0, borrow_bps_day: 0, gas_usd: gasUsd, priority_usd: 0 },
      available_ts: tick,
      spy_return: benchmarkReturn(lastClose(spyHourly, tick - HOUR), spyHourly.get(tick) ?? null),
      qqq_return: benchmarkReturn(lastClose(qqqHourly, tick - HOUR), qqqHourly.get(tick) ?? null),
      stale_ticks: f.stale_ticks, gap_sigma: gapSigma(legBars, k), spread_ratio: spreadRatio(depths, k),
      regime: regime(spyDay), filled: f.filled, disputed: f.disputed,
    });
    points.at(-1).provenance = { block: b1.toString(), chainlink: cl, chainlink_deviation: f.chainlink_deviation, chainlink_status: f.chainlink_status, yahoo_close: yClose ?? null, yahoo_deviation: yDev, swaps: swaps.length };
    if (i % 24 === 0) log(`${l.symbol} ${new Date(tick).toISOString()} close ${bar.close.toFixed(2)} swaps ${swaps.length} cl ${cl?.price?.toFixed(2) ?? "-"} ${f.disputed ? "DISPUTED" : ""}`);
  }
}

// Runner input keeps only fields the Point schema accepts; provenance goes to its own file.
const strip = p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== "provenance"));
writeFileSync(join(out, "bars.jsonl"), bars.map(b => JSON.stringify(b)).join("\n") + "\n");
writeFileSync(join(out, "market.jsonl"), points.sort((a, b) => a.market.ts - b.market.ts || a.market.asset.localeCompare(b.market.asset)).map(p => JSON.stringify(strip(p))).join("\n") + "\n");
writeFileSync(join(out, "provenance.jsonl"), points.map(p => JSON.stringify({ ts: p.market.ts, asset: p.market.asset, ...p.provenance })).join("\n") + "\n");
const manifest = {
  generated_at: new Date().toISOString(), from: new Date(from).toISOString(), through: new Date(through).toISOString(), chain_id: 4663, head,
  methods: {
    ohlc: "open/close = Uniswap v3 slot0 at first block of each hour boundary; high/low include every Swap event price in the hour; volume = |USDG| traded",
    depth_usd: "USDG to move price +2% using active-tick liquidity (ignores tick crossings)",
    gas_usd: "block baseFee x 250000 gas x ETH/USDG pool price; priority fee 0",
    spread_ratio: "48h median depth / current depth (proxy; not an order-book spread)",
    regime: "SPY daily closes before the tick: vol_shock, gap_news, bull, bear, long_chop (services/ingest/core.mjs)",
    benchmarks: "Yahoo SPY/QQQ hourly; 0 when the exchange is closed",
    disputed: "pool close vs Chainlink-as-of-block deviation > 1% with fresh Chainlink",
    available_ts: "equals tick: historical backfill, not observed live; live ingestion must record real arrival time",
  },
  legs: legs.map(l => ({ symbol: l.symbol, token: l.token, pool: l.pool, fee: l.fee, feed: l.feed })),
  counts, endpoints: rpc.health(),
  logs_source: "single logs-capable endpoint; high/low/volume are not quorum-checked",
};
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
log(`wrote ${bars.length} bars, ${points.length} points to ${out}`);
console.log(JSON.stringify({ out, bars: bars.length, points: points.length, counts }, null, 2));
