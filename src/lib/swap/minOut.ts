/** Basis points denominator. */
export const BPS = 10_000n;

/**
 * Minimum acceptable output for a quote at a slippage tolerance, rounded DOWN (floor).
 * Never rounds up: a rounded-up minimum could make an honest fill revert.
 */
export function minOut(quoted: bigint, slippageBps: number): bigint {
  if (quoted < 0n) throw new RangeError("quoted amount must be non-negative");
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) throw new RangeError("slippage must be an integer in [0, 10000] bps");
  return (quoted * (BPS - BigInt(slippageBps))) / BPS;
}
