"use client";
import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { ALL_CHAINS } from "@/lib/chains";
import { SWAP_CHAIN_ID } from "@/lib/config/swap";
import { formatAmount, formatToken, parseAmount, shortAddress } from "@/lib/swap/format";
import { planWithdraw, withdrawButton } from "@/lib/withdraw/plan";
import { usePosition, useWithdrawExecution } from "@/hooks/withdraw/useWithdraw";
import { TokenLogo } from "@/components/swap/TokenLogo";
import type { VaultInfo } from "@/components/swap/SwapCard";

const EXPLORER = ALL_CHAINS[SWAP_CHAIN_ID]?.explorerUrl;
const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;

export function WithdrawCard({ vault }: { vault: VaultInfo }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isMax, setIsMax] = useState(false);
  const position = usePosition(vault.address, address);
  const exec = useWithdrawExecution(vault.address);

  const pos = position.data;
  const amount = useMemo(() => parseAmount(input, vault.assetDecimals), [input, vault.assetDecimals]);
  const plan = pos ? planWithdraw({ assets: amount, isMax, maxAssets: pos.maxAssets, maxShares: pos.maxShares, previewRedeemAll: pos.previewRedeemAll }) : { kind: "none" as const };
  const button = withdrawButton({ connected: isConnected, correctChain: chainId === SWAP_CHAIN_ID, maxShares: pos?.maxShares ?? null, plan, preparing: exec.phase === "preparing" });
  const busy = button.kind === "preparing";
  const receive = plan.kind === "redeem_all" ? plan.expectedAssets : plan.kind === "withdraw" ? plan.assets : null;

  const onClick = () => {
    if (button.kind === "connect") { const c = connectors[0]; if (c) connect({ connector: c }); return; }
    if (button.kind === "wrong_network") { switchChain({ chainId: SWAP_CHAIN_ID }); return; }
    if (button.kind === "withdraw") exec.execute(plan);
  };
  const close = () => {
    if (exec.phase === "success") { setInput(""); setIsMax(false); queryClient.invalidateQueries({ queryKey: ["vault-position"] }); }
    exec.reset();
  };
  const sheetOpen = exec.phase === "confirming" || exec.phase === "pending" || exec.phase === "success" || exec.phase === "error";
  const title = exec.phase === "confirming" ? "Confirm in your wallet" : exec.phase === "pending" ? "Withdrawing…" : exec.phase === "success" ? "Withdrawn" : "Withdraw failed";

  return (
    <section className="swap-card" aria-label="Withdraw from vault">
      <div className="swap-head"><h1>Withdraw</h1><span className="chip">{vault.name}</span></div>

      <div className="swap-block">
        <span className="label">Your position</span>
        <div className="swap-row" aria-live="polite" aria-busy={position.isLoading}>
          <span className="amount-out num">
            {!isConnected ? <span className="muted">—</span> : position.isLoading ? <span className="skeleton" aria-label="Loading position" /> : pos ? formatAmount(pos.maxAssets, vault.assetDecimals, 2) : <span className="muted">—</span>}
          </span>
          <span className="token-pill" aria-disabled="true"><TokenLogo src={vault.assetLogo} />{vault.assetSymbol}</span>
        </div>
        <div className="muted num" style={{ fontSize: 13, marginTop: 6 }}>
          {pos ? `${formatAmount(pos.shares, vault.shareDecimals, 4)} shares` : isConnected && position.isError ? "Could not read your position. Retrying…" : "Connect a wallet to see your position"}
        </div>
      </div>

      <div className="swap-block" style={{ marginTop: 8 }}>
        <label htmlFor="withdraw-amount">Amount to withdraw</label>
        <div className="swap-row">
          <input id="withdraw-amount" className="amount-input num" inputMode="decimal" autoComplete="off" placeholder="0" value={input}
            aria-invalid={button.kind === "exceeds" || undefined}
            onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v) && v.length <= 40) { setIsMax(false); setInput(v); } }} />
          <span className="token-pill" aria-disabled="true"><TokenLogo src={vault.assetLogo} />{vault.assetSymbol}</span>
        </div>
        <div className="swap-row muted" style={{ fontSize: 13 }}>
          <span className="num">{receive !== null ? `You receive ≈ ${formatToken(receive, vault.assetDecimals, vault.assetSymbol)}` : " "}</span>
          {pos && pos.maxAssets > 0n && <button type="button" className="max-btn" onClick={() => { setIsMax(true); setInput(formatAmount(pos.maxAssets, vault.assetDecimals, vault.assetDecimals).replace(/,/g, "")); }}>Max</button>}
        </div>
      </div>

      {exec.phase === "error" && exec.error?.kind === "stale_oracle" && (
        <div className="banner banner-orange" role="alert"><span aria-hidden>⏱</span><span style={{ flex: 1 }}>{exec.error.message}</span><button type="button" onClick={() => { exec.reset(); position.refetch(); }}>Retry</button></div>
      )}
      <button type="button" className="swap-btn" data-state={button.kind} disabled={!["connect", "wrong_network", "withdraw"].includes(button.kind)} aria-busy={busy || undefined} onClick={onClick}>
        {busy && <span className="spinner" aria-hidden />}{button.label}
      </button>
      <p className="muted" style={{ fontSize: 12, margin: "12px 2px 0", lineHeight: 1.5 }}>Withdrawals go to your connected wallet. No approval is needed: you are redeeming your own shares.</p>

      <Dialog.Root open={sheetOpen && !(exec.phase === "error" && exec.error?.kind === "stale_oracle")} onOpenChange={(o) => { if (!o && exec.phase !== "pending" && exec.phase !== "confirming") close(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="sheet" aria-live="polite">
            <div className="dialog-head"><Dialog.Title style={{ fontSize: 18, margin: 0 }}>{title}</Dialog.Title>{exec.phase !== "pending" && exec.phase !== "confirming" && <Dialog.Close className="icon-btn" aria-label="Close">{X}</Dialog.Close>}</div>
            <Dialog.Description className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {exec.phase === "confirming" && "Review the transaction in your wallet. Nothing is sent until you approve it there."}
              {exec.phase === "pending" && "Waiting for Robinhood Chain to confirm."}
              {exec.phase === "success" && exec.assets !== null && <>Sent <span className="num">{formatToken(exec.assets, vault.assetDecimals, vault.assetSymbol)}</span> to your wallet.</>}
              {exec.phase === "error" && exec.error?.message}
            </Dialog.Description>
            {exec.hash && EXPLORER && <p style={{ margin: "12px 0 0" }}><a href={`${EXPLORER}/tx/${exec.hash}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>View transaction {shortAddress(exec.hash, 6)} ↗</a></p>}
            {exec.phase !== "pending" && exec.phase !== "confirming" && <button type="button" className="swap-btn" style={{ background: "var(--surface)", color: "var(--text)" }} onClick={close}>Close</button>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
