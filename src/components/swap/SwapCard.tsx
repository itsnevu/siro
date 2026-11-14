"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import type { Address } from "viem";
import { MIN_GAS_WEI, NATIVE_GAS_BUFFER_WEI, QUOTE_REFRESH_MS, SWAP_CHAIN_ID } from "@/lib/config/swap";
import { SWAP_TOKENS, type SwapToken } from "@/lib/config/tokens";
import { formatAmount, formatToken, parseAmount } from "@/lib/swap/format";
import { impactLevel, type ImpactLevel } from "@/lib/swap/priceImpact";
import { minOut as floorMinOut } from "@/lib/swap/minOut";
import { buttonState } from "@/lib/swap/buttonState";
import { useQuote } from "@/hooks/swap/useQuote";
import { useTokenBalance } from "@/hooks/swap/useTokenBalance";
import { useAllowance } from "@/hooks/swap/useAllowance";
import { useSwapExecution } from "@/hooks/swap/useSwapExecution";
import { useSlippageSettings } from "@/hooks/swap/useSlippageSettings";
import { TokenInput } from "./TokenInput";
import { TokenLogo } from "./TokenLogo";
import { TokenSelector } from "./TokenSelector";
import { FlipButton } from "./FlipButton";
import { QuoteDetails } from "./QuoteDetails";
import { SettingsPopover } from "./SettingsPopover";
import { PriceImpactBanner } from "./PriceImpactBanner";
import { GasWarning } from "./GasWarning";
import { ConfirmHighImpactDialog } from "./ConfirmHighImpactDialog";
import { SwapButton } from "./SwapButton";
import { TxStatusSheet } from "./TxStatusSheet";

export type VaultInfo = { address: Address; asset: Address; assetSymbol: string; assetDecimals: number; assetLogo: string; shareDecimals: number; name: string };
const RANK: Record<ImpactLevel, number> = { neutral: 0, muted: 1, orange: 2, red: 3, blocked: 4 };

