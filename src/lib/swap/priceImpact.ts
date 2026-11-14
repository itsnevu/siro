import { IMPACT_PCT } from "@/lib/config/swap";

const Q96 = 2n ** 96n;
const SCALE = 10n ** 18n;

/**
 * Spot price of token1 in token0 units from a pool's slot0 sqrtPriceX96 (TickMath encoding:
 * sqrtPriceX96 = sqrt(token1/token0) * 2^96, raw units), returned as raw out-per-in scaled by 1e18.
 */
export function spotOutPerIn(sqrtPriceX96: bigint, zeroForOne: boolean): bigint {
  if (sqrtPriceX96 <= 0n) throw new RangeError("sqrtPriceX96 must be positive");
  const priceX192 = sqrtPriceX96 * sqrtPriceX96; // token1/token0 * 2^192
  return zeroForOne ? (priceX192 * SCALE) / (Q96 * Q96) : (Q96 * Q96 * SCALE) / priceX192;
}

/**
 * Price impact in percent: how much worse the quoted execution rate is than the pre-trade spot.
 * Includes the pool fee. Never negative (a better-than-spot quote reports 0).
 */
export function priceImpactPct(amountIn: bigint, quotedOut: bigint, sqrtPriceX96: bigint, zeroForOne: boolean): number {
  if (amountIn <= 0n) return 0;
  const spot = spotOutPerIn(sqrtPriceX96, zeroForOne);
  if (spot === 0n) return 100;
  const exec = (quotedOut * SCALE) / amountIn;
  if (exec >= spot) return 0;
  return Number(((spot - exec) * 1_000_000n) / spot) / 10_000;
}

export type ImpactLevel = "neutral" | "muted" | "orange" | "red" | "blocked";
export function impactLevel(pct: number): ImpactLevel {
  if (pct > IMPACT_PCT.block) return "blocked";
  if (pct > IMPACT_PCT.red) return "red";
  if (pct >= IMPACT_PCT.orange) return "orange";
  if (pct >= IMPACT_PCT.muted) return "muted";
  return "neutral";
}
