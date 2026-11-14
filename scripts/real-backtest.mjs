// Backtest on ingested real data with the phase 18 safe defaults.
//   node scripts/real-backtest.mjs --data data/real/smoke [--from ISO] [--through ISO]
// The strategy parameters are a fixed, untrained z-score rule. The run proves the pipeline on real
// prices and real costs; it is not a strategy claim, and its report says so.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const data = resolve(arg("data") ?? "data/real/smoke");
const manifest = JSON.parse(readFileSync(join(data, "manifest.json"), "utf8"));
const bin = name => resolve("target/debug", name + (process.platform === "win32" ? ".exe" : ""));
for (const b of ["replay", "riskengine"]) if (!existsSync(bin(b))) throw new Error(`build ${b} first: cargo build --workspace`);
const run = (args, env = {}) => {
  const r = spawnSync(bin("replay"), args, { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 50_000_000 });
  if (r.status !== 0) throw new Error(`replay ${args[0]} failed: ${r.stderr.trim().split("\n").at(-1)}`);
  return r.stdout;
};

const H = 3_600_000;
const parquet = join(data, "bars.parquet");
if (!existsSync(parquet)) run(["ingest", join(data, "bars.jsonl"), parquet]);
const ticks = readFileSync(join(data, "market.jsonl"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l).market.ts);
const from = arg("from") ? Date.parse(arg("from")) : Math.min(...ticks);
const through = arg("through") ? Date.parse(arg("through")) : Math.max(...ticks);

const policy = join(data, "risk-policy.json");
writeFileSync(policy, JSON.stringify({ max_weight: 0.25, target_vol_pct: 1.0, risk_units_per_weight: 100, permit_ttl_ms: 5000 }));
const strategy = (asset, i) => ({
  agent_id: `real-smoke-${asset.toLowerCase()}`, version: 1, parent_version: null, asset,
  entry_z: -1.0, exit_z: 0.5, max_weight: 0.25, horizon_h: 4,
  logistic_intercept: 0, logistic_z: -0.6, logistic_rsi: 0, up_move_bps: 80, down_move_bps: 60,
  trained_model_hash: createHash("sha256").update(`untrained-fixed-rule-${i}`).digest("hex"),
  stop_loss_pct: 0.08,
});
const config = {
  agent_id: "real-smoke-portfolio", version: 1, parent_version: null,
  legs: manifest.legs.map((l, i) => ({
    strategy: strategy(l.symbol, i),
    // lp_bps = pool fee tier; slippage_k = 200 because depth_usd is defined as the notional that moves price 2%.
    venue: { protocol_bps: 0, lp_bps: l.fee / 100, slippage_k: 200, calibration_id: "uniswap-v3-depth-2pct-definition" },
    sector: l.symbol,
  })),
  initial_usd: 10_000, from, through, mode: "backtest", asset_class: "tokenized_equity", risk_profile: "safe-defaults",
  internal: true, bars: parquet, market_data: join(data, "market.jsonl"), journal: join(data, "journal.jsonl"),
  risk_program: bin("riskengine"), seed: 7, bootstrap_block: 5,
};
if (existsSync(config.journal)) rmSync(config.journal);
const file = join(data, "portfolio.json");
writeFileSync(file, JSON.stringify(config, null, 2));
const report = JSON.parse(run(["portfolio", file], { SIRO_RISK_POLICY: policy, SIRO_RISK_MAC_KEY: createHash("sha256").update("local-backtest-only").digest("hex").repeat(1), SIRO_KILL_FILE: join(data, "KILL-absent") }));
writeFileSync(join(data, "report.json"), JSON.stringify({ ...report, note: "Real prices and costs; untrained fixed parameters. Not a strategy claim." }, null, 2));
const j = readFileSync(config.journal, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const count = k => j.filter(e => e.kind === k).length;
console.log(JSON.stringify({
  window: [new Date(from).toISOString(), new Date(through).toISOString()],
  observations: report.observations, decisions: count("decision"), orders: count("order"), fills: count("fill"), cancels: count("cancel"),
  vetoes: j.filter(e => e.kind === "risk_assessment" && e.payload.veto.length).flatMap(e => e.payload.veto.map(v => v.code)).reduce((m, c) => ({ ...m, [c]: (m[c] ?? 0) + 1 }), {}),
  gross_return: report.metrics.gross_return, net_return: report.metrics.net_return, max_drawdown: report.metrics.max_drawdown,
}, null, 2));
