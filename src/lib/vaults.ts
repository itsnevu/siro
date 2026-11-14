"use client";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useNetwork } from "./network";
import type { VaultPage } from "./vault-data";
export function useVaultPage(offset = 0) {
  const net = useNetwork(); const { address } = useAccount();
  return useQuery<VaultPage>({ queryKey: ["vault-page", net.id, address, offset], queryFn: async () => { const r = await fetch(`/api/vaults?chainId=${net.id}&offset=${offset}${address ? `&account=${address}` : ""}`); const body = await r.json(); if (!r.ok) throw new Error(body.error || "Vault data is unavailable."); return body; }, staleTime: 15_000, refetchInterval: 30_000, retry: false });
}
