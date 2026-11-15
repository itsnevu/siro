import { describe, expect, test } from "vitest";
import { planWithdraw, withdrawButton } from "@/lib/withdraw/plan";

const pos = { maxAssets: 38_780_310n, maxShares: 38_780_310_000_000n, previewRedeemAll: 38_780_310n };

describe("planWithdraw", () => {
  test("Max redeems every share so no dust is left", () => {
    expect(planWithdraw({ ...pos, assets: null, isMax: true })).toEqual({ kind: "redeem_all", shares: pos.maxShares, expectedAssets: pos.previewRedeemAll });
  });
  test("typing the full balance also redeems all", () => {
    expect(planWithdraw({ ...pos, assets: pos.maxAssets, isMax: false }).kind).toBe("redeem_all");
  });
  test("partial amount withdraws exactly that many assets", () => {
    expect(planWithdraw({ ...pos, assets: 10_000_000n, isMax: false })).toEqual({ kind: "withdraw", assets: 10_000_000n });
  });
  test("over the withdrawable balance is rejected", () => {
    expect(planWithdraw({ ...pos, assets: pos.maxAssets + 1n, isMax: false })).toEqual({ kind: "exceeds", maxAssets: pos.maxAssets });
  });
  test("empty, zero and no position give nothing to do", () => {
    expect(planWithdraw({ ...pos, assets: null, isMax: false }).kind).toBe("none");
    expect(planWithdraw({ ...pos, assets: 0n, isMax: false }).kind).toBe("none");
    expect(planWithdraw({ maxAssets: 0n, maxShares: 0n, previewRedeemAll: 0n, assets: null, isMax: true }).kind).toBe("none");
  });
});

describe("withdrawButton strict order", () => {
  const plan = { kind: "withdraw" as const, assets: 1n };
  const ok = { connected: true, correctChain: true, maxShares: 5n, plan, preparing: false };
  test("every state is reachable in order", () => {
    expect(withdrawButton({ ...ok, connected: false, correctChain: false }).kind).toBe("connect");
    expect(withdrawButton({ ...ok, correctChain: false }).kind).toBe("wrong_network");
    expect(withdrawButton({ ...ok, maxShares: 0n }).kind).toBe("no_position");
    expect(withdrawButton({ ...ok, plan: { kind: "none" } }).kind).toBe("enter_amount");
    expect(withdrawButton({ ...ok, plan: { kind: "exceeds", maxAssets: 1n } }).kind).toBe("exceeds");
    expect(withdrawButton({ ...ok, preparing: true }).kind).toBe("preparing");
    expect(withdrawButton(ok).label).toBe("Withdraw");
    expect(withdrawButton({ ...ok, plan: { kind: "redeem_all", shares: 5n, expectedAssets: 5n } }).label).toBe("Withdraw all");
  });
});
