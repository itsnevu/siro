"use client";
import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { FEE_TIERS, QUOTE_DEBOUNCE_MS, QUOTE_REFRESH_MS, SWAP, SWAP_CHAIN_ID, type FeeTier } from "@/lib/config/swap";
import { quoterV2Abi, v3FactoryAbi, v3PoolAbi, erc20Abi } from "@/lib/swap/abis";
import { depthCap } from '@/lib/swap/depthCap';
import { selectBestQuote, type TierQuote } from "@/lib/swap/quotes";
import { priceImpactPct } from "@/lib/swap/priceImpact";

export type Quote = { fee: FeeTier; amountIn: bigint; amountOut: bigint; impactPct: number; gasEstimate: bigint; pool: Address; at: number; depositLimit?: bigint; inputDepth?: bigint; blockNumber?: bigint };
export type QuoteStatus = "idle" | "loading" | "ready" | "no_route" | "error";
export type QuoteState = { status: QuoteStatus; quote: Quote | null; error: string | null };
type Settled = { key: string; status: Exclude<QuoteStatus, "idle" | "loading">; quote: Quote | null; error: string | null };

/**
 * Quotes every fee tier on QuoterV2 (debounced 300ms, refreshed every 10s), keeps the best allowed
 * output (selectBestQuote applies the tier exclusion) and computes impact against slot0 spot.
 * Each request has an AbortController; a newer input aborts the older one. Results are keyed by the
 * request, so "loading" is derived and a quote for a different amount is never shown.
 */
export function useQuote(tokenIn: Address | undefined, tokenOut: Address | undefined, amountIn: bigint | null) {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  const [settled, setSettled] = useState<Settled | null>(null);
  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const ready = !!client && !!tokenIn && !!tokenOut && amountIn !== null && amountIn > 0n && tokenIn.toLowerCase() !== tokenOut.toLowerCase();
  const key = ready ? `${tokenIn}|${tokenOut}|${amountIn}|${nonce}` : "";

  useEffect(() => {
    if (!key || !client || !tokenIn || !tokenOut || amountIn === null) return;
    const ac = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
        const tiers = await Promise.all(FEE_TIERS.map(async (fee): Promise<TierQuote | null> => {
          try {
            const { result } = await client.simulateContract({
              address: SWAP.quoterV2, abi: quoterV2Abi, functionName: "quoteExactInputSingle",
              blockNumber,
              args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
            });
            return { fee, amountOut: result[0], gasEstimate: result[3] };
          } catch { return null; }
        }));
        if (ac.signal.aborted) return;
        const best = selectBestQuote(tiers.filter((t): t is TierQuote => t !== null));
        if (!best) { setSettled({ key, status: "no_route", quote: null, error: null }); return; }
        const pool = await client.readContract({ address: SWAP.v3Factory, abi: v3FactoryAbi, functionName: "getPool", args: [tokenIn, tokenOut, best.fee] });
        const [slot0, liquidity, inputBalance] = await Promise.all([
          client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'slot0', blockNumber }),
          client.readContract({ address: pool, abi: v3PoolAbi, functionName: 'liquidity', blockNumber }),
          client.readContract({ address: tokenIn, abi: erc20Abi, functionName: 'balanceOf', args: [pool], blockNumber }),
        ]);
        if (ac.signal.aborted) return;
        const zeroForOne = tokenIn.toLowerCase() < tokenOut.toLowerCase();
        const capacity = depthCap(liquidity, slot0[0], inputBalance, zeroForOne);
        setSettled({
          key, status: "ready", error: null,
          quote: { fee: best.fee, amountIn, amountOut: best.amountOut, impactPct: priceImpactPct(amountIn, best.amountOut, slot0[0], zeroForOne), gasEstimate: best.gasEstimate ?? 0n, pool, at: Date.now(), depositLimit: capacity.limit, inputDepth: capacity.depth, blockNumber },
        });
      } catch {
        if (!ac.signal.aborted) setSettled({ key, status: "error", quote: null, error: "Could not get a quote. Check your connection and try again." });
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => { clearTimeout(timer); ac.abort(); };
  }, [key, client, tokenIn, tokenOut, amountIn]);

  const current = settled?.key === key ? settled : null;
  useEffect(() => {
    if (current?.status !== "ready") return;
    const id = setTimeout(refetch, QUOTE_REFRESH_MS);
    return () => clearTimeout(id);
  }, [current, refetch]);

  if (!ready) return { status: "idle" as QuoteStatus, quote: null, error: null, refetch };
  if (current) return { status: current.status as QuoteStatus, quote: current.quote, error: current.error, refetch };
  // In flight: keep the previous quote only while the amount is unchanged (a refresh), never for a new amount.
  const keep = settled?.quote && settled.quote.amountIn === amountIn && settled.key.startsWith(`${tokenIn}|${tokenOut}|`) ? settled.quote : null;
  return { status: "loading" as QuoteStatus, quote: keep, error: null, refetch };
}
