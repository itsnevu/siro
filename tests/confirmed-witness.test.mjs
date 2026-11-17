import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeEventTopics, encodeAbiParameters, parseAbi } from 'viem';
import { confirmDecisionWitness } from '../services/anchor/confirmed-witness.mjs';

const address = `0x${'1'.repeat(40)}`, leaf = 'a'.repeat(64), tx = `0x${'2'.repeat(64)}`, blockHash = `0x${'3'.repeat(64)}`;
const abi = parseAbi(['event Witnessed(bytes32 indexed root,uint64 timestamp)']);
function fixture() {
  const log = { address, topics: encodeEventTopics({ abi, eventName: 'Witnessed', args: { root: `0x${leaf}` } }), data: encodeAbiParameters([{ type: 'uint64' }], [100n]) };
  const receipt = { status: 'success', blockNumber: 5n, blockHash, transactionHash: tx, logs: [log] };
  const client = { getChainId: async () => 4663, getTransactionReceipt: async () => receipt,
    getBlock: async () => ({ hash: blockHash, timestamp: 100n }), getBlockNumber: async () => 6n };
  const events = [{ kind: 'witness_confirmed', payload: { leaves: [leaf], root: leaf, chain_id: 4663, contract: address, tx_hash: tx, block_hash: blockHash } }];
  const decision = { commit_hash: leaf, tick_ts: new Date(99000).toISOString() };
  return { client, receipt, events, decision };
}
test('execution requires canonical chain receipt with exact commitment leaf', async () => {
  const f = fixture();
  assert.equal((await confirmDecisionWitness(f.client, address, 4663, 2, f.decision, f.events)).tx_hash, tx);
  f.receipt.logs = [];
  await assert.rejects(confirmDecisionWitness(f.client, address, 4663, 2, f.decision, f.events), /lacks/);
});
test('junk tree, out-of-order root, reorg, and absent witness fail closed', async () => {
  let f = fixture(); f.events[0].payload.leaves = ['b'.repeat(64)];
  await assert.rejects(confirmDecisionWitness(f.client, address, 4663, 2, f.decision, f.events), /no confirmed/);
  f = fixture(); f.decision.tick_ts = new Date(101000).toISOString();
  await assert.rejects(confirmDecisionWitness(f.client, address, 4663, 2, f.decision, f.events), /Out-of-order/);
  f = fixture(); f.receipt.blockHash = tx;
  await assert.rejects(confirmDecisionWitness(f.client, address, 4663, 2, f.decision, f.events), /canonical/);
});
