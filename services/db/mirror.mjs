// Phase 12: mirror append-only journals into Postgres. The journals stay the source of truth;
// Postgres is a queryable, append-only copy. Every insert is idempotent (ON CONFLICT DO NOTHING),
// so rerunning a sync never duplicates or rewrites rows.
//
//   DATABASE_URL=postgres://siro_owner:...@127.0.0.1:5432/siro \
//   node services/db/mirror.mjs --journal J.jsonl [--anchor A.jsonl] [--daily D.jsonl] --owner 0xOWNER
import { createHash } from "node:crypto";

/**
 * Phase 11 idempotency key: sha256(agent_id || tick_ts || strategy_hash). The spec's
 * sha256(agent_id || tick_ts) collides for portfolio agents, which commit one decision per leg per
 * tick; the leg's strategy hash separates them (ADR 0006).
 */
export const tickId = (agentId, tickTs, strategyHash) => createHash("sha256").update(`${agentId}${tickTs}${strategyHash}`).digest("hex");

/** Map runner journal events to table rows. Pure; trace_id is the source event hash. */
export function rowsFromJournal(events, now = Date.now()) {
  const init = events.find(e => e.kind === "initialized")?.payload;
  if (!init) throw new Error("journal has no initialized event");
  const decisions = [], reveals = [], vetoes = [], fills = [], versions = new Map();
  const decisionOf = new Map();
  for (const e of events) {
    if (e.kind === "decision") {
      const d = e.payload;
      decisionOf.set(d.decision_id, d);
      versions.set(`${d.agent_id}:${d.agent_version}`, { agent_id: d.agent_id, version: d.agent_version, parent_version: d.parent_version, strategy_hash: d.strategy_hash });
      decisions.push({ decision_id: d.decision_id, tick_ts: d.tick_ts, tick_id: tickId(d.agent_id, d.tick_ts, d.strategy_hash), agent_id: d.agent_id, agent_version: d.agent_version, commit_ts: d.commit_ts, reveal_ts: d.reveal_ts, prev_hash: d.prev_hash, commit_hash: d.commit_hash, record: d, trace_id: e.event_hash });
      if (Date.parse(d.reveal_ts) <= now) reveals.push({ decision_id: d.decision_id, tick_ts: d.tick_ts, revealed_at: d.reveal_ts, trace_id: e.event_hash });
      for (const v of d.risk_veto) vetoes.push({ decision_id: d.decision_id, code: v.code, observed: v.observed, limit_value: v.limit, at: d.commit_ts, trace_id: e.event_hash });
    }
    if (e.kind === "fill") {
      const f = e.payload;
      if (!decisionOf.has(f.decision_id)) throw new Error(`fill ${f.fill_id} has no committed decision`);
      fills.push({ fill_id: f.fill_id, decision_id: f.decision_id, asset: f.asset, ts: new Date(f.ts).toISOString(), quantity: f.quantity, price: f.price, fees_usd: f.fees_usd, external_fees_usd: f.external_fees_usd ?? 0, slippage_usd: f.slippage_usd, tx_hash: null, trace_id: e.event_hash });
    }
  }
  return { agent: { agent_id: init.agent_id }, versions: [...versions.values()], decisions, reveals, vetoes, fills };
}

export function rowsFromAnchors(events) {
  return events.filter(e => e.kind === "witness_confirmed" || e.kind === "anchor_confirmed").map(e => {
    const p = e.payload;
    return { kind: e.kind === "witness_confirmed" ? "witness" : "daily", root: p.root, day: p.day ?? null, leaves: p.leaves ?? null, chain_id: p.chain_id, tx_hash: p.tx_hash, block_number: Number(p.block_number), block_ts: new Date(p.block_timestamp_ms ?? p.confirmed_at).toISOString(), confirmations: p.confirmations };
  });
}

export function rowsFromDaily(lines) {
  return lines.map(r => ({ agent_id: r.agent_id, day: r.day, gross_equity: r.pnl_daily.gross_equity, net_equity: r.pnl_daily.net_equity, net_return: r.pnl_daily.net_return, status: r.reconciliation.status, trace_id: createHash("sha256").update(JSON.stringify(r)).digest("hex") }));
}

