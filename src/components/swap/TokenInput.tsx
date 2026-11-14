"use client";
import type { ReactNode } from "react";
import { formatToken } from "@/lib/swap/format";

/** Pay block: large tabular amount, token pill slot, balance and Max. */
export function TokenInput(props: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  tokenSlot: ReactNode; balance: bigint | null; decimals: number; symbol: string;
  onMax?: () => void; invalid?: boolean;
}) {
  return (
    <div className="swap-block">
      <label htmlFor={props.id}>{props.label}</label>
      <div className="swap-row">
        <input
          id={props.id} className="amount-input num" inputMode="decimal" autoComplete="off" spellCheck={false}
          placeholder="0" value={props.value} aria-invalid={props.invalid || undefined}
          onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v) && v.length <= 40) props.onChange(v); }}
        />
        {props.tokenSlot}
      </div>
      <div className="swap-row muted" style={{ fontSize: 13 }}>
        <span className="num">{props.balance === null ? "Balance —" : `Balance ${formatToken(props.balance, props.decimals, props.symbol)}`}</span>
        {props.onMax && props.balance !== null && props.balance > 0n ? <button type="button" className="max-btn" onClick={props.onMax} aria-label={`Use maximum ${props.symbol}`}>Max</button> : null}
      </div>
    </div>
  );
}
