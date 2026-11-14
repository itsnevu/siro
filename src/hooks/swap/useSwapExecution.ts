"use client";
import { useCallback, useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { maxUint256, type Address, type Hash } from "viem";
import { SWAP, SWAP_CHAIN_ID } from "@/lib/config/swap";
import { NATIVE_TOKEN_IN } from "@/lib/config/tokens";
import { erc20Abi, guardedVaultAbi, siroZapAbi } from "@/lib/swap/abis";
import { decodeSwapError, type SwapError } from "@/lib/swap/errors";
import { minOut as floorMinOut } from "@/lib/swap/minOut";
import type { Quote } from "./useQuote";

export type ExecPhase = "idle" | "approving" | "preparing" | "confirming" | "pending" | "success" | "error";
export type ExecState = { phase: ExecPhase; hash: Hash | null; error: SwapError | null; shares: bigint | null };
const IDLE: ExecState = { phase: "idle", hash: null, error: null, shares: null };

/**
 * Approve and swapAndDeposit. Every write is simulated first (simulateContract); a revert surfaces
 * decoded copy and nothing is sent. Native ETH sends msg.value exactly equal to amountIn.
 */
export function useSwapExecution() {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  const { data: wallet } = useWalletClient({ chainId: SWAP_CHAIN_ID });
  const [state, setState] = useState<ExecState>(IDLE);
  const reset = useCallback(() => setState(IDLE), []);

  const approve = useCallback(async (token: Address): Promise<boolean> => {
    if (!client || !wallet) return false;
    setState({ ...IDLE, phase: "approving" });
    try {
      const { request } = await client.simulateContract({ account: wallet.account, address: token, abi: erc20Abi, functionName: "approve", args: [SWAP.siroZap, maxUint256] });
      const hash = await wallet.writeContract(request);
      setState({ ...IDLE, phase: "approving", hash });
      await client.waitForTransactionReceipt({ hash });
      setState(IDLE);
      return true;
    } catch (e) {
      setState({ ...IDLE, phase: "error", error: decodeSwapError(e) });
      return false;
    }
  }, [client, wallet]);

  const swap = useCallback(async (args: { vault: Address; token: Address | "native"; quote: Quote; slippageBps: number; deadlineSeconds: number }) => {
    if (!client || !wallet) return;
    setState({ ...IDLE, phase: "preparing" });
    let hash: Hash | null = null;
    try {
      const minOut = floorMinOut(args.quote.amountOut, args.slippageBps);
      const minShares = await client.readContract({ address: args.vault, abi: guardedVaultAbi, functionName: "previewDeposit", args: [minOut] });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + args.deadlineSeconds);
      const native = args.token === "native";
      const { request, result } = await client.simulateContract({
        account: wallet.account, address: SWAP.siroZap, abi: siroZapAbi, functionName: "swapAndDeposit",
        args: [args.vault, native ? NATIVE_TOKEN_IN : (args.token as Address), args.quote.amountIn, args.quote.fee, minOut, minShares, deadline, wallet.account.address],
        value: native ? args.quote.amountIn : undefined,
      });
      setState({ ...IDLE, phase: "confirming" });
      hash = await wallet.writeContract(request);
      setState({ ...IDLE, phase: "pending", hash });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setState({ phase: "success", hash, error: null, shares: result });
    } catch (e) {
      setState({ phase: "error", hash, error: decodeSwapError(e), shares: null });
    }
  }, [client, wallet]);

  return { ...state, approve, swap, reset };
}
