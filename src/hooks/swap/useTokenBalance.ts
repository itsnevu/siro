"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { SWAP_CHAIN_ID } from "@/lib/config/swap";
import { erc20Abi } from "@/lib/swap/abis";

/** Native ETH when token is "native", else the ERC-20 balance. */
export function useTokenBalance(owner: Address | undefined, token: Address | "native" | undefined) {
  const client = usePublicClient({ chainId: SWAP_CHAIN_ID });
  return useQuery({
    queryKey: ["swap-balance", owner, token],
    enabled: !!client && !!owner && !!token,
    refetchInterval: 15_000,
    queryFn: async (): Promise<bigint> => {
      if (!client || !owner || !token) return 0n;
      if (token === "native") return client.getBalance({ address: owner });
      return client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] });
    },
  });
}
