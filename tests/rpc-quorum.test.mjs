import test from "node:test";
import assert from "node:assert/strict";
import { createRpc, QuorumError } from "../services/ingest/rpc.mjs";

// Fake JSON-RPC network: each host answers from a table, or fails.
function network(answers) {
  return async (url, init) => {
    const host = new URL(url).host, { method, id } = JSON.parse(init.body);
    const a = answers[host]?.[method];
    if (a === undefined || a === "down") throw new Error("connect ECONNREFUSED");
    return { json: async () => (a?.error ? { jsonrpc: "2.0", id, error: a.error } : { jsonrpc: "2.0", id, result: a }) };
  };
}
const good = { eth_chainId: "0x1237", eth_blockNumber: "0x6c0d000", eth_call: "0xabc", eth_getLogs: [] };
const urls = ["https://a.test", "https://b.test", "https://c.test"];

test("quorum read returns the value two endpoints agree on; a dissent seen before quorum is named", async () => {
  // The liar answers first; quorum is reached when the second honest answer arrives.
  const rpc = createRpc(urls, { retries: 1, fetchImpl: network({ "a.test": { ...good, eth_call: "0xevil" }, "b.test": good, "c.test": good }) });
  await rpc.probe();
  const r = await rpc.call("eth_call", [{}, "latest"], { need: "archive" });
  assert.equal(r.value, "0xabc");
  assert.deepEqual(r.agreed, ["b.test", "c.test"]);
  assert.deepEqual(r.dissent, ["a.test"]);
});

test("one honest endpoint against two disagreeing liars yields no quorum, never a guess", async () => {
  const rpc = createRpc(urls, { retries: 1, fetchImpl: network({ "a.test": good, "b.test": { ...good, eth_call: "0x1" }, "c.test": { ...good, eth_call: "0x2" } }) });
  await rpc.probe();
  await assert.rejects(rpc.call("eth_call", [{}, "latest"], { need: "archive" }), QuorumError);
});

test("all endpoints down: probe fails and nothing is returned (chaos: RPC total outage)", async () => {
  const rpc = createRpc(urls, { retries: 1, fetchImpl: network({}) });
  await assert.rejects(rpc.probe());
  await assert.rejects(rpc.call("eth_blockNumber", []), QuorumError);
});

test("capabilities gate reads: archive-only data needs two archive endpoints", async () => {
  const pruned = { ...good, eth_call: { error: { code: -32000, message: "historical state unavailable" } }, eth_getLogs: { error: { code: -32602, message: "archive requires token" } } };
  const rpc = createRpc(urls, { retries: 1, fetchImpl: network({ "a.test": good, "b.test": pruned, "c.test": pruned }) });
  const { endpoints } = await rpc.probe();
  assert.deepEqual(endpoints.map(e => e.caps.includes("archive")), [true, false, false]);
  await assert.rejects(rpc.call("eth_call", [{}, "0x1"], { need: "archive" }), /quorum 2 required/);
  assert.equal((await rpc.call("eth_call", [{}, "0x1"], { need: "archive", quorum: 1 })).value, "0xabc");
});
