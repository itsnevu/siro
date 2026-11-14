import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePriceCsv, runBacktest } from "../src/lib/backtest.ts";
import { validateWorkspace, DEFAULT_POLICY } from "../src/lib/workspace-model.ts";
const strategy = { id: "one", name: "One", policy: DEFAULT_POLICY, allocations: [{ token: "0x0000000000000000000000000000000000000001", symbol: "A", weightBps: 10000 }], rebalanceHours: 24, driftBps: 1, updatedAt: "2026-11-01T00:00:00Z" };
test("backtest uses supplied prices and charges entry costs", () => {
  const rows = parsePriceCsv("date,A\n2026-11-01,100\n2026-11-02,110", ["A"]);
  const result = runBacktest(strategy, rows, 1000, 100, 0);
  assert.ok(Math.abs(result.final - 1000 / 1.01 * 1.1) < 1e-8);
  assert.ok(Math.abs(result.costs - 1000 * 0.01 / 1.01) < 1e-8);
});
test("flat prices cannot create profit when rebalancing", () => {
  const s = { ...strategy, allocations: [{ ...strategy.allocations[0], weightBps: 5000 }, { token: "0x0000000000000000000000000000000000000002", symbol: "B", weightBps: 5000 }] };
  const result = runBacktest(s, parsePriceCsv("date,A,B\n2026-11-01,100,100\n2026-11-02,100,100", ["A", "B"]), 1000, 30, 50);
  assert.ok(result.final < 1000); assert.equal(result.rebalances, 0);
});
test("rebalance costs are self-financing and reduce NAV", () => {
  const s = { ...strategy, allocations: [{ ...strategy.allocations[0], weightBps: 5000 }, { token: "0x0000000000000000000000000000000000000002", symbol: "B", weightBps: 5000 }] };
  const rows = parsePriceCsv("date,A,B\n2026-11-01,100,100\n2026-11-02,200,100\n2026-11-03,100,100", ["A", "B"]);
  const free = runBacktest(s, rows, 1000, 0, 0), paid = runBacktest(s, rows, 1000, 30, 50);
  assert.equal(free.rebalances, 2); assert.ok(paid.costs > 0); assert.ok(paid.final < free.final); assert.ok(paid.maxDrawdownPct > 0);
});
test("CSV rejects invalid dates, duplicates, missing columns and zero prices", () => {
  for (const csv of ["date,A\n2026-02-30,1\n2026-03-01,2", "date,A\n2026-11-01,1\n2026-11-01,2", "date,B\n2026-11-01,1\n2026-11-02,2", "date,A\n2026-11-01,0\n2026-11-02,2"]) assert.throws(() => parsePriceCsv(csv, ["A"]));
});
test("workspace rejects invalid weights and orphan schedules", () => {
  const valid = { strategies: [strategy], schedules: [], settings: { displayName: "" } };
  assert.equal(validateWorkspace(valid).strategies.length, 1);
  assert.throws(() => validateWorkspace({ ...valid, strategies: [{ ...strategy, allocations: [{ ...strategy.allocations[0], weightBps: 100 }] }] }));
  assert.throws(() => validateWorkspace({ ...valid, schedules: [{ id: "bad", strategyId: "missing", intervalHours: 24, startsAt: strategy.updatedAt }] }));
});
