import { isAddress, decodeEventLog, type Address } from "viem";
import { GuardedVaultAbi, GuardedVaultFactoryAbi } from "@/lib/generated/abis";
import { getChain } from "@/lib/chains";
import { LOGS_MAX_RANGE, logsClient, serverClient } from "@/lib/server/rpc";
import { HttpError, apiError } from "@/lib/server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { name: string; args: Record<string, unknown>; hash: string | null; block: string | undefined; index: number | null };
const ACCOUNT_KEYS = ["owner", "sender", "receiver", "from", "to"];

/**
 * Vault event history, newest first, one block window per page (LOGS_MAX_RANGE). With ?account=,
 * only events that name that address (Deposit/Withdraw owner, sender, receiver; share transfers).
 * Pages walk back to the deployment block; `next` is the toBlock cursor for the following page.
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams, net = getChain(Number(params.get("chainId"))), vault = params.get("vault"), account = params.get("account");
    if (!net?.guardedVaultFactory || !vault || !isAddress(vault)) throw new HttpError(400, "A deployed network and vault are required.");
    if (account && !isAddress(account)) throw new HttpError(400, "Invalid account.");
    const client = serverClient(net.id), logs = logsClient(net.id);
    if (await client.getChainId() !== net.id) throw new HttpError(502, "RPC chain mismatch.");
    if (!await client.readContract({ address: net.guardedVaultFactory, abi: GuardedVaultFactoryAbi, functionName: "isVault", args: [vault as Address] })) throw new HttpError(400, "Unrecognized vault.");
    const latest = await client.getBlockNumber(), raw = params.get("toBlock");
    if (raw && !/^\d{1,20}$/.test(raw)) throw new HttpError(400, "Invalid block cursor.");
    const to = raw ? BigInt(raw) : latest;
    if (to > latest) throw new HttpError(400, "Block cursor is ahead of the chain.");
    const from = to > net.deployBlock + LOGS_MAX_RANGE - 1n ? to - LOGS_MAX_RANGE + 1n : net.deployBlock;
    if (to < from) return Response.json({ events: [], next: null, fromBlock: from.toString(), toBlock: to.toString() });
    const found = await logs.getLogs({ address: vault as Address, fromBlock: from, toBlock: to });
    const me = account?.toLowerCase();
    const events: Row[] = found.flatMap((log): Row[] => {
      try {
        const event = decodeEventLog({ abi: GuardedVaultAbi, data: log.data, topics: log.topics });
        const args = (event.args ?? {}) as Record<string, unknown>;
        if (me && !ACCOUNT_KEYS.some((k) => typeof args[k] === "string" && (args[k] as string).toLowerCase() === me)) return [];
        return [{ name: event.eventName, args, hash: log.transactionHash, block: log.blockNumber?.toString(), index: log.logIndex }];
      } catch { return []; }
    }).reverse();
    return new Response(JSON.stringify({ events, next: from > net.deployBlock ? (from - 1n).toString() : null, fromBlock: from.toString(), toBlock: to.toString() }, (_, v) => typeof v === "bigint" ? v.toString() : v), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (error) { return apiError(error); }
}
