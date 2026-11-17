import { createHash } from 'node:crypto';
import { decodeEventLog, parseAbi, keccak256, toBytes } from 'viem';
import { rootFromProof } from './merkle.mjs';

const witnessAbi = parseAbi(['event Witnessed(bytes32 indexed root,uint64 timestamp)']);
const tradeAbi = parseAbi(['event TradeExecuted(address indexed executor,address indexed router,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 lossAssets)']);
const anchorAbi = parseAbi(['function dailyRoots(uint64) view returns(bytes32 value,uint64 timestamp)']);
const executedAbi = parseAbi(['event Executed(bytes32 indexed decisionId,address indexed key,uint256 value,uint256 amountOut)']);
const canonical = v => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const validHash = h => /^[a-f0-9]{64}$/.test(h || '');

export async function verifyDecisionOnChain(data, client, config) {
  const checks = { witness_before_execution: false, commitment_leaf_proof: false, reveal_hash_match: false, matching_trade_in_window: false };
  const result = { checks, label: 'commitment-bound reveal, served by operator', root_status: 'unverified', execution_status: 'execution unproven' };
  const record = data.decision?.record, publication = data.publication;
  const committed = data.decision?.commit_hash ?? record?.commit_hash;
  if (!validHash(committed)) return result;
  if (record) {
    const { commit_hash, ...content } = record;
    checks.reveal_hash_match = commit_hash === committed && createHash('sha256').update(canonical(content)).digest('hex') === committed;
  }
  if (!validHash(publication?.root) || !Array.isArray(publication.proof)) return result;
  checks.commitment_leaf_proof = publication.proof.every(p => validHash(p.sibling) && typeof p.left === 'boolean') && rootFromProof(committed, publication.proof) === publication.root;
  if (!checks.commitment_leaf_proof) return result;
  if (!Number.isSafeInteger(config.chain_id) || !Number.isInteger(config.confirmations) || config.confirmations < 2 ||
      !same(publication.contract, config.anchor) || publication.chain_id !== config.chain_id || await client.getChainId() !== config.chain_id) return result;
  const head = await client.getBlockNumber({ cacheTime: 0 });
  const canonicalReceipt = async hash => {
    const receipt = await client.getTransactionReceipt({ hash });
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    if (receipt.status !== 'success' || block.hash !== receipt.blockHash || head - receipt.blockNumber + 1n < BigInt(config.confirmations)) throw new Error('Unconfirmed or reorged receipt');
    return { receipt, block };
  };
  const witness = await canonicalReceipt(publication.tx_hash);
  const witnessed = witness.receipt.logs.some(log => {
    if (!same(log.address, config.anchor)) return false;
    try {
      const event = decodeEventLog({ abi: witnessAbi, topics: log.topics, data: log.data });
      return event.args.root === `0x${publication.root}` && event.args.timestamp === witness.block.timestamp;
    } catch { return false; }
  });
  if (!witnessed) return result;
  result.root_status = 'witnessed, unanchored';
  // The daily tree must cover this exact leaf, rather than merely some root from the same day.
  if (data.hour_root === publication.root && validHash(data.hour_root) && validHash(data.daily_root) && Array.isArray(data.decision_proof) && Array.isArray(data.hour_proof) &&
      rootFromProof(committed, data.decision_proof) === data.hour_root && rootFromProof(data.hour_root, data.hour_proof) === data.daily_root &&
      Number.isSafeInteger(data.day) && data.day >= 0) {
    const [daily, at] = await client.readContract({ address: config.anchor, abi: anchorAbi, functionName: 'dailyRoots', args: [BigInt(data.day)] });
    if (daily === `0x${data.daily_root}` && at > 0n) result.root_status = 'daily anchored';
  }
  if (!record) return result;
  const tick = Date.parse(record.tick_ts), reveal = Date.parse(record.reveal_ts);
  const witnessedAt = Number(witness.block.timestamp) * 1000;
  if (!Number.isSafeInteger(tick) || !Number.isSafeInteger(reveal) || witnessedAt < tick || witnessedAt > reveal) {
    result.execution_status = 'out-of-order root'; return result;
  }
  let inspectedExecution = false;
  for (const evidence of data.executions ?? []) {
    if (evidence.decision_id !== record.decision_id || evidence.chain_id !== config.chain_id) continue;
    if (!Number.isSafeInteger(evidence.ordinal) || evidence.ordinal < 0 || evidence.execution_id !== keccak256(toBytes(`${record.decision_id}:${evidence.ordinal}`))) continue;
    const asset = config.assets?.[evidence.fill?.asset] ?? (evidence.fill?.asset === config.asset ? { token: config.token } : null);
    if (!asset) continue;
    const execution = await canonicalReceipt(evidence.tx_hash);
    inspectedExecution = true;
    const bound = execution.receipt.logs.some(log => {
      if (!same(log.address, config.session_executor)) return false;
      try { return decodeEventLog({ abi: executedAbi, data: log.data, topics: log.topics }).args.decisionId === evidence.execution_id; } catch { return false; }
    });
    if (!bound) continue;
    const at = Number(execution.block.timestamp) * 1000;
    const within = at >= tick + 3600000 && at <= tick + 7200000;
    const before = witness.receipt.blockNumber < execution.receipt.blockNumber ||
      (witness.receipt.blockNumber === execution.receipt.blockNumber && witness.receipt.transactionIndex < execution.receipt.transactionIndex);
    const trade = execution.receipt.logs.some(log => {
      if (!same(log.address, config.vault)) return false;
      try {
        const event = decodeEventLog({ abi: tradeAbi, data: log.data, topics: log.topics });
        const args = event.args, buy = evidence.fill.quantity > 0;
        return same(args.executor, config.session_executor) && same(args.router, config.router) &&
          same(args.tokenIn, buy ? config.base : asset.token) && same(args.tokenOut, buy ? asset.token : config.base) && args.amountIn > 0n && args.amountOut > 0n;
      } catch { return false; }
    });
    checks.matching_trade_in_window ||= trade && within;
    checks.witness_before_execution ||= trade && within && before;
  }
  result.execution_status = checks.matching_trade_in_window ? 'matching execution event' : inspectedExecution ? 'committed, never executed' : 'committed; execution unproven';
  return result;
}
