import { EXCLUDED_FEE_TIERS, type FeeTier } from "@/lib/config/swap";

export type TierQuote = { fee: FeeTier; amountOut: bigint; sqrtPriceX96After?: bigint; gasEstimate?: bigint };

/** Structured log record; never free-form console.log. */
export type QuoteLogEvent = { event: "excluded_tier_would_win"; excludedFee: FeeTier; excludedOut: string; chosenFee: FeeTier | null; chosenOut: string | null };
export type QuoteLogger = (e: QuoteLogEvent) => void;

export const defaultQuoteLogger: QuoteLogger = (e) => {
  if (typeof console !== "undefined") console.info(JSON.stringify({ scope: "swap.quote", ...e }));
};

/**
 * Best output across allowed tiers. EXCLUDED_FEE_TIERS is applied here and only here: an excluded
 * tier never wins, even with a better number; when it would have won, one structured event is logged.
 */
export function selectBestQuote(quotes: readonly TierQuote[], log: QuoteLogger = defaultQuoteLogger): TierQuote | null {
  let best: TierQuote | null = null;
  let bestExcluded: TierQuote | null = null;
  for (const q of quotes) {
    if (q.amountOut <= 0n) continue;
    if (EXCLUDED_FEE_TIERS.includes(q.fee)) {
      if (!bestExcluded || q.amountOut > bestExcluded.amountOut) bestExcluded = q;
      continue;
    }
    if (!best || q.amountOut > best.amountOut) best = q;
  }
  if (bestExcluded && (!best || bestExcluded.amountOut > best.amountOut)) {
    log({ event: "excluded_tier_would_win", excludedFee: bestExcluded.fee, excludedOut: bestExcluded.amountOut.toString(), chosenFee: best?.fee ?? null, chosenOut: best?.amountOut.toString() ?? null });
  }
  return best;
}
