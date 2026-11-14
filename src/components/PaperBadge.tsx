import type { ReactNode } from "react";

/**
 * The one paper-mode marker. Live trading is gated by walk-forward validation, so every strategy
 * or PnL figure carries this badge inline, next to the number, so it survives any screenshot crop.
 * A missing badge anywhere a strategy result is shown is a bug.
 */
export function PaperBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 h-[22px] text-[11px] font-extrabold tracking-[0.08em] ${className}`}
      style={{ background: "var(--gradient-brand)", color: "var(--text-on-light, #1B1620)" }}
      title="Paper mode: real prices and real fees, no real orders"
      aria-label="Paper mode"
    >
      PAPER
    </span>
  );
}

/** Wraps one strategy figure; in paper mode the PAPER badge sits right next to the number. */
export function PaperFig({ mode, children }: { mode: string; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap">{children}{mode === "paper" && <PaperBadge />}</span>;
}
