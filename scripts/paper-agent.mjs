// Writes the scheduler config for a paper agent over ingested real data (services/ingest/backfill.mjs).
//   node scripts/paper-agent.mjs --data DIR --journal FILE.jsonl --agent ID --from ISO_HOUR --out CONFIG.json
// Strategy parameters are the fixed, untrained z-score rule from scripts/real-backtest.mjs. Paper mode
// fills against real prices and real costs but never sends a transaction. Not a strategy claim.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const data = resolve(arg("data") ?? ""), journal = resolve(arg("journal") ?? ""), agent = arg("agent") ?? "", out = resolve(arg("out") ?? "");
const from = Date.parse(arg("from") ?? "");
if (!arg("data") || !arg("journal") || !/^[a-z0-9-]{3,40}$/.test(agent) || !Number.isFinite(from) || from % 3_600_000 || !arg("out"))
  throw new Error("usage: --data DIR --journal FILE --agent id --from ISO_HOUR --out CONFIG.json");
const manifest = JSON.parse(readFileSync(join(data, "manifest.json"), "utf8"));
const bin = name => resolve(process.env.SIRO_BIN_DIR ?? "target/release", name);

const strategy = (asset, i) => ({
  agent_id: `${agent}-${asset.toLowerCase()}`, version: 1, parent_version: null, asset,
  entry_z: -1.0, exit_z: 0.5, max_weight: 0.25, horizon_h: 4,
  logistic_intercept: 0, logistic_z: -0.6, logistic_rsi: 0, up_move_bps: 80, down_move_bps: 60,
  trained_model_hash: createHash("sha256").update(`untrained-fixed-rule-${i}`).digest("hex"),
  stop_loss_pct: 0.08,
});
const config = {
  agent_id: agent, version: 1, parent_version: null,
  legs: manifest.legs.map((l, i) => ({
    strategy: strategy(l.symbol, i),
    venue: { protocol_bps: 0, lp_bps: l.fee / 100, slippage_k: 200, calibration_id: "uniswap-v3-depth-2pct-definition" },
    sector: l.symbol,
  })),
  initial_usd: 10_000, from, through: from, mode: "paper", asset_class: "tokenized_equity", risk_profile: "safe-defaults",
  internal: false, bars: join(data, "bars.parquet"), market_data: join(data, "market.jsonl"), journal,
  risk_program: bin("riskengine"), seed: 7, bootstrap_block: 5,
};
writeFileSync(out, JSON.stringify(config, null, 2));
console.log(`wrote ${out}: ${config.legs.length} legs, paper, from ${new Date(from).toISOString()}`);
