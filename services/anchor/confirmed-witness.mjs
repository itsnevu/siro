import { decodeEventLog, parseAbi } from 'viem';
import { merkleRoot } from './merkle.mjs';

const abi = parseAbi(['event Witnessed(bytes32 indexed root,uint64 timestamp)']);
// Journal metadata selects a receipt; only the configured chain can authenticate it.
export async function confirmDecisionWitness(client, address, chainId, confirmations, decision, events) {
  if (!/^0x[0-9a-f]{40}$/i.test(address || '') || !Number.isInteger(confirmations) || confirmations < 2) throw new Error('Invalid witness configuration');
  if (await client.getChainId() !== chainId) throw new Error('Witness chain mismatch');
  const matches = events.filter(e => e.kind === 'witness_confirmed' && e.payload.leaves?.includes(decision.commit_hash));
  if (!matches.length) throw new Error('Decision has no confirmed witness; execution held');
  const w = matches[0].payload;
  if (w.chain_id !== chainId || w.contract?.toLowerCase() !== address.toLowerCase() || merkleRoot(w.leaves) !== w.root) throw new Error('Witness tree or chain mismatch');
  const receipt = await client.getTransactionReceipt({ hash: w.tx_hash });
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (receipt.status !== 'success' || block.hash !== receipt.blockHash || receipt.blockHash !== w.block_hash ||
    await client.getBlockNumber({ cacheTime: 0 }) - receipt.blockNumber + 1n < BigInt(confirmations)) throw new Error('Witness receipt is not canonical and confirmed');
  const found = receipt.logs.filter(l => l.address.toLowerCase() === address.toLowerCase()).some(l => {
    try {
      const e = decodeEventLog({ abi, data: l.data, topics: l.topics });
      return e.args.root === `0x${w.root}` && e.args.timestamp === block.timestamp;
    } catch { return false; }
  });
  if (!found) throw new Error('Witness receipt lacks matching root');
  if (block.timestamp * 1000n < BigInt(Date.parse(decision.tick_ts))) throw new Error('Out-of-order witness root');
  return { root: w.root, tx_hash: receipt.transactionHash, block_number: receipt.blockNumber, timestamp: block.timestamp };
}
