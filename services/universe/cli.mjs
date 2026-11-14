// Build an immutable universe version from live chain data.
//   node services/universe/cli.mjs build [--effective-from 2026-12-01T00:00:00Z] [--dir data/universe]
//   node services/universe/cli.mjs in-force --at ISO [--dir data/universe]
//   node services/universe/cli.mjs check --assets NVDA,AAPL --at ISO   (hand-picked badge)
// Versions are written once (flag wx); a rule or member change produces a new version file.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRpc, DEFAULT_ENDPOINTS } from "../ingest/rpc.mjs";
import { createChain, USDG } from "../ingest/chain.mjs";
import { createStore } from "../ingest/store.mjs";
import { depthUsd } from "../ingest/core.mjs";
import { version, inForce, handPicked } from "./core.mjs";

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const dir = resolve(arg("dir") ?? "data/universe");
const load = () => (existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith(".json")).map(f => JSON.parse(readFileSync(join(dir, f), "utf8"))) : []);
const cmd = process.argv[2];

if (cmd === "build") {
  try { process.loadEnvFile(".env.local"); } catch { /* optional */ }
  const now = new Date();
  const effective = arg("effective-from") ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const urls = [...(process.env.ALCHEMY_RPC_URL_4663 ? [process.env.ALCHEMY_RPC_URL_4663] : []), ...DEFAULT_ENDPOINTS];
  const rpc = createRpc(urls);
  const { head } = await rpc.probe();
  const chain = createChain(rpc, createStore(join(dir, "raw")));
  const allow = JSON.parse(readFileSync("config/universe/official-tokens.json", "utf8"));
  const candidates = [];
  for (const t of allow.tokens.filter(t => !t.delisted)) {
    let best = null;
    for (const fee of [100, 500, 3000, 10000]) {
      const pool = await chain.getPool(t.address, fee);
      if (!pool) continue;
      const s = await chain.slot0(pool, BigInt(head));
      if (!s) continue;
      const usdgIsToken0 = (await chain.token0(pool)) === USDG;
      if (!usdgIsToken0) continue; // depth formula assumes USDG is token0; skip rather than misprice
      const d = depthUsd(await chain.liquidity(pool, BigInt(head)), s, 0.02);
      if (!best || d > best.depth_usd) best = { symbol: t.symbol, address: t.address, sector: t.sector, pool, depth_usd: Math.round(d) };
    }
    if (best) candidates.push(best);
  }
  const v = version({ effectiveFrom: Date.parse(effective), candidates, observedAt: `block ${head} ${new Date().toISOString()}`, observedAtMs: Date.now() });
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${v.effective_from.slice(0, 10)}-${v.universe_version}.json`);
  try { writeFileSync(file, JSON.stringify(v, null, 2), { flag: "wx" }); console.log(`wrote ${file}`); }
  catch (e) { if (e.code !== "EEXIST") throw e; console.log(`unchanged: ${file} already exists`); }
  console.log(JSON.stringify({ universe_version: v.universe_version, effective_from: v.effective_from, members: v.members, candidates }, null, 2));
} else if (cmd === "in-force") {
  console.log(JSON.stringify(inForce(load(), Date.parse(arg("at") ?? new Date().toISOString())), null, 2));
} else if (cmd === "check") {
  const v = inForce(load(), Date.parse(arg("at") ?? new Date().toISOString()));
  const assets = (arg("assets") ?? "").split(",").filter(Boolean);
  console.log(JSON.stringify({ universe_version: v?.universe_version ?? null, hand_picked: handPicked(assets, v), automatic: v?.members.map(m => m.symbol) ?? [] }));
} else {
  console.error("usage: cli.mjs build|in-force|check");
  process.exitCode = 2;
}
