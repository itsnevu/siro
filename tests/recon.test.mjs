import test from "node:test";
import assert from "node:assert/strict";
import { derivedEquity, reconcile, publishable, auditEntry, nextRun, TOLERANCE } from "../services/recon/core.mjs";

const fills = [{ asset: "NVDA", quantity: 10, price: 170, fees_usd: 1, external_fees_usd: 0.1 }, { asset: "NVDA", quantity: -4, price: 175, fees_usd: 0.5 }];
const prices = { NVDA: 172 };

test("derived equity from fills and carry", () => {
  const d = derivedEquity({ initial: 10_000, fills, carry: [2], prices });
  assert.equal(d.units.NVDA, 6);
  assert.ok(Math.abs(d.cash - (10_000 - 1700 - 1.1 + 700 - 0.5 - 2)) < 1e-9);
  assert.ok(Math.abs(d.equity - (d.cash + 6 * 172)) < 1e-9);
  assert.throws(() => derivedEquity({ initial: 1, fills, carry: [], prices: {} }));
});

test("within tolerance reconciles; beyond 0.5% is unreconciled", () => {
  const derived = derivedEquity({ initial: 10_000, fills, carry: [], prices });
  const ok = reconcile({ agentId: "a", day: "2026-11-12", reported: { net_equity: derived.equity * (1 + TOLERANCE / 2) }, derived, onchain: null, prices });
  assert.equal(ok.status, "reconciled_offchain_only");
  const bad = reconcile({ agentId: "a", day: "2026-11-12", reported: { net_equity: derived.equity * 1.01 }, derived, onchain: null, prices });
  assert.equal(bad.status, "unreconciled");
});

test("on-chain units must match fills exactly; equity within tolerance", () => {
  const derived = derivedEquity({ initial: 10_000, fills, carry: [], prices });
  const good = reconcile({ agentId: "a", day: "d", reported: { net_equity: derived.equity }, derived, onchain: { units: { NVDA: 6 }, cash_usd: derived.cash }, prices });
  assert.equal(good.status, "reconciled");
  const missing = reconcile({ agentId: "a", day: "d", reported: { net_equity: derived.equity }, derived, onchain: { units: { NVDA: 5 }, cash_usd: derived.cash }, prices });
  assert.equal(missing.status, "unreconciled");
  assert.ok(missing.diffs.some(d => d.check === "units_NVDA"));
});

test("boards hide unreconciled and never-reconciled agents entirely", () => {
  const reports = [{ agent_id: "a", metrics: { net_return: 0.1 } }, { agent_id: "b", metrics: { net_return: 0.5 } }, { agent_id: "c", metrics: { net_return: 0.2 } }];
  const recs = [{ agent_id: "a", day: "2026-11-11", status: "unreconciled", worst_relative_diff: 0.02 }, { agent_id: "a", day: "2026-11-12", status: "reconciled" }, { agent_id: "b", day: "2026-11-12", status: "unreconciled", worst_relative_diff: 0.009 }];
  const out = publishable(reports, recs);
  assert.equal(out[0].hidden, false, "latest reconciliation of a passed");
  assert.equal(out[1].hidden, true);
  assert.equal(out[1].metrics, undefined, "no number leaks for a hidden agent");
  assert.equal(out[2].hidden, true);
  assert.match(out[2].reason, /never reconciled/);
});

test("audit entries require actor and reason; schedule is 00:05 UTC", () => {
  assert.throws(() => auditEntry({ who: "", when: 0, agentId: "a", field: "net_return", oldValue: 1, newValue: 2, reason: "x" }));
  const e = auditEntry({ who: "ops", when: Date.UTC(2026, 10, 13), agentId: "a", field: "net_return", oldValue: 0.12, newValue: 0.09, reason: "turnover bug" });
  assert.deepEqual([e.old_value, e.new_value], [0.12, 0.09]);
  assert.equal(nextRun(Date.UTC(2026, 10, 13, 0, 4)), Date.UTC(2026, 10, 13, 0, 5));
  assert.equal(nextRun(Date.UTC(2026, 10, 13, 0, 5)), Date.UTC(2026, 10, 14, 0, 5));
});
