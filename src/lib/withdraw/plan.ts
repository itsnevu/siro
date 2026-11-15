/**
 * Withdraw planning for an ERC-4626 GuardedVault. The owner withdraws their own shares, so no
 * approval is needed (ERC-4626 only checks allowance when caller != owner).
 *
 * Max uses redeem(maxRedeem) so no share dust is left; any other amount uses withdraw(assets),
 * which burns the rounded-up share count. Both are simulated before sending.
 */
export type WithdrawPlan =
  | { kind: "none" }
  | { kind: "exceeds"; maxAssets: bigint }
  | { kind: "redeem_all"; shares: bigint; expectedAssets: bigint }
  | { kind: "withdraw"; assets: bigint };

export function planWithdraw(input: { assets: bigint | null; isMax: boolean; maxAssets: bigint; maxShares: bigint; previewRedeemAll: bigint }): WithdrawPlan {
  if (input.isMax) return input.maxShares > 0n ? { kind: "redeem_all", shares: input.maxShares, expectedAssets: input.previewRedeemAll } : { kind: "none" };
  if (input.assets === null || input.assets <= 0n) return { kind: "none" };
  if (input.assets > input.maxAssets) return { kind: "exceeds", maxAssets: input.maxAssets };
  if (input.assets === input.maxAssets && input.maxShares > 0n) return { kind: "redeem_all", shares: input.maxShares, expectedAssets: input.previewRedeemAll };
  return { kind: "withdraw", assets: input.assets };
}

export type WithdrawButton =
  | { kind: "connect"; label: "Connect wallet" }
  | { kind: "wrong_network"; label: "Switch to Robinhood Chain" }
  | { kind: "no_position"; label: "No vault shares to withdraw" }
  | { kind: "enter_amount"; label: "Enter an amount" }
  | { kind: "exceeds"; label: "Amount exceeds your withdrawable balance" }
  | { kind: "preparing"; label: "Preparing…" }
  | { kind: "withdraw"; label: "Withdraw" | "Withdraw all" };

/** Strict order: the first unmet condition wins. */
export function withdrawButton(i: { connected: boolean; correctChain: boolean; maxShares: bigint | null; plan: WithdrawPlan; preparing: boolean }): WithdrawButton {
  if (!i.connected) return { kind: "connect", label: "Connect wallet" };
  if (!i.correctChain) return { kind: "wrong_network", label: "Switch to Robinhood Chain" };
  if (i.maxShares !== null && i.maxShares === 0n) return { kind: "no_position", label: "No vault shares to withdraw" };
  if (i.plan.kind === "none") return { kind: "enter_amount", label: "Enter an amount" };
  if (i.plan.kind === "exceeds") return { kind: "exceeds", label: "Amount exceeds your withdrawable balance" };
  if (i.preparing) return { kind: "preparing", label: "Preparing…" };
  return { kind: "withdraw", label: i.plan.kind === "redeem_all" ? "Withdraw all" : "Withdraw" };
}
