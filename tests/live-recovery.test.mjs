import test from "node:test";
import assert from "node:assert/strict";
import { resolveOutcome, quorum, bumpedFees, UncertainOutcome } from "../services/execution/resolve.mjs";

// Simulated chain. `script` maps poll index -> state changes.
function chain({ minedAt = Infinity, cancelMinedAt = Infinity, nonceMovesAt = Infinity, executedAt = Infinity, nonceUnknown = false }) {
  let t = 0, cancelSent = false;
  const log = [];
  return {
    log,
    deps: {
      tx: { hash: "0xorig", nonce: 7 },
      now: () => t,
      sleep: async ms => { t += ms; },
      getReceipt: async h => (h === "0xorig" && t >= minedAt ? { status: "success", hash: h } : h === "0xcancel" && cancelSent && t >= cancelMinedAt ? { status: "success", hash: h } : null),
      confirmedNonce: async () => (nonceUnknown ? null : t >= nonceMovesAt || (cancelSent && t >= cancelMinedAt) ? 8 : 7),
      executed: async () => t >= executedAt,
      rebroadcast: async () => { log.push(["rebroadcast", t]); },
      sendCancel: async () => { cancelSent = true; log.push(["cancel", t]); return { hash: "0xcancel" }; },
      deadlineMs: 30, cancelDeadlineMs: 30, pollMs: 10,
    },
  };
}

test("RPC timeout but transaction later mined: resolves as mined, never cancels", async () => {
  const c = chain({ minedAt: 20, executedAt: 20 });
  const r = await resolveOutcome(c.deps);
  assert.equal(r.outcome, "mined");
  assert.ok(!c.log.some(([k]) => k === "cancel"));
  assert.ok(c.log.every(([k]) => k === "rebroadcast"), "only identical bytes are re-sent");
});

test("dropped transaction: cancellation mines, order provably not executed", async () => {
  const c = chain({ cancelMinedAt: 40 });
  const r = await resolveOutcome(c.deps);
  assert.deepEqual(r, { outcome: "not_executed", reason: "cancellation transaction mined in place of the order", cancelHash: "0xcancel" });
  assert.equal(c.log.filter(([k]) => k === "cancel").length, 1, "exactly one cancellation");
});

test("nonce consumed elsewhere and id unexecuted: not executed without cancelling", async () => {
  const r = await resolveOutcome(chain({ nonceMovesAt: 10 }).deps);
  assert.equal(r.outcome, "not_executed");
  assert.equal(r.cancelHash, null);
});

test("nonce moved but executor says executed: keep waiting, never claim not executed", async () => {
  const c = chain({ nonceMovesAt: 0, executedAt: 0, minedAt: 25 });
  assert.equal((await resolveOutcome(c.deps)).outcome, "mined");
});

test("nothing provable (RPCs disagree, nothing mines): uncertain, so the runner halts", async () => {
  await assert.rejects(resolveOutcome(chain({ nonceUnknown: true }).deps), UncertainOutcome);
  await assert.rejects(resolveOutcome(chain({ nonceMovesAt: 0, executedAt: 0 }).deps), UncertainOutcome);
});

test("quorum: disagreement or failure is null, never proof", async () => {
  assert.equal(await quorum([async () => 8, async () => 8]), 8);
  assert.equal(await quorum([async () => 8, async () => 7]), null);
  assert.equal(await quorum([async () => false, async () => { throw new Error("rpc down"); }]), null);
  assert.equal(await quorum([async () => false]), false);
});

test("replacement fees exceed the 10% node minimum", () => {
  const b = bumpedFees({ maxFeePerGas: 1000n, maxPriorityFeePerGas: 10n });
  assert.ok(b.maxFeePerGas * 10n >= 1000n * 11n && b.maxPriorityFeePerGas * 10n >= 10n * 11n);
  assert.throws(() => bumpedFees({ gasPrice: 1n }));
});
