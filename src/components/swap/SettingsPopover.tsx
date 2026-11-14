"use client";
import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DEADLINE_PRESETS_SECONDS, DEADLINE_WARN_SECONDS, MAX_SLIPPAGE_BPS, SLIPPAGE_PRESETS_BPS, SLIPPAGE_WARN_BPS } from "@/lib/config/swap";
import type { SwapSettings } from "@/hooks/swap/useSlippageSettings";

const label = (s: number) => (s < 60 ? `${s}s` : `${s / 60}m`);

/** Slippage presets 0.1/0.3/0.5% + custom; deadline 30s/2m/10m + custom. Warns above 2% or 30 min, never blocks. */
export function SettingsPopover({ settings, update }: { settings: SwapSettings; update: (s: Partial<SwapSettings>) => void }) {
  const [customSlip, setCustomSlip] = useState("");
  const [customMin, setCustomMin] = useState("");
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="icon-btn" aria-label="Swap settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.6" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="popover" sideOffset={8} align="end">
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Max slippage</legend>
            <div className="seg">
              {SLIPPAGE_PRESETS_BPS.map((b) => <button key={b} type="button" aria-pressed={settings.slippageBps === b} onClick={() => { setCustomSlip(""); update({ slippageBps: b }); }}>{b / 100}%</button>)}
              <input aria-label="Custom slippage percent" inputMode="decimal" placeholder="Custom" value={customSlip}
                onChange={(e) => { const v = e.target.value; setCustomSlip(v); const n = Math.round(Number(v) * 100); if (v && Number.isFinite(n) && n >= 0 && n <= MAX_SLIPPAGE_BPS) update({ slippageBps: n }); }} />
            </div>
            {settings.slippageBps > SLIPPAGE_WARN_BPS && <p role="alert" style={{ color: "var(--warning)", margin: "8px 0 0" }}>High slippage: you may receive much less than quoted.</p>}
            {settings.slippageBps === 0 && <p style={{ color: "var(--text-muted)", margin: "8px 0 0" }}>0% slippage: any price move will make the transaction fail.</p>}
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
            <legend>Transaction deadline</legend>
            <div className="seg">
              {DEADLINE_PRESETS_SECONDS.map((s) => <button key={s} type="button" aria-pressed={settings.deadlineSeconds === s} onClick={() => { setCustomMin(""); update({ deadlineSeconds: s }); }}>{label(s)}</button>)}
              <input aria-label="Custom deadline in minutes" inputMode="numeric" placeholder="min" value={customMin}
                onChange={(e) => { const v = e.target.value; setCustomMin(v); const n = Number(v) * 60; if (v && Number.isInteger(n) && n >= 60) update({ deadlineSeconds: n }); }} />
            </div>
            {settings.deadlineSeconds > DEADLINE_WARN_SECONDS && <p role="alert" style={{ color: "var(--warning)", margin: "8px 0 0" }}>Long deadline: a stale transaction may execute at a worse price.</p>}
          </fieldset>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
