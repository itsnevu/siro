export type RebalanceHolding = { token: string; balance: bigint; value: bigint; targetBps: number };
export function rebalancePlan(base: string, holdings: RebalanceHolding[], nav: bigint, maxTradeBps: number, driftBps: number) {
  if (nav <= 0n || !Number.isInteger(maxTradeBps) || maxTradeBps < 1 || maxTradeBps > 10000 || !Number.isInteger(driftBps) || driftBps < 1 || driftBps > 10000) return null;
  const cap = nav * BigInt(maxTradeBps) / 10000n, threshold = nav * BigInt(driftBps) / 10000n;
  const minimum = (a: bigint, b: bigint) => a < b ? a : b;
  const positions = holdings.filter(h => h.token.toLowerCase() !== base.toLowerCase());
  // Sell excess first, including holdings removed from the target allocation.
  for (const h of positions) {
    const excess = h.value - nav * BigInt(h.targetBps) / 10000n;
    if (excess <= threshold || h.value <= 0n) continue;
    const amountIn = h.balance * minimum(excess, cap) / h.value;
    if (amountIn > 0n) return { tokenIn: h.token, tokenOut: base, amountIn };
  }
  const cash = holdings.find(h => h.token.toLowerCase() === base.toLowerCase())?.balance || 0n;
  for (const h of positions) {
    const deficit = nav * BigInt(h.targetBps) / 10000n - h.value;
    if (deficit <= threshold) continue;
    const amountIn = minimum(cash, minimum(deficit, cap));
    if (amountIn > 0n) return { tokenIn: base, tokenOut: h.token, amountIn };
  }
  return null;
}
