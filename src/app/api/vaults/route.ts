import { isAddress, zeroAddress, type Address } from "viem";
import { getChain } from "@/lib/chains";
import { GuardedVaultAbi, GuardedVaultFactoryAbi, AgentRegistryAbi, IERC20MetadataAbi } from "@/lib/generated/abis";
import { serverClient } from "@/lib/server/rpc";
import { HttpError, apiError } from "@/lib/server/store";
import type { VaultPage, VaultSnapshot } from "@/lib/vault-data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams, chainId = Number(params.get("chainId")), offset = Number(params.get("offset") || 0);
    const account = params.get("account") || zeroAddress;
    const net = getChain(chainId);
    if (!net || !isAddress(account) || !Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, "Invalid network, account or offset.");
    const result: VaultPage = { configured: !!net.guardedVaultFactory, chainId, total: 0, offset, next: null, block: null, vaults: [] };
    if (!net.guardedVaultFactory || !net.agentRegistry) return Response.json(result);
    const client = serverClient(net.id);
    if (await client.getChainId() !== net.id) throw new HttpError(502, "RPC chain mismatch.");
    const block = await client.getBlockNumber(); result.block = block.toString();
    const count = Number(await client.readContract({ address: net.guardedVaultFactory, abi: GuardedVaultFactoryAbi, functionName: "vaultCount", blockNumber: block }));
    result.total = count;
    const ids = Array.from({ length: Math.min(10, Math.max(0, count - offset)) }, (_, i) => count - offset - i);
    result.next = offset + ids.length < count ? offset + ids.length : null;
    for (const id of ids) {
      const agent = await client.readContract({ address: net.agentRegistry, abi: AgentRegistryAbi, functionName: "getAgent", args: [BigInt(id)], blockNumber: block });
      const snapshot: VaultSnapshot = { id, vault: agent.vault, creator: agent.creator, active: agent.active, metadataURI: agent.metadataURI, shares: "0", totalSupply: "0", shareValue: null, totalAssets: null, paused: false, assets: [] };
      try {
        const read = { address: agent.vault, abi: GuardedVaultAbi, blockNumber: block } as const;
        const [shares, supply, paused, assets, nav] = await Promise.all([
          client.readContract({ ...read, functionName: "balanceOf", args: [account as Address] }),
          client.readContract({ ...read, functionName: "totalSupply" }),
          client.readContract({ ...read, functionName: "killSwitch" }),
          client.readContract({ ...read, functionName: "trackedAssetCount" }),
          client.readContract({ ...read, functionName: "totalAssets" }).catch(() => null),
        ]);
        snapshot.shares = shares.toString(); snapshot.totalSupply = supply.toString(); snapshot.paused = paused; snapshot.totalAssets = nav?.toString() ?? null;
        if (nav !== null) snapshot.shareValue = (await client.readContract({ ...read, functionName: "convertToAssets", args: [shares] })).toString();
        if (shares > 0n) {
          for (let i = 0; i < Math.min(Number(assets), 32); i++) {
            const token = await client.readContract({ ...read, functionName: "trackedAssets", args: [BigInt(i)] });
            const erc = { address: token, abi: IERC20MetadataAbi, blockNumber: block } as const;
            const [balance, decimals, symbol] = await Promise.all([client.readContract({ ...erc, functionName: "balanceOf", args: [agent.vault] }), client.readContract({ ...erc, functionName: "decimals" }), client.readContract({ ...erc, functionName: "symbol" }).catch(() => token)]);
            snapshot.assets.push({ token, symbol, decimals, vaultBalance: balance.toString(), yourBalance: (supply > 0n ? balance * shares / supply : 0n).toString() });
          }
        }
      } catch { snapshot.error = "Some vault data could not be read at this block."; }
      result.vaults.push(snapshot);
    }
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
