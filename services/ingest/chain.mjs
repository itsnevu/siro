// Chain readers for ingestion. Every read goes through the quorum RPC and every response is kept
// in the write-once raw store before it is parsed.
import { stockPriceUsd } from "./core.mjs";

export const FACTORY = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa"; // Uniswap v3, official Robinhood Chain deployment
export const USDG = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
export const WETH = "0x0bd7d308f8e1639fab988df18a8011f41eacad73";
const SWAP_TOPIC = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";
const POOL_CREATED_TOPIC = "0x783cca1c0412dd0d695e784568c96da2e9c22ff989357a2e8b1d9b2b4e6b7118";
const hex = n => "0x" + BigInt(n).toString(16);
const word = (data, i) => BigInt("0x" + data.slice(2 + 64 * i, 2 + 64 * (i + 1)));
const signed = v => (v >= 2n ** 255n ? v - 2n ** 256n : v);
const addr = w => "0x" + w.slice(-40);

export function createChain(rpc, store) {
  // Archive state is quorum-checked when two archive endpoints exist; logs often have one source.
  const archiveQuorum = () => Math.min(2, rpc.endpoints.filter(e => e.caps.has("archive")).length);
  async function read(kind, key, method, params, need) {
    return store.once(`chain/${kind}/${key}`, async () => {
      const quorum = need === "logs" ? 1 : need === "archive" ? archiveQuorum() : 2;
      if (quorum === 0) throw new Error(`no endpoint can serve ${need}`);
      const r = await rpc.call(method, params, { need, quorum, timeout: need === "logs" ? 60_000 : 15_000 });
      return { method, params, result: r.value, agreed: r.agreed, dissent: r.dissent, quorum };
    });
  }
  const header = async n => (await read("block", String(n), "eth_getBlockByNumber", [hex(n), false], "head")).result;

  /** First block with timestamp >= ts (ms). Secant steps on the regular ~0.1 s block time, then a bounded walk. */
  async function blockAt(tsMs, head, lower = 1n) {
    const t = Math.ceil(tsMs / 1000);
    let lo = { n: lower };
    lo.ts = Number((await header(lo.n)).timestamp);
    if (t <= lo.ts) return lo.n;
    // Bracket from the lower bound using the ~0.1 s block time, widening until it covers t.
    let span = BigInt(Math.max(1_000, Math.ceil((t - lo.ts) / 0.1) * 2));
    let hi = { n: lo.n + span < head ? lo.n + span : head };
    hi.ts = Number((await header(hi.n)).timestamp);
    while (hi.ts < t && hi.n < head) {
      lo = hi; span *= 2n;
      hi = { n: lo.n + span < head ? lo.n + span : head };
      hi.ts = Number((await header(hi.n)).timestamp);
    }
    if (t > hi.ts) throw new Error("timestamp is in the future of the chain head");
    for (let i = 0; i < 40 && hi.n - lo.n > 1n; i++) {
      let guess = lo.n + BigInt(Math.floor(Number(hi.n - lo.n) * (t - lo.ts) / Math.max(1, hi.ts - lo.ts)));
      if (guess <= lo.n) guess = lo.n + 1n;
      if (guess >= hi.n) guess = hi.n - 1n;
      if (i % 2 === 1) guess = (lo.n + hi.n) / 2n; // alternate with bisection: guaranteed convergence
      const ts = Number((await header(guess)).timestamp);
      if (ts >= t) hi = { n: guess, ts }; else lo = { n: guess, ts };
    }
    return hi.n;
  }

  async function ethCall(to, data, block, kind) {
    return (await read(kind, `${to}-${data}-${block}`, "eth_call", [{ to, data }, hex(block)], "archive")).result;
  }
  async function slot0(pool, block) {
    const r = await ethCall(pool, "0x3850c7bd", block, "slot0");
    return r === "0x" ? null : word(r, 0);
  }
  async function liquidity(pool, block) { return word(await ethCall(pool, "0x1a686502", block, "liquidity"), 0); }
  async function decimals(token) { return Number(word((await read("decimals", token, "eth_call", [{ to: token, data: "0x313ce567" }, "latest"], "head")).result, 0)); }
  async function symbol(token) {
    const r = (await read("symbol", token, "eth_call", [{ to: token, data: "0x95d89b41" }, "latest"], "head")).result;
    const len = Number(word(r, 1));
    return Buffer.from(r.slice(2 + 128, 2 + 128 + len * 2), "hex").toString("utf8");
  }
  async function token0(pool) { return addr((await read("token0", pool, "eth_call", [{ to: pool, data: "0x0dfe1681" }, "latest"], "head")).result); }
  /** Chainlink answer as of a block: what any reader of the feed saw at that time. */
  async function chainlinkAt(feed, block) {
    const r = await ethCall(feed, "0xfeaf968c", block, "chainlink");
    if (r === "0x") return null;
    const dec = Number(word((await read("decimals", feed, "eth_call", [{ to: feed, data: "0x313ce567" }, "latest"], "head")).result, 0));
    return { price: Number(signed(word(r, 1))) / 10 ** dec, updatedAt: Number(word(r, 3)) };
  }
  /** Swap events in [from, to). Chunked; one logs-capable source (marked in the manifest). */
  async function swaps(pool, from, to, chunk = 20_000n) {
    const out = [];
    for (let a = from; a < to; a += chunk) {
      const b = a + chunk - 1n < to - 1n ? a + chunk - 1n : to - 1n;
      const logs = (await read("swaps", `${pool}-${a}-${b}`, "eth_getLogs", [{ address: pool, fromBlock: hex(a), toBlock: hex(b), topics: [SWAP_TOPIC] }], "logs")).result;
      for (const l of logs) out.push({ block: BigInt(l.blockNumber), amount0: signed(word(l.data, 0)), amount1: signed(word(l.data, 1)), sqrtPriceX96: word(l.data, 2) });
    }
    return out;
  }
  /** Every pool the official factory created against USDG, from on-chain events. */
  async function usdgPools(head, chunk = 2_000_000n) {
    const out = [];
    for (let a = 0n; a <= head; a += chunk) {
      const b = a + chunk - 1n < head ? a + chunk - 1n : head;
      const logs = (await read("poolcreated", `${a}-${b}`, "eth_getLogs", [{ address: FACTORY, fromBlock: hex(a), toBlock: hex(b), topics: [POOL_CREATED_TOPIC] }], "logs")).result;
      for (const l of logs) {
        const t0 = addr(l.topics[1]), t1 = addr(l.topics[2]);
        if (t0 !== USDG && t1 !== USDG) continue;
        out.push({ token: t0 === USDG ? t1 : t0, usdgIsToken0: t0 === USDG, fee: Number(BigInt(l.topics[3])), pool: addr(l.data.slice(0, 2 + 128)), createdBlock: BigInt(l.blockNumber) });
      }
    }
    return out;
  }
  /** Pool for (token, USDG, fee) from the official factory; null if none. */
  async function getPool(token, fee) {
    const pad = a => a.slice(2).toLowerCase().padStart(64, "0");
    const data = "0x1698ee82" + pad(token) + pad(USDG) + BigInt(fee).toString(16).padStart(64, "0");
    const r = (await read("getpool", `${token}-${fee}`, "eth_call", [{ to: FACTORY, data }, "latest"], "head")).result;
    const p = addr(r);
    return /^0x0{40}$/.test(p) ? null : p;
  }
  const priceAt = async (pool, block, opts) => { const s = await slot0(pool, block); return s ? stockPriceUsd(s, opts) : null; };
  return { getPool, blockAt, header, slot0, liquidity, decimals, symbol, token0, chainlinkAt, swaps, usdgPools, priceAt };
}
