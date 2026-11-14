import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkspace } from "../src/lib/workspace-model.ts";

const vault = "0x" + "ab".repeat(20);
const ws = schedule => ({ strategies: [], schedules: [schedule], settings: { displayName: "" } });
const base = { id: "s1", strategyId: "", intervalHours: 1, startsAt: "2026-01-01T00:00:00Z", vault, adapter: "", enabled: false };

test("only engine-linked schedules can be enabled", () => {
  assert.equal(validateWorkspace(ws({ ...base, engineJobId: "eth-1h", enabled: true })).schedules[0].enabled, true);
  assert.throws(() => validateWorkspace(ws({ ...base, strategyId: "missing", enabled: true })));
  assert.throws(() => validateWorkspace(ws({ ...base, engineJobId: "eth-1h", enabled: true, vault: "" })), /vault/);
  assert.throws(() => validateWorkspace(ws({ ...base, engineJobId: "../etc", enabled: false })), /engine job id/);
});

test("paused engine schedule round-trips its job id; legacy shape is unchanged", () => {
  assert.equal(validateWorkspace(ws({ ...base, engineJobId: "eth-1h" })).schedules[0].engineJobId, "eth-1h");
  const strategy = { id: "st", name: "Mix", allocations: [{ token: "0x" + "cd".repeat(20), symbol: "X", weightBps: 10000 }], policy: { maxTradeBps: 1000, maxAllocationBps: 2500, maxDailyLossBps: 500, maxSlippageBps: 100, cooldown: 3600, maxOracleDelay: 86400 }, rebalanceHours: 24, driftBps: 100, updatedAt: "2026-01-01T00:00:00Z" };
  const legacy = validateWorkspace({ strategies: [strategy], schedules: [{ ...base, strategyId: "st" }], settings: { displayName: "" } }).schedules[0];
  assert.equal("engineJobId" in legacy, false);
  assert.throws(() => validateWorkspace({ strategies: [strategy], schedules: [{ ...base, strategyId: "st", enabled: true }], settings: { displayName: "" } }), /validated engine job/);
});
