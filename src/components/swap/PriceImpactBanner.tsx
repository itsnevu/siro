import { formatPct } from "@/lib/swap/format";
import { impactLevel } from "@/lib/swap/priceImpact";

/** Impact never shown by colour alone: every level has words and an icon. */
export function PriceImpactBanner({ pct, onReduce }: { pct: number; onReduce: () => void }) {
  const level = impactLevel(pct);
  if (level === "neutral") return null;
  if (level === "muted") return <div className="banner banner-muted" role="status">Price impact {formatPct(pct)}. Moderate for this size.</div>;
  const cls = level === "orange" ? "banner banner-orange" : "banner banner-red";
  const text = level === "orange" ? `High price impact: ${formatPct(pct)}.` : level === "red" ? `Very high price impact: ${formatPct(pct)}. You will be asked to confirm.` : `Price impact ${formatPct(pct)} is above 15%. Swapping is blocked.`;
  return (
    <div className={cls} role="alert">
      <span aria-hidden>⚠</span>
      <span style={{ flex: 1 }}>{text}</span>
      {level === "blocked" && <button type="button" onClick={onReduce}>Halve amount</button>}
    </div>
  );
}
