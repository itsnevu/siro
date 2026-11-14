import type { FeeTier } from "@/lib/config/swap";

/** Single-hop route chip: input → Uniswap v3 pool (fee tier) → vault asset → vault. */
export function RouteDisplay({ fee, inSymbol, outSymbol }: { fee: FeeTier; inSymbol: string; outSymbol: string }) {
  return (
    <span className="chip" aria-label={`Route: ${inSymbol} through Uniswap v3 ${fee / 10_000}% pool to ${outSymbol}, then deposit to the vault`}>
      {inSymbol} → v3 {fee / 10_000}% → {outSymbol} → vault
    </span>
  );
}
