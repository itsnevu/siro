import { createPublicClient, http } from "viem";
import { ALL_CHAINS } from "../chains";
export function serverRpcs(chainId: number): string[] {
  const privateUrl = chainId === 4663 ? process.env.ALCHEMY_RPC_URL_4663 : chainId === 46630 ? process.env.ALCHEMY_RPC_URL_46630 : undefined;
  return [...(privateUrl?.trim() ? [privateUrl.trim()] : []), ...(ALL_CHAINS[chainId]?.serverRpcs ?? [])];
}
export function serverClient(chainId: number) {
  const url = serverRpcs(chainId)[0];
  if (!url) throw new Error("No RPC is configured for this chain.");
  return createPublicClient({ transport: http(url, { timeout: 12_000 }) });
}
