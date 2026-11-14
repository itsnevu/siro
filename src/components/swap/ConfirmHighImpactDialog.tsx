"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { formatPct } from "@/lib/swap/format";

/** Required above 5% impact. Cancel is the default focus; confirming is a deliberate second step. */
export function ConfirmHighImpactDialog({ open, pct, onCancel, onConfirm }: { open: boolean; pct: number; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog" role="alertdialog">
          <div className="dialog-head"><Dialog.Title>Very high price impact</Dialog.Title><Dialog.Close className="icon-btn" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></Dialog.Close></div>
          <Dialog.Description className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            This swap moves the price by <b className="num" style={{ color: "var(--danger)" }}>{formatPct(pct)}</b>. You will receive noticeably less than the market rate. A smaller amount usually has lower impact.
          </Dialog.Description>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="swap-btn" style={{ marginTop: 0, background: "var(--surface-hover)", color: "var(--text)" }} onClick={onCancel} autoFocus>Cancel</button>
            <button type="button" className="swap-btn" data-tone="danger" style={{ marginTop: 0 }} onClick={onConfirm}>Swap anyway</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
