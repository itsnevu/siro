import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, graveyardRow, sharpe, maxDrawdown, edgeBelowCostStreak, WARN_SCALE } from "../services/decay/core.mjs";

const DAY = 86_400_000;
// n days of returns ending at `end`; equity compounds.
function series(end, rets) {
  let eq = 100;
  return rets.map((r, i) => { eq *= 1 + r; return { ts: end - (rets.length - 1 - i) * DAY, net_return: r, net_equity: eq }; });
}
const baseline = { max_drawdown: 0.05, brier: 0.2 };
const badTrades = end => Array.from({ length: 25 }, (_, i) => ({ ts: end - i * DAY / 2, expected_edge_bps: 5, cost_estimate_bps: 10 }));

test("healthy agent stays active at full size", () => {
  const end = 200 * DAY;
  const s = evaluate({ today: end, days: series(end, Array.from({ length: 90 }, (_, i) => (i % 3 ? 0.004 : -0.002))), predictions: [], trades: [], baseline });
  assert.equal(s.status, "active");
  assert.equal(s.position_scale, 1);
});

test("one trigger alone does not warn; two triggers warn and halve positions", () => {
  const end = 200 * DAY;
  const losing = series(end, Array.from({ length: 90 }, () => -0.003)); // negative Sharpe + deep drawdown
  const s = evaluate({ today: end, days: losing, predictions: [], trades: [], baseline: { ...baseline, max_drawdown: 0.9 } });
  assert.equal(s.triggers.sharpe_negative_30d, true);
  assert.equal(s.status, "active", "only one trigger fired");
  const w = evaluate({ today: end, days: losing, predictions: [], trades: badTrades(end), baseline });
  assert.equal(w.status, "decay_warning");
  assert.equal(w.position_scale, WARN_SCALE);
  assert.equal(w.badge, "decay_warning");
});

test("warning for 60 days without recovery halts permanently; recovery clears the warning", () => {
  const start = 200 * DAY;
  let state = { status: "active", warning_since: null };
  for (let d = 0; d <= 60; d++) {
    const today = start + d * DAY;
    state = evaluate({ today, days: series(today, Array.from({ length: 90 }, () => -0.003)), predictions: [], trades: badTrades(today), baseline, prior: state });
  }
  assert.equal(state.status, "halted");
  assert.equal(state.reason, "decay_halt");
  assert.equal(state.position_scale, 0);
  const after = evaluate({ today: start + 100 * DAY, days: series(start + 100 * DAY, Array.from({ length: 90 }, () => 0.01)), predictions: [], trades: [], baseline, prior: state });
  assert.equal(after.status, "halted", "halted is permanent");
  const row = graveyardRow({ agent_id: "a", version: 1, strategy_hash: "h", mode: "paper", started: "2026-01-01" }, state);
  assert.equal(row.cause, "decay_halt");
  assert.ok(row.triggers.length >= 2);

  const warned = evaluate({ today: start, days: series(start, Array.from({ length: 90 }, () => -0.003)), predictions: [], trades: badTrades(start), baseline });
  const recovered = evaluate({ today: start + DAY, days: series(start + DAY, Array.from({ length: 90 }, () => 0.002)), predictions: [], trades: [], baseline, prior: warned });
  assert.equal(recovered.status, "active");
});

test("insufficient data never fires a trigger", () => {
  const end = 50 * DAY;
  const s = evaluate({ today: end, days: series(end, [-0.05, -0.05]), predictions: [{ ts: end, p: 0.9, up: false }], trades: [], baseline });
  assert.equal(s.triggers.sharpe_negative_30d, false);
  assert.equal(s.triggers.brier_worse_20pct, false);
});

test("helpers", () => {
  assert.equal(sharpe([0.01]), null);
  assert.equal(sharpe([0.01, 0.01]), null);
  assert.ok(Math.abs(maxDrawdown([100, 120, 90, 130]) - 0.25) < 1e-12);
  assert.equal(edgeBelowCostStreak([{ expected_edge_bps: 20, cost_estimate_bps: 5 }, { expected_edge_bps: 1, cost_estimate_bps: 5 }, { expected_edge_bps: 1, cost_estimate_bps: 5 }]), 2);
});