export function SwapCard({ vault }: { vault: VaultInfo }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const { settings, update } = useSlippageSettings();
  const [token, setToken] = useState<SwapToken>(SWAP_TOKENS[0]);
  const [input, setInput] = useState("");
  const [pollingState, setPollingState] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const seenLevel = useRef<ImpactLevel>("neutral");

  const amount = useMemo(() => parseAmount(input, token.decimals), [input, token.decimals]);
  const tokenAddr = token.address;
  const balance = useTokenBalance(address, tokenAddr);
  const ethBalance = useTokenBalance(address, "native");
  const allowance = useAllowance(address, tokenAddr, pollingState);
  // Approval polling ends by itself once the allowance covers the amount (derived, not an effect).
  const polling = pollingState && !(allowance.data !== undefined && amount !== null && allowance.data >= amount);
  const quote = useQuote(token.routeAddress, vault.asset, amount);
  const exec = useSwapExecution();

  // Account switch mid-flow: drop the in-flight state so nothing is signed for the old account.
  const prevAddress = useRef(address);
  useEffect(() => { if (prevAddress.current !== address) { exec.reset(); setPollingState(false); setConfirmOpen(false); } prevAddress.current = address; }, [address, exec]);
  // StaleOracle (or any re-quotable error): refresh the quote so the button never re-submits stale numbers.
  const requote = quote.refetch;
  useEffect(() => { if (exec.phase === "error" && exec.error?.requote) requote(); }, [exec.phase, exec.error, requote]);

  const q = quote.status === "ready" || quote.status === "loading" ? quote.quote : null;
  const level = q ? impactLevel(q.impactPct) : "neutral";
  const correctChain = chainId === SWAP_CHAIN_ID;
  const needsApproval = tokenAddr !== "native" && amount !== null && amount > 0n && (allowance.data ?? 0n) < amount;
  const state = buttonState({
    connected: isConnected, correctChain, amount, balance: balance.data ?? null, symbol: token.symbol, quoteStatus: quote.status,
    needsApproval, approving: exec.phase === "approving" || polling, preparing: exec.phase === "preparing", impact: level,
  });
  const lowGas = isConnected && correctChain && ethBalance.data !== undefined && ethBalance.data < MIN_GAS_WEI;
  const minReceived = q ? floorMinOut(q.amountOut, settings.slippageBps) : 0n;

  const onMax = () => {
    if (balance.data === undefined) return;
    const max = tokenAddr === "native" ? (balance.data > NATIVE_GAS_BUFFER_WEI ? balance.data - NATIVE_GAS_BUFFER_WEI : 0n) : balance.data;
    setInput(formatAmount(max, token.decimals, token.decimals).replace(/,/g, ""));
  };

  const submit = () => {
    if (!q || !address) return;
    // Quote changed since the user looked, or is older than one refresh: re-quote and warn instead of executing silently.
    if (Date.now() - q.at > QUOTE_REFRESH_MS || RANK[level] > RANK[seenLevel.current]) {
      seenLevel.current = level;
      setNotice(RANK[level] > 1 ? "Price impact went up since your last look. Review the new quote, then press again." : "Quote refreshed. Review it, then press again.");
      quote.refetch();
      return;
    }
    exec.swap({ vault: vault.address, token: tokenAddr, quote: q, slippageBps: settings.slippageBps, deadlineSeconds: settings.deadlineSeconds });
  };
  useEffect(() => { if (quote.status === "ready" && q) { seenLevel.current = level; } }, [quote.status, q, level]);

  const onClick = async () => {
    setNotice(null);
    if (state.kind === "connect") { const c = connectors[0]; if (c) connect({ connector: c }); return; }
    if (state.kind === "wrong_network") { switchChain({ chainId: SWAP_CHAIN_ID }); return; }
    if (state.kind === "approve" && tokenAddr !== "native") { if (await exec.approve(tokenAddr)) { setPollingState(true); allowance.refetch(); } return; }
    if (state.kind === "swap") { if (level === "red") { setConfirmOpen(true); return; } submit(); }
  };

  const balanceLabels = useMemo(() => ({ [token.symbol]: balance.data !== undefined ? formatToken(balance.data, token.decimals, token.symbol) : "" }), [balance.data, token]);
  const staleOracle = exec.phase === "error" && exec.error?.kind === "stale_oracle";

  return (
    <section className="swap-card" aria-label="Swap into vault">
      <div className="swap-head">
        <h1>Deposit</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="chip num" aria-label={`Max slippage ${settings.slippageBps / 100} percent`}>{settings.slippageBps / 100}% slippage</span>
          <SettingsPopover settings={settings} update={update} />
        </div>
      </div>

      <TokenInput id="pay-amount" label="You pay" value={input} onChange={(v) => { setNotice(null); setInput(v); }} invalid={state.kind === "insufficient"}
        tokenSlot={<TokenSelector selected={token} onSelect={(t) => { setNotice(null); setToken(t); setInput(""); exec.reset(); }} balances={balanceLabels} />}
        balance={balance.data ?? null} decimals={token.decimals} symbol={token.symbol} onMax={isConnected ? onMax : undefined} />

      <FlipButton outSymbol={vault.assetSymbol} />

      <div className="swap-block" style={{ marginTop: 6 }} aria-live="polite" aria-busy={quote.status === "loading"}>
        <span className="label" id="receive-label">You deposit into {vault.name}</span>
        <div className="swap-row">
          <output className="amount-out num" aria-labelledby="receive-label">
            {quote.status === "loading" && !q ? <span className="skeleton" aria-label="Getting quote" /> : q ? formatAmount(q.amountOut, vault.assetDecimals, 6) : <span className="muted">0</span>}
          </output>
          <span className="token-pill" aria-disabled="true" aria-label={`Receive ${vault.assetSymbol}, set by the vault`}><TokenLogo src={vault.assetLogo} />{vault.assetSymbol}</span>
        </div>
        {quote.status === "no_route" && <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>No pool can route {token.symbol} to {vault.assetSymbol} right now.</p>}
        {quote.status === "error" && <p role="alert" style={{ fontSize: 13, margin: "8px 0 0", color: "var(--danger)" }}>{quote.error} <button type="button" className="max-btn" onClick={quote.refetch}>Retry</button></p>}
      </div>

      {q && <QuoteDetails quote={q} inSymbol={token.symbol} inDecimals={token.decimals} outSymbol={vault.assetSymbol} outDecimals={vault.assetDecimals} minReceived={minReceived} feeLabel={q.gasEstimate > 0n ? `~${q.gasEstimate.toLocaleString("en-US")} gas (< $0.01)` : "< $0.01"} />}
      {q && <PriceImpactBanner pct={q.impactPct} onReduce={() => amount !== null && setInput(formatAmount(amount / 2n, token.decimals, token.decimals).replace(/,/g, ""))} />}
      {staleOracle && (
        <div className="banner banner-orange" role="alert">
          <span aria-hidden>⏱</span><span style={{ flex: 1 }}>{exec.error?.message}</span>
          <button type="button" onClick={() => { exec.reset(); quote.refetch(); }}>Retry</button>
        </div>
      )}
      {notice && <div className="banner banner-muted" role="status">{notice}</div>}
      <GasWarning show={lowGas} />
      <SwapButton state={state} onClick={onClick} />

      <ConfirmHighImpactDialog open={confirmOpen} pct={q?.impactPct ?? 0} onCancel={() => setConfirmOpen(false)} onConfirm={() => { setConfirmOpen(false); submit(); }} />
      <TxStatusSheet exec={exec} shareDecimals={vault.shareDecimals} onClose={() => { if (exec.phase === "success") setInput(""); exec.reset(); }} onRetry={() => { exec.reset(); quote.refetch(); }} />
    </section>
  );
}
