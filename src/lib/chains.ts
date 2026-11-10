import { defineChain, type Address, type Chain } from "viem";
import { deployments } from "./generated/deployments";

export type EscrowMode = "native" | "erc20";

export type ChainConfig = {
  id: number;
  key: "elysium" | "elysium-testnet" | "anvil";
  name: string;
  short: string;
  chain: Chain;
  rpcUrl: string;
  serverRpc: string;
  explorerUrl?: string;
  sourceUrl?: (address: Address) => string;
  mode: EscrowMode;
  token: { symbol: string; decimals: number; address?: Address };
  gasSymbol: string;
  copyVault?: Address;
  riskGuard?: Address;
  leaderboard?: Address;
  deployBlock: bigint;
  testnet: boolean;
  relayByDefault: boolean;
};

type Deployment = {
  chainId: number;
  deployer?: string;
  usdc?: string;
  copyVault?: string;
  riskGuard?: string;
  leaderboard?: string;
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
  99801: { rpc: process.env.NEXT_PUBLIC_RPC_URL_99801, explorer: process.env.NEXT_PUBLIC_EXPLORER_URL_99801 },
  99901: { rpc: process.env.NEXT_PUBLIC_RPC_URL_99901, explorer: process.env.NEXT_PUBLIC_EXPLORER_URL_99901 },
  31337: { rpc: process.env.NEXT_PUBLIC_RPC_URL_31337, explorer: process.env.NEXT_PUBLIC_EXPLORER_URL_31337 },
} as const;

type Base = Omit<ChainConfig, "chain" | "rpcUrl" | "serverRpc" | "copyVault" | "riskGuard" | "leaderboard" | "deployBlock" | "explorerUrl" | "token"> & {
  publicRpc: string;
  explorerUrl?: string;
  nativeCurrency: Chain["nativeCurrency"];
  token: { symbol: string; decimals: number };
};

const BASES: Base[] = [
  {
    id: 99801,
    key: "elysium-testnet",
    name: "Elysium Testnet",
    short: "Elysium",
    publicRpc: "https://testnet-rpc.elysium.kinetiq.xyz",
    explorerUrl: "https://elysium.kinetiq.xyz/testnet-explorer",
    nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
    mode: "erc20",
    token: { symbol: "USDC", decimals: 6 },
    gasSymbol: "HYPE",
    testnet: true,
    relayByDefault: false,
  },
  {
    id: 99901,
    key: "elysium",
    name: "Elysium",
    short: "Elysium",
    publicRpc: "https://rpc.elysium.kinetiq.xyz",
    explorerUrl: "https://elysium.kinetiq.xyz/explorer",
    nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
    mode: "erc20",
    token: { symbol: "USDC", decimals: 6 },
    gasSymbol: "HYPE",
    testnet: false,
    relayByDefault: false,
  },
  {
    id: 31337,
    key: "anvil",
    name: "Anvil (local)",
    short: "Local",
    publicRpc: "http://127.0.0.1:8545",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    mode: "erc20",
    token: { symbol: "USDC", decimals: 6 },
    gasSymbol: "ETH",
    testnet: true,
    relayByDefault: false,
  },
];

function build(b: Base): ChainConfig {
  const env = ENV[b.id as keyof typeof ENV];
  const dep = DEPLOYMENTS[String(b.id)];
  const serverRpc = b.publicRpc;
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
  const tokenAddress = dep?.usdc && dep.usdc !== zero && isAddr(dep.usdc) ? dep.usdc : undefined;
  return {
    ...b,
    chain,
    rpcUrl,
    serverRpc,
    explorerUrl,
    token: { ...b.token, address: tokenAddress },
    mode: dep ? (tokenAddress ? "erc20" : "native") : b.mode,
    copyVault: isNonZero(dep?.copyVault) ? dep!.copyVault : undefined,
    riskGuard: isNonZero(dep?.riskGuard) ? dep!.riskGuard : undefined,
    leaderboard: isNonZero(dep?.leaderboard) ? dep!.leaderboard : undefined,
    deployBlock: BigInt(dep?.deployBlock ?? 0),
  };
}

export const ALL_CHAINS: Record<number, ChainConfig> = Object.fromEntries(BASES.map((b) => [b.id, build(b)]));

function enabledIds(): number[] {
  const raw = process.env.NEXT_PUBLIC_CHAINS;
  if (raw && raw.trim()) {
    const ids = raw.split(",").map((s) => Number(s.trim())).filter((id) => ALL_CHAINS[id]);
    if (ids.length) return ids;
  }
  const deployed = Object.values(ALL_CHAINS).filter((c) => c.copyVault && !c.testnet).map((c) => c.id);
  if (deployed.length) return deployed;
  const testnets = Object.values(ALL_CHAINS).filter((c) => c.testnet && c.key !== "anvil").map((c) => c.id);
  if (testnets.length) return testnets;
  return [31337];
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
