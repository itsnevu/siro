import { describe, expect, it } from "vitest";
import { ACTION } from "./constants";
import {
  buildMerkleTree,
  commitDecisions,
  decisionLeaf,
  epochOf,
  hashText,
  merkleProof,
  verifyMerkleProof,
  type Decision,
} from "./decision";

/**
 * Shared test vector. contracts/test/unit/DecisionLog.t.sol asserts the same constant against
 * DecisionLog.leafOf, so the engine and the contract cannot drift apart unnoticed.
 * Produced independently with:
 *   cast keccak $(cast abi-encode "f(uint256,uint64,string,uint8,uint256,bytes32,bytes32)" \
 *     12 500000 NVDA 1 250000000 $(cast keccak inputs) $(cast keccak reason))
 */
const VECTOR: Decision = {
  agentId: 12n,
  epoch: 500000n,
  ticker: "NVDA",
  action: ACTION.BUY,
  size: 250_000_000n,
  inputsHash: hashText("inputs"),
  reasonHash: hashText("reason"),
};
const VECTOR_LEAF = "0xe64171163f0ed95fabb096290cb28854c5c77075cddfa104bd00af787f0f7b2b";

function decisions(count: number): Decision[] {
  return Array.from({ length: count }, (_, index) => ({
    ...VECTOR,
    ticker: `T${index}`,
    size: BigInt(index) * 1_000_000n,
  }));
}

describe("decision leaf", () => {
  it("matches the Solidity encoding", () => {
    expect(hashText("inputs")).toBe("0xd41d6b189e130a016c166c65c226d7fa1a53be2afafef394b142a39dc9c054cd");
    expect(decisionLeaf(VECTOR)).toBe(VECTOR_LEAF);
  });

  it("changes when any field changes", () => {
    expect(decisionLeaf({ ...VECTOR, action: ACTION.SELL })).not.toBe(VECTOR_LEAF);
    expect(decisionLeaf({ ...VECTOR, size: 250_000_001n })).not.toBe(VECTOR_LEAF);
    expect(decisionLeaf({ ...VECTOR, reasonHash: hashText("edited reason") })).not.toBe(VECTOR_LEAF);
    expect(decisionLeaf({ ...VECTOR, epoch: 500001n })).not.toBe(VECTOR_LEAF);
  });

  it("computes hourly epochs", () => {
    expect(epochOf(1_800_000_000)).toBe(500000n);
    expect(epochOf(1_800_003_599)).toBe(500000n);
    expect(epochOf(1_800_003_600)).toBe(500001n);
  });
});

describe("merkle tree", () => {
  it("uses the leaf as the root for a single decision", () => {
    const tree = buildMerkleTree([VECTOR_LEAF]);
    expect(tree.root).toBe(VECTOR_LEAF);
    expect(merkleProof(tree, 0)).toEqual([]);
    expect(verifyMerkleProof(tree.root, VECTOR_LEAF, [])).toBe(true);
  });

  it("produces a valid proof for every leaf at every size from 1 to 33", () => {
    for (let size = 1; size <= 33; size++) {
      const { root, leaves, proofs } = commitDecisions(decisions(size));
      leaves.forEach((leaf, index) => {
        expect(verifyMerkleProof(root, leaf, proofs[index]!)).toBe(true);
      });
    }
  });

  it("rejects a forged leaf and a proof from another position", () => {
    const { root, leaves, proofs } = commitDecisions(decisions(7));
    const forged = decisionLeaf({ ...VECTOR, ticker: "FAKE" });
    expect(verifyMerkleProof(root, forged, proofs[0]!)).toBe(false);
    expect(verifyMerkleProof(root, leaves[0]!, proofs[3]!)).toBe(false);
  });

  it("refuses an empty tree and out-of-range indexes", () => {
    expect(() => buildMerkleTree([])).toThrow();
    const tree = buildMerkleTree([VECTOR_LEAF]);
    expect(() => merkleProof(tree, 1)).toThrow();
    expect(() => merkleProof(tree, -1)).toThrow();
  });
});
