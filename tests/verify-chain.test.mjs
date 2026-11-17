import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { encodeAbiParameters, encodeEventTopics, parseAbi, keccak256, toBytes } from 'viem';
import { verifyDecisionOnChain } from '../services/anchor/verify-decision.mjs';

const address = n => `0x${String(n).repeat(40)}`;
const hash = n => `0x${String(n).repeat(64)}`;
const canonical = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
function fixture(id = 'd') {
  const content = { decision_id: id, tick_ts: new Date(0).toISOString(), reveal_ts: new Date(3600000).toISOString(), notional_usd: 10 };
  const leaf = createHash('sha256').update(canonical(content)).digest('hex');
  const config = { chain_id: 4663, confirmations: 2, anchor: address(1), vault: address(2), session_executor: address(3), router: address(4), base: address(5), asset: 'A', token: address(6) };
  const witnessAbi = parseAbi(['event Witnessed(bytes32 indexed root,uint64 timestamp)']);
  const tradeAbi = parseAbi(['event TradeExecuted(address indexed executor,address indexed router,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 lossAssets)']);
  const witnessLog = { address: config.anchor, topics: encodeEventTopics({ abi: witnessAbi, eventName: 'Witnessed', args: { root: `0x${leaf}` } }), data: encodeAbiParameters([{ type: 'uint64' }], [1n]) };
  const tradeLog = { address: config.vault, topics: encodeEventTopics({ abi: tradeAbi, eventName: 'TradeExecuted', args: { executor: config.session_executor, router: config.router, tokenIn: config.base } }), data: encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], [config.token, 10n, 10n, 0n]) };
  const execution_id = keccak256(toBytes(`${id}:0`));
  const executedAbi = parseAbi(['event Executed(bytes32 indexed decisionId,address indexed key,uint256 value,uint256 amountOut)']);
  const executedLog = { address: config.session_executor, topics: encodeEventTopics({ abi: executedAbi, eventName: 'Executed', args: { decisionId: execution_id, key: address(7) } }), data: encodeAbiParameters([{ type: 'uint256' }, { type: 'uint256' }], [10n, 10n]) };
  const receipts = { [hash(1)]: { transactionHash: hash(1), status: 'success', blockNumber: 10n, blockHash: hash(3), transactionIndex: 0, logs: [witnessLog] },
    [hash(2)]: { transactionHash: hash(2), status: 'success', blockNumber: 20n, blockHash: hash(4), transactionIndex: 0, logs: [tradeLog, executedLog] } };
  const client = { getChainId: async () => 4663, getBlockNumber: async () => 30n,
    getTransactionReceipt: async ({ hash }) => receipts[hash],
    getBlock: async ({ blockNumber }) => blockNumber === 10n ? { hash: hash(3), timestamp: 1n } : { hash: hash(4), timestamp: 3600n },
    readContract: async () => [hash(0), 0n] };
  const data = { decision: { record: { ...content, commit_hash: leaf } }, publication: { root: leaf, proof: [], tx_hash: hash(1), contract: config.anchor, chain_id: 4663 },
    hour_root: leaf, daily_root: leaf, day: 0, decision_proof: [], hour_proof: [],
    executions: [{ decision_id: id, ordinal: 0, execution_id, chain_id: 4663, tx_hash: hash(2), fill: { asset: 'A', quantity: 10 } }] };
  return { data, config, client, receipts };
}
test('three decision batches pass all four separate checks', async () => {
  for (let i = 0; i < 3; i++) {
    const f = fixture(`d${i}`), result = await verifyDecisionOnChain(f.data, f.client, f.config);
    assert.deepEqual(Object.values(result.checks), [true, true, true, true]);
    assert.equal(result.root_status, 'witnessed, unanchored');
  }
});
test('stripped TradeExecuted is committed, never executed; other commitments still verify', async () => {
  const f = fixture(); f.receipts[hash(2)].logs = [];
  const result = await verifyDecisionOnChain(f.data, f.client, f.config);
  assert.equal(result.execution_status, 'committed, never executed');
  assert.equal(result.checks.matching_trade_in_window, false);
  assert.equal(result.checks.witness_before_execution, false);
});
test('tampered reveal fails hash; junk root resolves nothing; reversed ordering is flagged', async () => {
  let f = fixture(); f.data.decision.record.notional_usd++;
  assert.equal((await verifyDecisionOnChain(f.data, f.client, f.config)).checks.reveal_hash_match, false);
  f = fixture(); f.data.publication.root = 'f'.repeat(64);
  const junk = await verifyDecisionOnChain(f.data, f.client, f.config);
  assert.equal(junk.checks.commitment_leaf_proof, false); assert.equal(junk.root_status, 'unverified');
  f = fixture(); f.client.getBlock = async ({ blockNumber }) => blockNumber === 10n ? { hash: hash(3), timestamp: 4000n } : { hash: hash(4), timestamp: 3600n };
  // Change the witness event too: a real late witness still fails chronology.
  f.receipts[hash(1)].logs[0].data = encodeAbiParameters([{ type: 'uint64' }], [4000n]);
  assert.equal((await verifyDecisionOnChain(f.data, f.client, f.config)).execution_status, 'out-of-order root');
});
test('execution ID binding and covering daily anchor are independent checks', async () => {
  const f = fixture();
  f.client.readContract = async () => [`0x${f.data.daily_root}`, 4000n];
  assert.equal((await verifyDecisionOnChain(f.data, f.client, f.config)).root_status, 'daily anchored');
  f.data.executions[0].execution_id = hash(9);
  const wrongId = await verifyDecisionOnChain(f.data, f.client, f.config);
  assert.equal(wrongId.checks.matching_trade_in_window, false);
  assert.equal(wrongId.execution_status, 'committed; execution unproven');
});
