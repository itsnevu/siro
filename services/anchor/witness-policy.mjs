import { merkleRoot } from './merkle.mjs';

// The witness key must be distinct from both the vault operator and daily anchor owner.
export function assertDedicatedWitness(address, operator, owner) {
  for (const [name, other] of [['operator', operator], ['anchor owner', owner]]) {
    if (!/^0x[0-9a-f]{40}$/i.test(other || '')) throw new Error(`${name} address is required`);
    if (address.toLowerCase() === other.toLowerCase()) throw new Error(`Witness key must differ from ${name}`);
  }
}

export function canonicalBatch(leaves, lastHour, hour) {
  if (!Number.isSafeInteger(hour) || hour <= lastHour) throw new Error('Witness hour must advance monotonically');
  if (!Array.isArray(leaves) || !leaves.length || leaves.some(h => !/^[0-9a-f]{64}$/.test(h))) throw new Error('Invalid commitment leaf');
  const canonical = [...new Set(leaves)].sort();
  if (canonical.length !== leaves.length || canonical.some((h, i) => h !== leaves[i])) throw new Error('Noncanonical witness leaves');
  return { hour, leaves, root: `0x${merkleRoot(leaves)}` };
}
