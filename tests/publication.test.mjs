import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { merkleRoot, rootFromProof, pendingCommitHashes, witnessedLeaves } from "../services/anchor/witness-core.mjs";
import { canonicalJson, checkDecisionProof } from "../src/lib/decision-proof.ts";

const h = s => createHash("sha256").update(s).digest("hex");
const pair = (a, b) => createHash("sha256").update(Buffer.concat([Buffer.from(a, "hex"), Buffer.from(b, "hex")])).digest("hex");

test("JS Merkle matches the ledger algorithm, including odd duplication", () => {
  const [a, b, c] = ["a", "b", "c"].map(h);
  assert.equal(merkleRoot([a]), a);
  assert.equal(merkleRoot([a, b]), pair(a, b));
  assert.equal(merkleRoot([a, b, c]), pair(pair(a, b), pair(c, c)));
  assert.equal(rootFromProof(c, [{ sibling: c, left: false }, { sibling: pair(a, b), left: true }]), merkleRoot([a, b, c]));
  assert.throws(() => merkleRoot([]));
  assert.throws(() => merkleRoot(["XYZ"]));
});

test("pending hashes skip witnessed leaves, follow pagination, and stop on a stuck cursor", async () => {
  const [a, b, c] = ["a", "b", "c"].map(h);
  const pages = { 0: { records: [{ commit_hash: a }, { record: { commit_hash: b } }], next: 2 }, 2: { records: [{ commit_hash: c }], next: null } };
  const fetchJson = async url => ({ data: pages[Number(new URL(url).searchParams.get("after"))] });
  assert.deepEqual(await pendingCommitHashes(fetchJson, "http://x", new Set([b])), [a, c]);
  const stuck = async () => ({ data: { records: [], next: 0 } });
  await assert.rejects(pendingCommitHashes(stuck, "http://x", new Set()));
  assert.deepEqual([...witnessedLeaves(`${JSON.stringify({ kind: "witness_confirmed", payload: { leaves: [a] } })}\n`)], [a]);
});

test("browser recomputes publication timing and rejects late or foreign witnesses", async () => {
  const record = { tick_ts: "2026-01-01T00:00:00.000Z", reveal_ts: "2026-01-01T01:00:00.000Z", prev_hash: "0".repeat(64) };
  const commit = h(canonicalJson(record));
  const other = h("other");
  const root = merkleRoot([other, commit]);
  const base = at => ({ data: { decision: { status: "revealed", record: { ...record, commit_hash: commit } }, hour_root: commit, daily_root: commit, decision_proof: [], hour_proof: [],
    publication: { proven: true, root, proof: [{ sibling: other, left: true }], witnessed_at: at, max_lag_ms: 300000 } } });
  const ok = await checkDecisionProof(base("2026-01-01T00:00:30.000Z"));
  assert.deepEqual(ok.publication, { included: true, timely: true, lagMs: 30000, root });
  // Server says proven, but the browser computes the lag itself and refuses.
  assert.equal((await checkDecisionProof(base("2026-01-01T00:10:00.000Z"))).publication.timely, false);
  assert.equal((await checkDecisionProof(base("2025-12-31T23:59:59.000Z"))).publication.timely, false);
  const foreign = base("2026-01-01T00:00:30.000Z"); foreign.data.publication.root = h("not-ours");
  assert.deepEqual((await checkDecisionProof(foreign)).publication.included, false);
});
