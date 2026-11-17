const Q96 = 2n ** 96n;
/** UI policy: 0.25% of active virtual input reserve, capped by actual inventory.
 * Concentrated liquidity can change at a tick, so an exact Quoter check is also mandatory.
 */
export function depthCap(liquidity: bigint, sqrtPriceX96: bigint, inputBalance: bigint, zeroForOne: boolean) {
  if (liquidity <= 0n || sqrtPriceX96 <= 0n || inputBalance <= 0n) return { depth: 0n, limit: 0n };
  const virtual = zeroForOne ? liquidity * Q96 / sqrtPriceX96 : liquidity * sqrtPriceX96 / Q96;
  const depth = virtual < inputBalance ? virtual : inputBalance;
  return { depth, limit: depth * 25n / 10000n };
}
