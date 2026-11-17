import { canonicalBatch } from './witness-policy.mjs';

// Freeze a defensive copy: neither the caller nor a publisher can change the tree.
export function freezeBatch(leaves, lastHour, hour) {
  const batch = canonicalBatch([...leaves].sort(), lastHour, hour);
  return Object.freeze({ ...batch, leaves: Object.freeze([...batch.leaves]) });
}

export function assertFrozen(batch, leaves) {
  const current = [...leaves].sort();
  if (JSON.stringify(current) !== JSON.stringify(batch.leaves)) throw new Error('Frozen commitment set changed');
}

// A failed publication never calls execute. Retrying must use the same frozen batch.
export async function receiptGate({ batch, currentLeaves, publish, execute, missedBatch, sleep, attempts = 3 }) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) throw new Error('Invalid witness attempts');
  let failure;
  for (let attempt = 0; attempt < attempts; attempt++) {
    assertFrozen(batch, currentLeaves());
    let receipt;
    try {
      receipt = await publish(batch);
      if (receipt?.root !== batch.root || receipt?.status !== 'success') throw new Error('Witness receipt missing or mismatched');
    } catch (error) {
      failure = error;
      if (attempt + 1 < attempts) await sleep(1000 * 2 ** attempt);
      continue;
    }
    assertFrozen(batch, currentLeaves());
    return execute(receipt);
  }
  await missedBatch({ root: batch.root, hour: batch.hour, reason: String(failure?.message) });
  throw failure;
}
