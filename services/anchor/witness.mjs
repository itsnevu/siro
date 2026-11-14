// Publication witness. Every few seconds, collect commit hashes not yet witnessed, put them in
// one SHA-256 ordered Merkle batch, and call Anchor.witness(root). The block timestamp of that
// call is the independent clock used by /verify to decide publication_proven.
// Run: node services/anchor/witness.mjs [--once]
import { createPublicClient, createWalletClient, http, parseAbi, decodeEventLog, encodeFunctionData, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { writeFileSync, unlinkSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { merkleRoot, pendingCommitHashes, witnessedLeaves } from "./witness-core.mjs";

const required = n => { if (!process.env[n]) throw new Error(`${n} is required`); return process.env[n]; };
const chainId = Number(required("SIRO_ANCHOR_CHAIN_ID")), address = required("SIRO_ANCHOR_ADDRESS"), rpc = required("SIRO_ANCHOR_RPC");
const account = privateKeyToAccount(required("SIRO_ANCHOR_PRIVATE_KEY"));
const confirmations = Number(required("SIRO_ANCHOR_CONFIRMATIONS"));
if (!Number.isInteger(confirmations) || confirmations < 2) throw new Error("At least two witness confirmations required");
const intervalMs = Number(process.env.SIRO_WITNESS_INTERVAL_MS ?? 10_000);
if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new Error("SIRO_WITNESS_INTERVAL_MS must be an integer >= 1000");
const chain = { id: chainId, name: "Configured witness chain", nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } };
const client = createPublicClient({ chain, transport: http(rpc, { timeout: 10000, retryCount: 1 }) });
const wallet = createWalletClient({ account, chain, transport: http(rpc, { timeout: 10000, retryCount: 0 }) });
const abi = parseAbi(["function witnessedAt(bytes32) view returns(uint64)", "function witness(bytes32 root)", "event Witnessed(bytes32 indexed root,uint64 timestamp)"]);
const journal = resolve(required("SIRO_ANCHOR_JOURNAL")); mkdirSync(dirname(journal), { recursive: true });
const api = required("SIRO_ENGINE_API").replace(/\/$/, "");
const witnessed = () => (existsSync(journal) ? witnessedLeaves(readFileSync(journal, "utf8")) : new Set());

async function fetchJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Decision API HTTP ${r.status}`);
  return r.json();
}

// Outbox: a batch is persisted before its transaction is sent and is finished before any new
// batch is formed. Otherwise a slow confirmation would make the next tick send a different root
// and the earliest on-chain timestamp for these leaves would never reach the journal.
const outbox = `${journal}.witness-outbox.json`;

async function tick() {
  let batch = existsSync(outbox) ? JSON.parse(readFileSync(outbox, "utf8")) : null;
  if (!batch) {
    const leaves = await pendingCommitHashes(fetchJson, api, witnessed());
    if (!leaves.length) return;
    batch = { root: `0x${merkleRoot(leaves)}`, leaves };
    writeFileSync(outbox, JSON.stringify(batch), { flag: "wx" });
  }
  const { root, leaves } = batch;
  if (`0x${merkleRoot(leaves)}` !== root) throw new Error("Witness outbox is corrupt; inspect before continuing");
  let receipt;
  const existing = await client.readContract({ address, abi, functionName: "witnessedAt", args: [root] });
  if (existing === 0n && !batch.tx_hash) {
    const request = await wallet.prepareTransactionRequest({ account, to: address, data: encodeFunctionData({ abi, functionName: "witness", args: [root] }) });
    const signed = await account.signTransaction(request);
    batch.tx_hash = keccak256(signed); batch.raw = signed;
    writeFileSync(outbox, JSON.stringify(batch));
    await wallet.sendRawTransaction({ serializedTransaction: signed });
    receipt = await client.waitForTransactionReceipt({ hash: batch.tx_hash, confirmations, timeout: 120000 });
  } else if (existing === 0n) {
    // Sent before a crash but not yet mined: rebroadcast the same signed bytes; never re-sign.
    await wallet.sendRawTransaction({ serializedTransaction: batch.raw }).catch(() => {});
    receipt = await client.waitForTransactionReceipt({ hash: batch.tx_hash, confirmations, timeout: 120000 });
  } else {
    // Already witnessed (by us before a crash, or by a third party). Recover that transaction.
    const logs = await client.getLogs({ address, event: abi.find(e => e.type === "event"), args: { root }, fromBlock: BigInt(required("SIRO_ANCHOR_DEPLOYMENT_BLOCK")), toBlock: "latest" });
    if (logs.length !== 1) throw new Error("Cannot resolve witness transaction");
    receipt = await client.getTransactionReceipt({ hash: logs[0].transactionHash });
  }
  if (receipt.status !== "success") throw new Error("Witness reverted");
  if ((await client.getBlockNumber()) - receipt.blockNumber + 1n < BigInt(confirmations)) return;
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash) throw new Error("Witness reorg detected");
  const event = receipt.logs.filter(l => l.address.toLowerCase() === address.toLowerCase())
    .map(l => { try { return decodeEventLog({ abi, data: l.data, topics: l.topics }); } catch { return null; } })
    .find(e => e?.eventName === "Witnessed" && e.args.root === root);
  if (!event || event.args.timestamp !== block.timestamp) throw new Error("Witness receipt lacks matching event");
  const temp = resolve(`${journal}.${process.pid}.witness.json`);
  writeFileSync(temp, JSON.stringify({ root: root.slice(2), leaves, chain_id: chainId, contract: address, tx_hash: receipt.transactionHash, block_hash: receipt.blockHash, block_number: receipt.blockNumber.toString(), block_timestamp_ms: Number(block.timestamp) * 1000, confirmations, confirmed_at: Date.now() }), { flag: "wx" });
  try {
    const r = spawnSync(required("SIRO_LEDGER_BINARY"), ["witness-receipt", journal, temp], { stdio: "inherit" });
    if (r.error) throw r.error;
    if (r.status !== 0) throw new Error("Witness append failed");
  } finally { unlinkSync(temp); }
  unlinkSync(outbox);
}

await tick();
if (!process.argv.includes("--once")) {
  let busy = false;
  setInterval(() => {
    if (busy) return;
    busy = true;
    tick().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => { busy = false; });
  }, intervalMs);
}
