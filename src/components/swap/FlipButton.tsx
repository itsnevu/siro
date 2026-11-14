"use client";
import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

/**
 * Round button on the seam. A zap only goes one way (any token into the vault asset), so it does
 * not swap the sides: it turns 180° and explains why, instead of being a dead control.
 */
export function FlipButton({ outSymbol }: { outSymbol: string }) {
  const [turned, setTurned] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <div className="seam">
      <Tooltip.Provider delayDuration={0}>
        <Tooltip.Root open={open} onOpenChange={setOpen}>
          <Tooltip.Trigger asChild>
            <button type="button" className="flip-btn" data-turned={turned} aria-label={`Direction is fixed: deposits always go into the vault in ${outSymbol}`}
              onClick={() => { setTurned((t) => !t); setOpen(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v16m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Content className="tooltip" side="right">Deposits always go into the vault in {outSymbol}.</Tooltip.Content></Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
  );
}
