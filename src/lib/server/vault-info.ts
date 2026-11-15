import { getAddress, isAddress, type Address } from "viem";
import type { VaultInfo } from "@/components/swap/SwapCard";
import { serverClient } from "@/lib/server/rpc";
import { SWAP, SWAP_CHAIN_ID } from "@/lib/config/swap";
import { VAULT_ASSETS } from "@/lib/config/tokens";
import { guardedVaultAbi } from "@/lib/swap/abis";
import { shortAddress } from "@/lib/swap/format";

const factoryAbi = [{ type: "function", name: "isVault", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] }] as const;

/** ?vault=0x… must pass factory.isVault(); otherwise the single agent vault is used (no picker by design). */
export async function resolveVault(param: string | undefined): Promise<{ vault: VaultInfo | null; note: string | null }> {
  const client = serverClient(SWAP_CHAIN_ID);
  let address: Address = SWAP.defaultVault;
  let note: string | null = null;
  if (param) {
    if (isAddress(param, { strict: false })) {
      const candidate = getAddress(param);
      const ok = await client.readContract({ address: SWAP.guardedVaultFactory, abi: factoryAbi, functionName: "isVault", args: [candidate] }).catch(() => false);
      if (ok) address = candidate; else note = `${shortAddress(candidate)} is not a SIRO vault. Showing the agent vault instead.`;
    } else note = "That vault address is not valid. Showing the agent vault instead.";
  }
  try {
    const [asset, name, decimals] = await Promise.all([
      client.readContract({ address, abi: guardedVaultAbi, functionName: "asset" }),
      client.readContract({ address, abi: guardedVaultAbi, functionName: "name" }),
      client.readContract({ address, abi: guardedVaultAbi, functionName: "decimals" }),
    ]);
    const meta = VAULT_ASSETS[asset.toLowerCase()];
    if (!meta) return { vault: null, note: "This vault's deposit asset is not supported by the swap page yet." };
    return { vault: { address, asset, assetSymbol: meta.symbol, assetDecimals: meta.decimals, assetLogo: meta.logo, shareDecimals: decimals, name }, note };
  } catch {
    return { vault: null, note: "Robinhood Chain did not answer. Refresh in a moment." };
  }
}

