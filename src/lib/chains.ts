import { defineChain, type Address, type Chain } from "viem";
import { deployments } from "./generated/deployments";

export type EscrowMode = "native" | "erc20";

export type ChainConfig = {
  id: number;
  key: "robinhood";
  name: string;
  short: string;
  chain: Chain;
  rpcUrl: string;
  serverRpc: string;
  serverRpcs: string[];
  explorerUrl?: string;
  sourceUrl?: (address: Address) => string;
  mode: EscrowMode;
  token: { symbol: string; decimals: number; address?: Address };
  gasSymbol: string;
  guardedVaultFactory?: Address;
  agentRegistry?: Address;
  oracle?: Address;
  /** Evidence contracts (DeployEvidence): decision witness and scoped session keys. */
  anchor?: Address;
  sessionExecutor?: Address;
  deployBlock: bigint;
  testnet: boolean;
  relayByDefault: boolean;
};

type Deployment = {
  chainId: number;
  deployer?: string;
  usdg?: string;
  guardedVaultFactory?: string;
  agentRegistry?: string;
  oracle?: string;
  anchor?: string;
  sessionExecutor?: string;
  deployBlock?: number;
};
const DEPLOYMENTS = deployments as unknown as Record<string, Deployment | undefined>;

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function relayUrl(chainId: number) {
  const origin = typeof window !== "undefined" ? window.location.origin : APP_URL;
  return `${origin.replace(/\/$/, "")}/api/rpc/${chainId}`;
}

const isAddr = (v: string | undefined): v is Address => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);
const zero = "0x0000000000000000000000000000000000000000";
const isNonZero = (v: string | undefined): v is Address => isAddr(v) && v !== zero;

const ENV = {
  4663: { rpc: process.env.NEXT_PUBLIC_RPC_URL_4663, explorer: process.env.NEXT_PUBLIC_EXPLORER_URL_4663 },
} as const;

type Base = Omit<ChainConfig, "chain" | "rpcUrl" | "serverRpc" | "serverRpcs" | "deployBlock" | "explorerUrl" | "token"> & {
  publicRpc: string;
  /** Upstreams for the server-side relay, tried in order. Defaults to [publicRpc]. */
  serverRpcs?: string[];
  explorerUrl?: string;
  nativeCurrency: Chain["nativeCurrency"];
  token: { symbol: string; decimals: number };
};

// Network parameters from docs.robinhood.com/chain/connecting. Deployment records determine contract availability.
// Browsers use the same-origin /api/rpc relay because some ISPs filter robinhood.com.
const BASES: Base[] = [
  {
    id: 4663,
    key: "robinhood",
    name: "Robinhood Chain",
    short: "Robinhood Chain",
    publicRpc: "https://rpc.mainnet.chain.robinhood.com",
    serverRpcs: ["https://robinhood-rpc.publicnode.com", "https://rpc-robinhood.globalstake.io", "https://robinhood.rpc.pinax.network", "https://rpc.mainnet.chain.robinhood.com"],
    explorerUrl: "https://robinhoodchain.blockscout.com",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    mode: "erc20",
    token: { symbol: "USDG", decimals: 6 },
    gasSymbol: "ETH",
    testnet: false,
    relayByDefault: true,
  },
];

function build(b: Base): ChainConfig {
  const env = ENV[b.id as keyof typeof ENV];
  const dep = DEPLOYMENTS[String(b.id)];
  const serverRpcs = env?.rpc ? [env.rpc] : b.serverRpcs ?? [b.publicRpc];
  const serverRpc = serverRpcs[0];
  const rpcUrl = env?.rpc || (b.relayByDefault ? relayUrl(b.id) : serverRpc);
  const explorerUrl = (env?.explorer ?? b.explorerUrl)?.replace(/\/$/, "");
  const chain = defineChain({
    id: b.id,
    name: b.name,
    nativeCurrency: b.nativeCurrency,
    rpcUrls: { default: { http: b.relayByDefault && rpcUrl !== b.publicRpc ? [rpcUrl, b.publicRpc] : [rpcUrl] } },
    ...(explorerUrl ? { blockExplorers: { default: { name: "Explorer", url: explorerUrl } } } : {}),
    testnet: b.testnet,
  });
  const tokenAddress = isNonZero(dep?.usdg) ? dep.usdg : undefined;
  return {
    ...b,
    chain,
    rpcUrl,
    serverRpc,
    serverRpcs,
    explorerUrl,
    token: { ...b.token, address: tokenAddress },
    mode: "erc20",
    guardedVaultFactory: tokenAddress && isNonZero(dep?.guardedVaultFactory) && isNonZero(dep?.agentRegistry) && isNonZero(dep?.oracle) ? dep.guardedVaultFactory : undefined,
    agentRegistry: isNonZero(dep?.agentRegistry) ? dep.agentRegistry : undefined,
    oracle: isNonZero(dep?.oracle) ? dep.oracle : undefined,
    anchor: isNonZero(dep?.anchor) ? dep.anchor : undefined,
    sessionExecutor: isNonZero(dep?.sessionExecutor) ? dep.sessionExecutor : undefined,
    deployBlock: BigInt(dep?.deployBlock ?? 0),
  };
}

export const ALL_CHAINS: Record<number, ChainConfig> = Object.fromEntries(BASES.map((b) => [b.id, build(b)]));

/** Mainnet only: Robinhood Chain (4663). There is no testnet or local chain in the app. */
function enabledIds(): number[] {
  return [4663];
}

export const CHAINS: ChainConfig[] = enabledIds().map((id) => ALL_CHAINS[id]);
export const CHAIN_IDS = CHAINS.map((c) => c.id);

export const DEFAULT_CHAIN_ID: number = (() => {
  const want = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID);
  return CHAIN_IDS.includes(want) ? want : CHAIN_IDS[0];
})();
export const DEFAULT_CHAIN = ALL_CHAINS[DEFAULT_CHAIN_ID];

export function getChain(chainId: number | undefined | null): ChainConfig | undefined {
  return chainId != null && CHAIN_IDS.includes(chainId) ? ALL_CHAINS[chainId] : undefined;
}

export function chainName(chainId: number | undefined | null): string {
  return (chainId != null && ALL_CHAINS[chainId]?.name) || `chain ${chainId ?? "?"}`;
}

export const CHAIN_LIST_TEXT = CHAINS.map((c) => c.name).join(CHAINS.length === 2 ? " and " : ", ");
