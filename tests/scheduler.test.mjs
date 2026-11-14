import test from "node:test";
import assert from "node:assert/strict";
import { HOUR, dueTick, validateRegistry, activations, classify, plan, derivedConfig } from "../services/scheduler/core.mjs";

const vault = "0x" + "ab".repeat(20);
const registry = validateRegistry([{ id: "eth-1h", name: "ETH hourly", chain_id: 1, vault, config: "c.json" }]);
const schedule = (over = {}) => ({ id: "s1", strategyId: "", intervalHours: 1, startsAt: "2026-01-01T00:00:00Z", vault, adapter: "", enabled: true, engineJobId: "eth-1h", ...over });

test("due tick waits for ingestion delay after the hourly close", () => {
  assert.equal(dueTick(10 * HOUR + 60_000, 120_000), 9 * HOUR);
  assert.equal(dueTick(10 * HOUR + 180_000, 120_000), 10 * HOUR);
  assert.throws(() => dueTick(1, HOUR));
});

test("registry rejects malformed jobs and duplicate ids", () => {
  assert.throws(() => validateRegistry([{ id: "x", name: "x", chain_id: 1, vault: "0x0", config: "c" }]));
  assert.throws(() => validateRegistry([...registry, ...registry]));
  assert.throws(() => validateRegistry([{ id: "x", name: "x", chain_id: 1, vault, config: "c", env: { PATH: "/evil" } }]));
  assert.throws(() => validateRegistry([{ id: "x", name: "x", chain_id: 1, vault, config: "c", env: { SIRO_RISK_MAC_KEY: "00" } }]), /Invalid/, "secrets never live in the registry");
  assert.throws(() => validateRegistry([{ id: "x", name: "x", chain_id: 1, vault, config: "c", command: "study" }]));
  assert.equal(validateRegistry([{ id: "x", name: "x", chain_id: 1, vault, config: "c", command: "portfolio" }])[0].command, "portfolio");
  assert.equal(registry[0].command, "run");
});

test("activation requires enabled schedule naming the job, on its chain, for its vault", () => {
  const ws = s => [{ address: "0xOwner", chain: 1, workspace: { schedules: [s] } }];
  assert.equal(activations(registry, ws(schedule())).get("eth-1h").length, 1);
  assert.equal(activations(registry, ws(schedule({ enabled: false }))).size, 0);
  assert.equal(activations(registry, ws(schedule({ vault: "0x" + "cd".repeat(20) }))).size, 0, "another vault cannot activate");
  assert.equal(activations(registry, [{ address: "0xOwner", chain: 2, workspace: { schedules: [schedule()] } }]).size, 0, "wrong chain");
  assert.equal(activations(registry, ws(schedule({ engineJobId: "unknown" }))).size, 0);
});

test("runner exits map to statuses; only success advances", () => {
  assert.deepEqual(classify(0, ""), { status: "ok", advance: true });
  assert.equal(classify(1, "Error: kill switch halted runner").status, "halted");
  assert.equal(classify(1, "live_receipt_uncertain").status, "halted");
  assert.equal(classify(1, "frozen strategy failed the public paper/live release gate").status, "gate_failed");
  assert.equal(classify(1, "point-in-time depth/fees/benchmark data missing").status, "waiting_data");
  assert.equal(classify(1, "paper mode requires recent observed market data").status, "stalled");
  assert.deepEqual(classify(1, "segfault"), { status: "error", advance: false });
});

test("plan: idle without activation, stopped when halted, no double run, runs when due", () => {
  const due = 10 * HOUR, now = due + 1;
  assert.equal(plan({ job: registry[0], state: null, active: null, due, now }).action, "idle");
  assert.equal(plan({ job: registry[0], state: { status: "halted", last_tick: 0, lease_until: 0 }, active: [1], due, now }).action, "stopped");
  assert.equal(plan({ job: registry[0], state: { status: "ok", last_tick: 0, lease_until: now + 5 }, active: [1], due, now }).action, "busy");
  assert.equal(plan({ job: registry[0], state: { status: "ok", last_tick: due, lease_until: 0 }, active: [1], due, now }).action, "idle");
  assert.deepEqual(plan({ job: registry[0], state: { status: "waiting_data", last_tick: due - HOUR, lease_until: 0 }, active: [1], due, now }), { action: "run", through: due });
});

test("derived config only moves `through`, and only for paper/live", () => {
  assert.deepEqual(derivedConfig({ from: 0, through: 0, mode: "paper", x: 1 }, 5 * HOUR), { from: 0, through: 5 * HOUR, mode: "paper", x: 1 });
  assert.throws(() => derivedConfig({ from: 0, mode: "backtest" }, HOUR));
  assert.throws(() => derivedConfig({ from: 2 * HOUR, mode: "live" }, HOUR));
  assert.throws(() => derivedConfig({ from: 0, mode: "live" }, HOUR + 1));
});
