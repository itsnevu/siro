import { createPublicClient, fallback, http } from "viem";
import { ALL_CHAINS } from "../chains";
export function serverRpcs(chainId: number): string[] {
  const privateUrl = chainId === 4663 ? process.env.ALCHEMY_RPC_URL_4663 : undefined;
  return [...(privateUrl?.trim() ? [privateUrl.trim()] : []), ...(ALL_CHAINS[chainId]?.serverRpcs ?? [])];
}
export function serverClient(chainId: number) {
  const url = serverRpcs(chainId)[0];
  if (!url) throw new Error("No RPC is configured for this chain.");
  return createPublicClient({ transport: http(url, { timeout: 12_000 }) });
}

/**
 * eth_getLogs needs wide ranges. Alchemy's free tier caps getLogs at 10 blocks, so logs go to
 * endpoints measured on 2026-11-15 to serve 1,000,000-block ranges. Override: SIRO_LOGS_RPCS_<chainId>.
 */
const LOG_RPCS: Record<number, string[]> = { 4663: ["https://rpc-robinhood.globalstake.io", "https://robinhood.rpc.pinax.network"] };
export const LOGS_MAX_RANGE = 500_000n;
export function logsClient(chainId: number) {
  const urls = process.env[`SIRO_LOGS_RPCS_${chainId}`]?.split(",").map(s => s.trim()).filter(Boolean) ?? LOG_RPCS[chainId] ?? [];
  if (!urls.length) throw new Error("No log-capable RPC is configured for this chain.");
  return createPublicClient({ transport: fallback(urls.map(u => http(u, { timeout: 20_000, retryCount: 1 }))) });
}
