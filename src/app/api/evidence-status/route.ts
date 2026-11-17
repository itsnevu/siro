import { parseAbi, type Address } from 'viem';
import { serverClient, logsClient, LOGS_MAX_RANGE } from '@/lib/server/rpc';
import { deployment } from '@/lib/generated/deployment';
import { tradingRead } from '@/lib/server/trading';
import { db } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
export async function GET() {
  const result: { [key: string]: unknown } = { last_witness: null, last_anchor: null, last_heartbeat: null, session_count: null, decisions_without_reveal: null, chain_id: 4663, source: 'chain receipts; heartbeat and reveals from operator', chain_error: false };
  try {
    const client = serverClient(4663), head = await client.getBlockNumber();
    const block = await client.getBlock({ blockNumber: head });
    const events = parseAbi(['event Witnessed(bytes32 indexed root,uint64 timestamp)', 'event Anchored(uint64 indexed day,bytes32 indexed root,uint64 timestamp)', 'event SessionGranted(address indexed key,address indexed vault,uint64 generation,uint64 expiry)']);
    const keys = new Set<Address>();
    // A partial scan is never shown as a lifetime zero or a complete session count.
    let witness: string | null = null, anchor: string | null = null;
    const reader = logsClient(4663);
    if (await reader.getChainId() !== 4663) throw new Error('Log chain mismatch');
    for (let from = BigInt(deployment.evidenceBlock); from <= head; from += LOGS_MAX_RANGE) {
      const logs = await reader.getLogs({ address: [deployment.anchor, deployment.sessionExecutor], events, fromBlock: from, toBlock: from + LOGS_MAX_RANGE - 1n < head ? from + LOGS_MAX_RANGE - 1n : head });
      for (const log of logs) {
        if (log.eventName === 'Witnessed') witness = new Date(Number(log.args.timestamp) * 1000).toISOString();
        if (log.eventName === 'Anchored') anchor = new Date(Number(log.args.timestamp) * 1000).toISOString();
        if (log.eventName === 'SessionGranted' && log.args.key) keys.add(log.args.key);
      }
    }
    const abi = parseAbi(['function sessions(address) view returns(address,uint128,uint128,uint64,uint32,uint64,bool)', 'function ownerEpoch() view returns(uint64)', 'function sessionEpoch(address) view returns(uint64)']);
    const epoch = await client.readContract({ address: deployment.sessionExecutor, abi, functionName: 'ownerEpoch', blockNumber: head });
    let sessions = 0;
    for (const key of keys) {
      const [session, grantedEpoch] = await Promise.all([
        client.readContract({ address: deployment.sessionExecutor, abi, functionName: 'sessions', args: [key], blockNumber: head }),
        client.readContract({ address: deployment.sessionExecutor, abi, functionName: 'sessionEpoch', args: [key], blockNumber: head }),
      ]);
      if (session[6] && session[3] > block.timestamp && grantedEpoch === epoch) sessions++;
    }
    result.last_witness = witness ?? 'none'; result.last_anchor = anchor ?? 'none'; result.session_count = sessions;
    result.observed_block = head.toString();
  } catch { result.chain_error = true; }
  try {
    const row = db().prepare('SELECT updated FROM scheduler_heartbeat WHERE id=1').get() as { updated: number } | undefined;
    if (row && row.updated > 0) result.last_heartbeat = new Date(row.updated).toISOString();
  } catch { /* no heartbeat is not an uptime claim */ }
  try {
    let after: number | null = 0, count = 0;
    for (let pages = 0; after !== null && pages < 100; pages++) {
      const response = await tradingRead(`decisions?after=${after}`) as { data: { records: { status: string }[]; next: number | null } };
      count += response.data.records.filter(r => r.status !== 'revealed').length;
      const next = response.data.next;
      if (next !== null && (!Number.isSafeInteger(next) || next <= after)) throw new Error('Pagination stalled');
      after = next;
    }
    if (after === null) result.decisions_without_reveal = count;
  } catch { /* operator source unavailable */ }
  return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
