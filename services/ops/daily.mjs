// Daily job (00:05 UTC): pnl_daily, reconciliation (phase 17) and decay evaluation (phase 16)
// for one runner journal. Output is appended to <out>/daily.jsonl; the decay state is carried
// forward from the last line, so `halted` stays permanent across runs.
//
//   node services/ops/daily.mjs --journal JOURNAL.jsonl --market MARKET.jsonl --out DIR [--day YYYY-MM-DD] [--onchain BALANCES.json]
//
// --market is the same point file the runner used; day-end prices come from it at the last valuation.
//
// --onchain {cash_usd, units:{ASSET:n}} is required for live agents; without it the result is
// "reconciled_offchain_only" (paper/backtest), never "reconciled".
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { derivedEquity, reconcile } from "../recon/core.mjs";
import { evaluate, graveyardRow } from "../decay/core.mjs";
import { mirrorToPostgres } from "../db/mirror.mjs";

const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const journalPath = resolve(arg("journal") ?? "");
const out = resolve(arg("out") ?? ".data/daily");
const DAY = 86_400_000;
const day = arg("day") ?? new Date(Date.now() - DAY).toISOString().slice(0, 10);
const end = Date.parse(`${day}T00:00:00Z`) + DAY;
if (!existsSync(journalPath) || !Number.isFinite(end)) throw new Error("usage: --journal JOURNAL.jsonl --out DIR [--day YYYY-MM-DD]");

const events = readFileSync(journalPath, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const init = events.find(e => e.kind === "initialized")?.payload;
if (!init) throw new Error("journal has no initialized event");
const upto = events.filter(e => e.ts < end);
const valuations = upto.filter(e => e.kind === "valuation").map(e => e.payload);
if (!valuations.length) throw new Error(`no valuation before ${day}`);

// pnl_daily: last valuation of each UTC day.
const daily = new Map();
for (const v of valuations) daily.set(new Date(v.ts).toISOString().slice(0, 10), v);
const days = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
const series = days.map(([d, v], i) => ({ ts: Date.parse(`${d}T00:00:00Z`), day: d, net_equity: v.net_equity, gross_equity: v.gross_equity, net_return: v.net_equity / (i ? days[i - 1][1].net_equity : init.initial_usd) - 1 }));
const today = series.at(-1);

// Reconciliation: equity re-derived from fills and carry at the last observed prices.
const fills = upto.filter(e => e.kind === "fill").map(e => e.payload);
const carry = upto.filter(e => e.kind === "carry").map(e => e.payload.cost_usd);
const lastValuationTs = daily.get(today.day).ts;
const marketPath = resolve(arg("market") ?? "");
if (!existsSync(marketPath)) throw new Error("--market MARKET.jsonl is required: day-end prices must match the runner's inputs");
const prices = {};
const points = readFileSync(marketPath, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const byTick = new Map();
for (const p of points) {
  if (p.market.ts === lastValuationTs) prices[p.market.asset] = p.market.open;
  byTick.set(p.market.ts, [...(byTick.get(p.market.ts) ?? []), p]);
}
// A decision's asset is recovered from universe_snapshot_hash = sha256(JCS([asset, available_ts])).
const sha = s => createHash("sha256").update(s).digest("hex");
const assetOf = d => (byTick.get(Date.parse(d.tick_ts)) ?? []).find(p => sha(JSON.stringify([p.market.asset, p.available_ts])) === d.universe_snapshot_hash);
const derived = derivedEquity({ initial: init.initial_usd, fills, carry, prices });
const onchain = arg("onchain") ? JSON.parse(readFileSync(resolve(arg("onchain")), "utf8")) : null;
const recon = reconcile({ agentId: init.agent_id, day: today.day, reported: { net_equity: today.net_equity }, derived, onchain, prices });

// Decay: predictions resolve against the agent's own decisions; trades carry edge vs cost.
const decisions = upto.filter(e => e.kind === "decision").map(e => e.payload);
// Predictions resolve on the runner's own prices: open at tick vs open at tick + horizon.
const predictions = decisions.flatMap(d => {
  const at = assetOf(d);
  if (!at) return [];
  const endTs = Date.parse(d.tick_ts) + d.horizon_h * 3_600_000;
  if (endTs >= end) return [];
  const later = (byTick.get(endTs) ?? []).find(p => p.market.asset === at.market.asset);
  return later ? [{ ts: endTs, p: d.predicted_prob_up, up: later.market.open > at.market.open }] : [];
});
const trades = decisions.filter(d => d.action !== "hold").map(d => ({ ts: Date.parse(d.tick_ts), expected_edge_bps: d.expected_edge_bps, cost_estimate_bps: d.cost_estimate_bps }));
const report = [...events].reverse().find(e => e.kind === "report")?.payload;
const baseline = { max_drawdown: report?.metrics?.max_drawdown ?? 0, brier: report?.calibration?.brier ?? 0 };
mkdirSync(out, { recursive: true });
const file = join(out, "daily.jsonl");
const previous = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(r => r.agent_id === init.agent_id).at(-1) : null;
const decay = evaluate({ today: end - 1, days: series, predictions, trades, baseline, prior: previous?.decay ?? undefined });

const row = {
  agent_id: init.agent_id, day: today.day, mode: init.mode,
  pnl_daily: { gross_equity: today.gross_equity, net_equity: today.net_equity, net_return: today.net_return },
  reconciliation: recon, decay,
  graveyard: decay.status === "halted" && previous?.decay?.status !== "halted" ? graveyardRow({ agent_id: init.agent_id, version: report?.agent_version, strategy_hash: init.strategy_hash, mode: init.mode, started: new Date(events[0].ts).toISOString() }, decay) : null,
  resolved_predictions: predictions.length,
};
appendFileSync(file, JSON.stringify(row) + "\n");
console.log(JSON.stringify({ agent_id: row.agent_id, day: row.day, recon: recon.status, worst: recon.worst_relative_diff, decay: decay.status }));

// Mirror journal, anchors and the daily row into Postgres when DATABASE_URL is set (phase 12).
if (process.env.DATABASE_URL) {
  const m = await mirrorToPostgres({ journal: journalPath, daily: file, anchor: process.env.SIRO_ANCHOR_JOURNAL, owner: arg("owner") ?? "unknown" });
  console.log(JSON.stringify({ postgres_mirror: m.ok ? "ok" : m.reason }));
}
