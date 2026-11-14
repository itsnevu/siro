"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { ALLOWANCE_POLL_MS, SWAP, SWAP_CHAIN_ID } from "@/lib/config/swap";
import { erc20Abi } from "@/lib/swap/abis";

/** ERC-20 allowance owner -> SiroZap. Native ETH needs none. Polls while `polling` (after an approve). */
export function useAllowance(owner: Address | undefined, token: Address | "native" | undefined, polling = false) {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  return useQuery({
    queryKey: ["swap-allowance", owner, token],
    enabled: !!client && !!owner && !!token && token !== "native",
    refetchInterval: polling ? ALLOWANCE_POLL_MS : false,
    queryFn: async (): Promise<bigint> => {
      if (!client || !owner || !token || token === "native") return 0n;
      return client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, SWAP.siroZap] });
    },
  });
}
