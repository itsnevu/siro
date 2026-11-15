"use client";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useWalletClient } from "wagmi";
import type { Address, Hash } from "viem";
import { SWAP_CHAIN_ID } from "@/lib/config/swap";
import { guardedVaultAbi } from "@/lib/swap/abis";
import { decodeSwapError, type SwapError } from "@/lib/swap/errors";
import type { WithdrawPlan } from "@/lib/withdraw/plan";

export type Position = { shares: bigint; maxShares: bigint; maxAssets: bigint; previewRedeemAll: bigint };

/** On-chain position of `owner` in `vault`: share balance, max redeemable shares and withdrawable assets. */
export function usePosition(vault: Address, owner: Address | undefined) {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  return useQuery({
    queryKey: ["vault-position", vault, owner],
    enabled: !!client && !!owner,
    refetchInterval: 15_000,
    queryFn: async (): Promise<Position> => {
      if (!client || !owner) throw new Error("not ready");
      const [shares, maxShares, maxAssets] = await Promise.all([
        client.readContract({ address: vault, abi: guardedVaultAbi, functionName: "balanceOf", args: [owner] }),
        client.readContract({ address: vault, abi: guardedVaultAbi, functionName: "maxRedeem", args: [owner] }),
        client.readContract({ address: vault, abi: guardedVaultAbi, functionName: "maxWithdraw", args: [owner] }),
      ]);
      const previewRedeemAll = maxShares > 0n ? await client.readContract({ address: vault, abi: guardedVaultAbi, functionName: "previewRedeem", args: [maxShares] }) : 0n;
      return { shares, maxShares, maxAssets, previewRedeemAll };
    },
  });
}

export type WithdrawPhase = "idle" | "preparing" | "confirming" | "pending" | "success" | "error";
export type WithdrawState = { phase: WithdrawPhase; hash: Hash | null; error: SwapError | null; assets: bigint | null };
const IDLE: WithdrawState = { phase: "idle", hash: null, error: null, assets: null };

/** Simulates, sends and confirms a withdraw or redeem-all. Receiver and owner are the connected wallet. */
export function useWithdrawExecution(vault: Address) {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  const { data: wallet } = useWalletClient({ chainId: SWAP_CHAIN_ID });
  const [state, setState] = useState<WithdrawState>(IDLE);
  const reset = useCallback(() => setState(IDLE), []);

  const execute = useCallback(async (plan: WithdrawPlan) => {
    if (!client || !wallet || (plan.kind !== "withdraw" && plan.kind !== "redeem_all")) return;
    const me = wallet.account.address;
    setState({ ...IDLE, phase: "preparing" });
    let hash: Hash | null = null;
    try {
      let assets: bigint;
      if (plan.kind === "redeem_all") {
        const sim = await client.simulateContract({ account: wallet.account, address: vault, abi: guardedVaultAbi, functionName: "redeem", args: [plan.shares, me, me] });
        assets = sim.result;
        setState({ ...IDLE, phase: "confirming" });
        hash = await wallet.writeContract(sim.request);
      } else {
        const sim = await client.simulateContract({ account: wallet.account, address: vault, abi: guardedVaultAbi, functionName: "withdraw", args: [plan.assets, me, me] });
        assets = plan.assets;
        setState({ ...IDLE, phase: "confirming" });
        hash = await wallet.writeContract(sim.request);
      }
      setState({ ...IDLE, phase: "pending", hash });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Transaction reverted");
      setState({ phase: "success", hash, error: null, assets });
    } catch (e) {
      setState({ phase: "error", hash, error: decodeSwapError(e), assets: null });
    }
  }, [client, wallet, vault]);

  return { ...state, execute, reset };
}
