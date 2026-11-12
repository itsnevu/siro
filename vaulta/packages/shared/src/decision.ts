/**
 * Proof of Decision: how a decision becomes a Merkle leaf and how a root is built and checked.
 *
 * This file must stay byte-for-byte compatible with contracts/src/DecisionLog.sol:
 *   leaf = keccak256(abi.encode(agentId, epoch, ticker, action, size, inputsHash, reasonHash))
 *   node = keccak256(sorted(left, right))            (OpenZeppelin MerkleProof convention)
 *
 * A leaf preimage is always at least 288 bytes, an inner node preimage is exactly 64 bytes,
 * so a leaf can never be passed off as an inner node (no second-preimage ambiguity).
 */
import { concat, encodeAbiParameters, keccak256, stringToBytes, type Hex } from "viem";
import { ACTION, PROOF, type ActionCode } from "./constants";
import { canonicalJson } from "./strategy";

export interface Decision {
  agentId: bigint;
  /** Hour index: floor(unix seconds / 3600). */
  epoch: bigint;
  ticker: string;
  action: ActionCode;
  /** Trade notional in asset units (USDG, 6 decimals). Zero for HOLD. */
  size: bigint;
  /** keccak256 of the canonical JSON of everything the rules read. */
  inputsHash: Hex;
  /** keccak256 of the plain-language reason shown in the UI. */
  reasonHash: Hex;
}

export const DECISION_LEAF_TYPES = [
  { name: "agentId", type: "uint256" },
  { name: "epoch", type: "uint64" },
  { name: "ticker", type: "string" },
  { name: "action", type: "uint8" },
  { name: "size", type: "uint256" },
  { name: "inputsHash", type: "bytes32" },
  { name: "reasonHash", type: "bytes32" },
] as const;

export function epochOf(unixSeconds: number): bigint {
  return BigInt(Math.floor(unixSeconds / PROOF.epochSeconds));
}

export function epochStart(epoch: bigint): number {
  return Number(epoch) * PROOF.epochSeconds;
}

export function hashText(text: string): Hex {
  return keccak256(stringToBytes(text));
}

export function hashInputs(snapshot: unknown): Hex {
  return keccak256(stringToBytes(canonicalJson(snapshot)));
}

export function decisionLeaf(decision: Decision): Hex {
  if (!Object.values(ACTION).includes(decision.action)) throw new Error(`Unknown action ${decision.action}`);
  return keccak256(
    encodeAbiParameters(DECISION_LEAF_TYPES, [
      decision.agentId,
      decision.epoch,
      decision.ticker,
      decision.action,
      decision.size,
      decision.inputsHash,
      decision.reasonHash,
    ]),
  );
}

function hashPair(a: Hex, b: Hex): Hex {
  return keccak256(a.toLowerCase() < b.toLowerCase() ? concat([a, b]) : concat([b, a]));
}

export interface MerkleTree {
  root: Hex;
  /** layers[0] is the leaves in the order given, the last layer is [root]. */
  layers: Hex[][];
}

/** Builds the tree. An unpaired node is carried up unchanged. */
export function buildMerkleTree(leaves: readonly Hex[]): MerkleTree {
  if (leaves.length === 0) throw new Error("Cannot build a Merkle tree with no leaves");
  const layers: Hex[][] = [[...leaves]];
  let current = layers[0]!;
  while (current.length > 1) {
    const next: Hex[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = current[i + 1];
      next.push(right === undefined ? left : hashPair(left, right));
    }
    layers.push(next);
    current = next;
  }
  return { root: current[0]!, layers };
}

export function merkleProof(tree: MerkleTree, leafIndex: number): Hex[] {
  const leaves = tree.layers[0]!;
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`Leaf index ${leafIndex} out of range`);
  }
  const proof: Hex[] = [];
  let index = leafIndex;
  for (let depth = 0; depth < tree.layers.length - 1; depth++) {
    const layer = tree.layers[depth]!;
    const sibling = layer[index ^ 1];
    if (sibling !== undefined) proof.push(sibling);
    index = Math.floor(index / 2);
  }
  return proof;
}

/** Offchain mirror of DecisionLog.verify. */
export function verifyMerkleProof(root: Hex, leaf: Hex, proof: readonly Hex[]): boolean {
  let computed = leaf;
  for (const sibling of proof) computed = hashPair(computed, sibling);
  return computed.toLowerCase() === root.toLowerCase();
}

/** Convenience for the engine: leaves, root and a proof per decision, in input order. */
export function commitDecisions(decisions: readonly Decision[]): {
  root: Hex;
  leaves: Hex[];
  proofs: Hex[][];
} {
  const leaves = decisions.map(decisionLeaf);
  const tree = buildMerkleTree(leaves);
  return { root: tree.root, leaves, proofs: leaves.map((_, index) => merkleProof(tree, index)) };
}
