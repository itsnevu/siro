import { createPublicClient, defineChain, erc20Abi, fallback, http, type Address } from "viem";

const DEFAULT_RPC_URLS = [
  "https://robinhood-rpc.publicnode.com",
  "https://rpc-robinhood.globalstake.io",
  "https://rpc.mainnet.chain.robinhood.com",
];

const RPC_URLS = (process.env.NEXT_PUBLIC_RPC_URLS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const rpcUrls = RPC_URLS.length ? RPC_URLS : DEFAULT_RPC_URLS;

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: rpcUrls } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
  // Canonical Multicall3; bytecode confirmed on chain 4663 via eth_getCode.
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

const RPC_TIMEOUT_MS = 8_000;

export const publicClient = createPublicClient({
  chain: robinhoodChain,
  transport: fallback(rpcUrls.map((url) => http(url, { timeout: RPC_TIMEOUT_MS, retryCount: 0 }))),
});

export async function getLatestBlock(): Promise<bigint | null> {
  try {
    return await publicClient.getBlockNumber();
  } catch {
    return null;
  }
}

export type TokenSupply = { totalSupply: bigint; decimals: number };

// One multicall for every token; a failed read for one token leaves only that token blank.
export async function getTokenSupplies(addresses: Address[]): Promise<Map<Address, TokenSupply>> {
  const supplies = new Map<Address, TokenSupply>();
  if (!addresses.length) return supplies;
  try {
    const results = await publicClient.multicall({
      allowFailure: true,
      contracts: addresses.flatMap((address) => [
        { address, abi: erc20Abi, functionName: "totalSupply" } as const,
        { address, abi: erc20Abi, functionName: "decimals" } as const,
      ]),
    });
    addresses.forEach((address, i) => {
      const supply = results[i * 2];
      const decimals = results[i * 2 + 1];
      if (supply.status === "success" && decimals.status === "success") {
        supplies.set(address, { totalSupply: supply.result as bigint, decimals: Number(decimals.result) });
      }
    });
  } catch {
    // RPC unreachable: callers render without supply data.
  }
  return supplies;
}