/** Insert rows idempotently. `client` is a connected pg Client. */
export async function write(client, owner, { journal, anchors = [], daily = [] }) {
  const q = (sql, params) => client.query(sql, params);
  await q("BEGIN");
  try {
    await q("INSERT INTO agents(agent_id, owner_address) VALUES($1,$2) ON CONFLICT DO NOTHING", [journal.agent.agent_id, owner.toLowerCase()]);
    for (const v of journal.versions) await q("INSERT INTO agent_versions(agent_id,version,parent_version,strategy_hash,config) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [v.agent_id, v.version, v.parent_version, v.strategy_hash, JSON.stringify({ strategy_hash: v.strategy_hash })]);
    const months = new Set(journal.decisions.map(d => d.tick_ts.slice(0, 7)));
    for (const m of months) await q("SELECT decisions_ensure_month($1::date)", [`${m}-01`]);
    for (const d of journal.decisions) await q("INSERT INTO decisions(decision_id,tick_ts,tick_id,agent_id,agent_version,commit_ts,reveal_ts,prev_hash,commit_hash,record,trace_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING", [d.decision_id, d.tick_ts, d.tick_id, d.agent_id, d.agent_version, d.commit_ts, d.reveal_ts, d.prev_hash, d.commit_hash, JSON.stringify(d.record), d.trace_id]);
    for (const r of journal.reveals) await q("INSERT INTO reveals(decision_id,tick_ts,revealed_at,trace_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING", [r.decision_id, r.tick_ts, r.revealed_at, r.trace_id]);
    for (const f of journal.fills) await q("INSERT INTO fills(fill_id,decision_id,asset,ts,quantity,price,fees_usd,external_fees_usd,slippage_usd,tx_hash,trace_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING", [f.fill_id, f.decision_id, f.asset, f.ts, f.quantity, f.price, f.fees_usd, f.external_fees_usd, f.slippage_usd, f.tx_hash, f.trace_id]);
    // Vetoes have no natural key: insert only for decisions that had none recorded yet.
    for (const v of journal.vetoes) await q("INSERT INTO risk_vetoes(decision_id,code,observed,limit_value,at,trace_id) SELECT $1,$2,$3,$4,$5,$6 WHERE NOT EXISTS (SELECT 1 FROM risk_vetoes WHERE decision_id=$1 AND code=$2)", [v.decision_id, v.code, v.observed, v.limit_value, v.at, v.trace_id]);
    for (const a of anchors) await q("INSERT INTO anchors(kind,root,day,leaves,chain_id,tx_hash,block_number,block_ts,confirmations) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING", [a.kind, a.root, a.day, a.leaves && JSON.stringify(a.leaves), a.chain_id, a.tx_hash, a.block_number, a.block_ts, a.confirmations]);
    // pnl_daily is the only mutable mirror: a later reconciliation of the same day may change status.
    for (const p of daily) await q("INSERT INTO pnl_daily(agent_id,day,gross_equity,net_equity,net_return,status,trace_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (agent_id,day) DO UPDATE SET status=EXCLUDED.status, net_equity=EXCLUDED.net_equity, gross_equity=EXCLUDED.gross_equity, net_return=EXCLUDED.net_return, trace_id=EXCLUDED.trace_id", [p.agent_id, p.day, p.gross_equity, p.net_equity, p.net_return, p.status, p.trace_id]);
    await q("COMMIT");
  } catch (e) { await q("ROLLBACK"); throw e; }
}

if (process.argv[1]?.endsWith("mirror.mjs")) {
  const { readFileSync, existsSync } = await import("node:fs");
  const pg = (await import("pg")).default;
  const arg = n => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const lines = p => (p && existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : []);
  if (!process.env.DATABASE_URL || !arg("journal") || !arg("owner")) throw new Error("DATABASE_URL, --journal and --owner are required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const journal = rowsFromJournal(lines(arg("journal")));
    await write(client, arg("owner"), { journal, anchors: rowsFromAnchors(lines(arg("anchor"))), daily: rowsFromDaily(lines(arg("daily"))) });
    console.log(JSON.stringify({ agent: journal.agent.agent_id, decisions: journal.decisions.length, reveals: journal.reveals.length, fills: journal.fills.length }));
  } finally { await client.end(); }
}
