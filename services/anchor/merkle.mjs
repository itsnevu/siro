// SHA-256 ordered Merkle tree, byte-identical to ledger::merkle_root / merkle_proof.
// Odd levels duplicate the last node (see docs/limitations.md #8).
import { createHash } from "node:crypto";
const pair = (a, b) => createHash("sha256").update(Buffer.concat([Buffer.from(a, "hex"), Buffer.from(b, "hex")])).digest("hex");
const valid = h => /^[0-9a-f]{64}$/.test(h);
export function merkleRoot(leaves) {
  if (!leaves.length || !leaves.every(valid)) throw new Error("invalid merkle leaves");
  let level = leaves;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(pair(level[i], level[i + 1] ?? level[i]));
    level = next;
  }
  return level[0];
}
export function rootFromProof(leaf, proof) {
  return proof.reduce((current, step) => (step.left ? pair(step.sibling, current) : pair(current, step.sibling)), leaf);
}
