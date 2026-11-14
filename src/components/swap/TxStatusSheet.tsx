"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { ALL_CHAINS } from "@/lib/chains";
import { SWAP_CHAIN_ID } from "@/lib/config/swap";
import { formatAmount, shortAddress } from "@/lib/swap/format";
import type { ExecState } from "@/hooks/swap/useSwapExecution";

const EXPLORER = ALL_CHAINS[SWAP_CHAIN_ID]?.explorerUrl;

/** Bottom sheet for the swap transaction lifecycle: confirm in wallet, pending, success, error. */
export function TxStatusSheet({ exec, shareDecimals, onClose, onRetry }: { exec: ExecState; shareDecimals: number; onClose: () => void; onRetry: () => void }) {
  const open = exec.phase === "confirming" || exec.phase === "pending" || exec.phase === "success" || (exec.phase === "error" && exec.error?.kind !== "stale_oracle");
  const title = exec.phase === "confirming" ? "Confirm in your wallet" : exec.phase === "pending" ? "Swapping and depositing…" : exec.phase === "success" ? "Deposited" : "Transaction failed";
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o && exec.phase !== "pending") onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="sheet" aria-live="polite">
          <Dialog.Title style={{ fontSize: 18, margin: 0 }}>{title}</Dialog.Title>
          <Dialog.Description className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {exec.phase === "confirming" && "Review the transaction in your wallet. Nothing is sent until you approve it there."}
            {exec.phase === "pending" && "Waiting for Robinhood Chain to confirm. You can keep this sheet open."}
            {exec.phase === "success" && exec.shares !== null && <>Vault shares received: <span className="num">{formatAmount(exec.shares, shareDecimals, 4)}</span>. The swap was real; the agent strategy runs in paper mode.</>}
            {exec.phase === "error" && exec.error?.message}
          </Dialog.Description>
          {exec.hash && EXPLORER && (
            <p style={{ margin: "12px 0 0" }}><a href={`${EXPLORER}/tx/${exec.hash}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>View transaction {shortAddress(exec.hash, 6)} ↗</a></p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            {exec.phase === "error" && exec.error?.requote && <button type="button" className="swap-btn" onClick={onRetry}>Get a new quote</button>}
            {exec.phase !== "pending" && exec.phase !== "confirming" && <button type="button" className="swap-btn" style={{ background: "var(--surface-hover)", color: "var(--text)" }} onClick={onClose}>Close</button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
