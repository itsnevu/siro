import { isAddress, decodeEventLog, type Address } from "viem";
import { GuardedVaultAbi, GuardedVaultFactoryAbi } from "@/lib/generated/abis";
import { getChain } from "@/lib/chains";
import { serverClient } from "@/lib/server/rpc";
import { HttpError, apiError } from "@/lib/server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams, net = getChain(Number(params.get("chainId"))), vault = params.get("vault");
    if (!net?.guardedVaultFactory || !vault || !isAddress(vault)) throw new HttpError(400, "A deployed network and vault are required.");
    const client = serverClient(net.id);
    if (await client.getChainId() !== net.id) throw new HttpError(502, "RPC chain mismatch.");
    if (!await client.readContract({ address: net.guardedVaultFactory, abi: GuardedVaultFactoryAbi, functionName: "isVault", args: [vault as Address] })) throw new HttpError(400, "Unrecognized vault.");
    const latest = await client.getBlockNumber(), raw = params.get("toBlock");
    if (raw && !/^\d{1,20}$/.test(raw)) throw new HttpError(400, "Invalid block cursor.");
    const to = raw ? BigInt(raw) : latest;
    if (to > latest) throw new HttpError(400, "Block cursor is ahead of the chain.");
    const from = to > net.deployBlock + 249n ? to - 249n : net.deployBlock;
    if (to < from) return Response.json({ events: [], next: null, fromBlock: from.toString(), toBlock: to.toString() });
    const logs = await client.getLogs({ address: vault as Address, fromBlock: from, toBlock: to });
    const events = logs.flatMap(log => {
      try { const event = decodeEventLog({ abi: GuardedVaultAbi, data: log.data, topics: log.topics }); return [{ name: event.eventName, args: event.args, hash: log.transactionHash, block: log.blockNumber?.toString(), index: log.logIndex }]; } catch { return []; }
    }).reverse();
    return new Response(JSON.stringify({ events, next: from > net.deployBlock ? (from - 1n).toString() : null, fromBlock: from.toString(), toBlock: to.toString() }, (_, v) => typeof v === "bigint" ? v.toString() : v), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
