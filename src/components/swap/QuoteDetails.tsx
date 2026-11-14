"use client";
import { useEffect, useState } from "react";
import { QUOTE_REFRESH_MS } from "@/lib/config/swap";
import { formatPct, formatToken } from "@/lib/swap/format";
import { impactLevel } from "@/lib/swap/priceImpact";
import type { Quote } from "@/hooks/swap/useQuote";
import { RouteDisplay } from "./RouteDisplay";

function RefreshRing({ at }: { at: number }) {
  const [p, setP] = useState(0);
  useEffect(() => { const id = setInterval(() => setP(Math.min(1, (Date.now() - at) / QUOTE_REFRESH_MS)), 250); return () => clearInterval(id); }, [at]);
  const c = 2 * Math.PI * 6;
  return (
    <svg className="refresh-ring" viewBox="0 0 16 16" role="img" aria-label="Quote refreshes every 10 seconds">
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 8 8)" />
    </svg>
  );
}

/** Collapsed: one rate line. Expanded: rate, impact, minimum received, network fee, route, refresh ring. */
export function QuoteDetails(props: { quote: Quote; inSymbol: string; inDecimals: number; outSymbol: string; outDecimals: number; minReceived: bigint; feeLabel: string }) {
  const [open, setOpen] = useState(false);
  const q = props.quote;
  const rate = q.amountIn > 0n ? (q.amountOut * 10n ** BigInt(props.inDecimals)) / q.amountIn : 0n;
  const level = impactLevel(q.impactPct);
  return (
    <div className="details">
      <button type="button" aria-expanded={open} aria-controls="quote-details" onClick={() => setOpen((o) => !o)}>
        <span className="num">1 {props.inSymbol} = {formatToken(rate, props.outDecimals, props.outSymbol)}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><RefreshRing at={q.at} /><span aria-hidden>{open ? "▴" : "▾"}</span></span>
      </button>
      {open && (
        <dl id="quote-details">
          <dt>Price impact</dt>
          <dd className="num" style={{ color: level === "neutral" || level === "muted" ? undefined : level === "orange" ? "var(--warning)" : "var(--danger)" }}>
            {formatPct(q.impactPct)} <span className="muted">({level === "neutral" ? "low" : level === "muted" ? "moderate" : level === "orange" ? "high" : "very high"})</span>
          </dd>
          <dt>Minimum received</dt><dd className="num">{formatToken(props.minReceived, props.outDecimals, props.outSymbol)}</dd>
          <dt>Network fee</dt><dd className="num">{props.feeLabel}</dd>
          <dt>Route</dt><dd><RouteDisplay fee={q.fee} inSymbol={props.inSymbol} outSymbol={props.outSymbol} /></dd>
        </dl>
      )}
    </div>
  );
}
