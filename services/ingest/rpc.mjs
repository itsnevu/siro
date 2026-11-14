// Multi-endpoint JSON-RPC with capability probing, health tracking and quorum reads.
// A read succeeds only when at least `quorum` capable endpoints return byte-identical results.
// Endpoints are queried in parallel, so one dead endpoint costs no failover delay.
export class QuorumError extends Error {}

export const DEFAULT_ENDPOINTS = [
  "https://robinhood.rpc.pinax.network",
  "https://robinhood-rpc.publicnode.com",
  "https://rpc-robinhood.globalstake.io",
];

const PROBE_POOL = "0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3"; // NVDA/USDG 0.05%, Uniswap v3 on chain 4663
const SWAP_TOPIC = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";

export function createRpc(urls, { timeoutMs = 12_000, fetchImpl = fetch, retries = 3, backoffMs = 800, maxInFlight = 2, rateLimitRetries = 8 } = {}) {
  const endpoints = urls.map((url, i) => ({ id: `rpc${i}`, url, host: new URL(url).host, caps: new Set(), ok: 0, fail: 0, rateLimited: 0, lastError: null, latencyMs: null, inFlight: 0, waiting: [] }));
  let seq = 0;
  // Per-endpoint concurrency cap: free public tiers rate-limit bursts.
  const acquire = ep => (ep.inFlight < maxInFlight ? (ep.inFlight++, Promise.resolve()) : new Promise(r => ep.waiting.push(r)));
  const release = ep => { const next = ep.waiting.shift(); if (next) next(); else ep.inFlight--; };
  async function raw(ep, method, params, timeout = timeoutMs) {
    await acquire(ep);
    const started = Date.now();
    try {
      const r = await fetchImpl(ep.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++seq, method, params }), signal: AbortSignal.timeout(timeout) });
      const body = await r.json();
      if (body.error) throw new Error(`${body.error.code}: ${String(body.error.message).slice(0, 120)}`);
      ep.ok++; ep.latencyMs = Date.now() - started;
      return body.result;
    } catch (e) {
      ep.fail++; ep.lastError = e.message.replace(/https?:\/\/\S+/g, "[endpoint]");
      if (/rate limit|-32002|429|too many/i.test(e.message)) { ep.rateLimited++; e.rateLimited = true; }
      throw e;
    } finally { release(ep); }
  }
  // Transient failures (timeouts, rate limits) are retried with backoff. A *different answer* is
  // never retried away: it counts against agreement.
  async function rawRetry(ep, method, params, timeout) {
    for (let attempt = 0; ; attempt++) {
      try { return await raw(ep, method, params, timeout); }
      catch (e) {
        const limit = e.rateLimited ? rateLimitRetries : retries;
        if (attempt + 1 >= limit) throw e;
        // Rate limits get a longer, capped backoff; other failures retry quickly.
        await new Promise(r => setTimeout(r, e.rateLimited ? Math.min(30_000, 2_000 * 2 ** attempt) : backoffMs * 2 ** attempt));
      }
    }
  }
  async function probe() {
    const head = await Promise.any(endpoints.map(ep => raw(ep, "eth_blockNumber", []))).then(h => parseInt(h, 16));
    const old = "0x" + (head - 34_000 * 24 * 7).toString(16);
    await Promise.all(endpoints.map(async ep => {
      ep.caps.clear();
      if (await raw(ep, "eth_chainId", []).then(c => parseInt(c, 16) === 4663).catch(() => false)) ep.caps.add("head");
      if (!ep.caps.has("head")) return;
      if (await raw(ep, "eth_call", [{ to: PROBE_POOL, data: "0x3850c7bd" }, old]).then(Boolean).catch(() => false)) ep.caps.add("archive");
      const from = "0x" + (head - 2_000).toString(16), to = "0x" + head.toString(16);
      if (await raw(ep, "eth_getLogs", [{ address: PROBE_POOL, fromBlock: from, toBlock: to, topics: [SWAP_TOPIC] }]).then(Array.isArray).catch(() => false)) ep.caps.add("logs");
    }));
    return { head, endpoints: health() };
  }
  /** Agreed result from >= quorum endpoints with capability `need`. */
  async function call(method, params, { need = "head", quorum = 2, timeout = timeoutMs } = {}) {
    const capable = endpoints.filter(ep => ep.caps.has(need));
    if (capable.length < quorum) throw new QuorumError(`${method}: ${capable.length} endpoint(s) can serve "${need}", quorum ${quorum} required`);
    // Resolve as soon as one answer reaches quorum; slow endpoints keep running for health stats.
    return new Promise((resolve, reject) => {
      const groups = new Map(), ok = [];
      let settled = 0, done = false;
      const finish = () => {
        if (done || settled < capable.length) return;
        done = true;
        const failed = capable.filter(ep => !ok.some(r => r.ep === ep.host)).map(ep => `${ep.host}: ${ep.lastError}`).join("; ");
        reject(new QuorumError(`${method}: no ${quorum}-endpoint agreement (${ok.length}/${capable.length} answered, ${groups.size} distinct)${failed ? ` [${failed}]` : ""}`));
      };
      for (const ep of capable) {
        rawRetry(ep, method, params, timeout).then(v => {
          const r = { ep: ep.host, v, key: JSON.stringify(v) };
          ok.push(r);
          const g = [...(groups.get(r.key) ?? []), r];
          groups.set(r.key, g);
          if (!done && g.length >= quorum) {
            done = true;
            resolve({ value: v, agreed: g.map(x => x.ep), dissent: ok.filter(x => x.key !== r.key).map(x => x.ep) });
          }
        }, () => {}).finally(() => { settled++; finish(); });
      }
    });
  }
  function health() {
    return endpoints.map(({ host, caps, ok, fail, lastError, latencyMs }) => ({ host, caps: [...caps], ok, fail, lastError, latencyMs }));
  }
  return { probe, call, health, endpoints };
}
