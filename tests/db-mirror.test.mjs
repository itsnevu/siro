import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { rowsFromJournal, rowsFromDaily, tickId, write } from "../services/db/mirror.mjs";

const journalPath = "data/real/smoke/journal.jsonl";

test("real journal maps to rows with tick_id idempotency keys and event-hash trace ids", { skip: !existsSync(journalPath) && "no real journal yet" }, () => {
  const events = readFileSync(journalPath, "utf8").trim().split("\n").map(l => JSON.parse(l));
  const rows = rowsFromJournal(events);
  assert.equal(rows.decisions.length, events.filter(e => e.kind === "decision").length);
  assert.equal(rows.fills.length, events.filter(e => e.kind === "fill").length);
  assert.equal(new Set(rows.decisions.map(d => `${d.tick_id}`)).size, rows.decisions.length, "tick_id unique per agent tick");
  assert.ok(rows.decisions.every(d => /^[0-9a-f]{64}$/.test(d.trace_id)));
  assert.equal(rows.decisions[0].tick_id, tickId(rows.decisions[0].agent_id, rows.decisions[0].tick_ts, rows.decisions[0].record.strategy_hash));
  // Reveals only for decisions whose reveal time has passed.
  assert.equal(rowsFromJournal(events, 0).reveals.length, 0);
});

test("a fill without a committed decision is rejected", () => {
  const events = [{ kind: "initialized", payload: { agent_id: "a" } }, { kind: "fill", event_hash: "x", payload: { fill_id: "f", decision_id: "missing" } }];
  assert.throws(() => rowsFromJournal(events), /no committed decision/);
});

test("writer is transactional and idempotent in its SQL (fake client)", async () => {
  const sql = [];
  const client = { query: async s => { sql.push(s); if (s.startsWith("INSERT INTO fills")) throw new Error("boom"); return {}; } };
  const journal = { agent: { agent_id: "a" }, versions: [], decisions: [{ decision_id: "d", tick_ts: "2026-11-12T00:00:00.000Z", tick_id: "t", agent_id: "a", agent_version: 1, commit_ts: "x", reveal_ts: "x", prev_hash: "p", commit_hash: "c", record: {}, trace_id: "h" }], reveals: [], vetoes: [], fills: [{}] };
  await assert.rejects(write(client, "0xA", { journal }), /boom/);
  assert.equal(sql.at(-1), "ROLLBACK");
  assert.ok(sql.filter(s => s.startsWith("INSERT")).every(s => /ON CONFLICT|WHERE NOT EXISTS/.test(s)));
  assert.ok(sql.some(s => s.includes("decisions_ensure_month")));
  assert.equal(rowsFromDaily([{ agent_id: "a", day: "d", pnl_daily: { gross_equity: 1, net_equity: 1, net_return: 0 }, reconciliation: { status: "reconciled" } }])[0].status, "reconciled");
});
