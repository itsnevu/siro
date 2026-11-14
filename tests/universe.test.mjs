import test from "node:test";
import assert from "node:assert/strict";
import { select, version, inForce, schedule, handPicked, RULE, hash } from "../services/universe/core.mjs";

const c = (symbol, sector, depth_usd) => ({ symbol, sector, depth_usd, address: `0x${symbol}`, pool: `0xpool${symbol}` });

test("selection: min depth, top N per sector, deterministic ties", () => {
  const picked = select([c("A", "tech", 9e4), c("B", "tech", 8e4), c("C", "tech", 7e4), c("D", "tech", 6e4), c("E", "energy", 1e3), c("F", "energy", 2e4)]);
  assert.deepEqual(picked.map(p => p.symbol), ["A", "B", "C", "F"]);
  assert.deepEqual(select([c("Z", "x", 1e4), c("Y", "x", 1e4)], { ...RULE, per_sector: 1 }).map(p => p.symbol), ["Y"]);
});

test("version is content-addressed and records the rule hash", () => {
  const v1 = version({ effectiveFrom: Date.UTC(2026, 9, 1), candidates: [c("A", "t", 1e5)], observedAt: "x" });
  const v1b = version({ effectiveFrom: Date.UTC(2026, 9, 1), candidates: [c("A", "t", 1e5)], observedAt: "x" });
  assert.equal(v1.universe_version, v1b.universe_version);
  assert.equal(v1.rule_hash, hash(RULE));
  const v2 = version({ effectiveFrom: Date.UTC(2026, 9, 1), candidates: [c("A", "t", 1e5)], rule: { ...RULE, per_sector: 1 }, observedAt: "x" });
  assert.notEqual(v1.universe_version, v2.universe_version, "a rule change is a new version");
});

test("DoD phase 10: removing an asset from today's universe does not change the historical schedule", () => {
  const oct = version({ effectiveFrom: Date.UTC(2026, 9, 1), candidates: [c("NVDA", "semi", 1e5), c("AAPL", "hw", 1e5)], observedAt: "x" });
  const from = Date.UTC(2026, 9, 1), through = Date.UTC(2026, 9, 31);
  const before = schedule([oct], from, through);
  // November: AAPL is delisted. A new version is appended; October's is untouched.
  const nov = version({ effectiveFrom: Date.UTC(2026, 10, 1), candidates: [c("NVDA", "semi", 1e5)], observedAt: "y" });
  const after = schedule([oct, nov], from, through);
  assert.deepEqual(after, before, "October backtest still sees AAPL");
  assert.deepEqual(inForce([oct, nov], Date.UTC(2026, 9, 15)).members.map(m => m.symbol), ["AAPL", "NVDA"]);
  assert.deepEqual(inForce([oct, nov], Date.UTC(2026, 10, 2)).members.map(m => m.symbol), ["NVDA"]);
  assert.equal(inForce([oct, nov], Date.UTC(2026, 8, 30)), null, "no universe before the first version");
  const span = schedule([oct, nov], Date.UTC(2026, 9, 20), Date.UTC(2026, 10, 10));
  assert.deepEqual(span.map(s => s.members), [["AAPL", "NVDA"], ["NVDA"]]);
});

test("a version cannot take effect before the data that selected it was observed", () => {
  assert.throws(() => version({ effectiveFrom: Date.UTC(2026, 10, 1), candidates: [c("A", "t", 1e5)], observedAt: "x", observedAtMs: Date.UTC(2026, 10, 13) }), /precedes/);
  assert.doesNotThrow(() => version({ effectiveFrom: Date.UTC(2026, 11, 1), candidates: [c("A", "t", 1e5)], observedAt: "x", observedAtMs: Date.UTC(2026, 10, 13) }));
});

test("hand-picked badge", () => {
  const v = version({ effectiveFrom: 0, candidates: [c("A", "t", 1e5), c("B", "u", 1e5)], observedAt: "x" });
  assert.equal(handPicked(["A", "B"], v), false);
  assert.equal(handPicked(["A"], v), true);
  assert.equal(handPicked(["A", "C"], v), true);
  assert.equal(handPicked(["A"], null), true);
});
