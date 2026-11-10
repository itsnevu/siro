import type { Address } from "viem";
import { SiroCopyVaultAbi, SiroRiskGuardAbi, SiroLeaderboardAbi, IERC20MetadataAbi } from "./generated/abis";
import { ALL_CHAINS, DEFAULT_CHAIN, DEFAULT_CHAIN_ID, type ChainConfig } from "./chains";

export { SiroCopyVaultAbi, SiroRiskGuardAbi, SiroLeaderboardAbi, IERC20MetadataAbi as Erc20Abi };

export enum VaultStatus {
  Active = 0,
  Paused = 1,
}

export type Vault = {
  owner: Address;
  balance: bigint;
  highWaterMark: bigint;
  isPaused: boolean;
  leaders: Address[];
  leaderCount: number;
  depositedAt: bigint;
  lastTradeAt: bigint;
};

export type Leader = {
  addr: Address;
  name: string;
  totalPnlBps: number;
  sharpeBps: number;
  maxDrawdownBps: number;
  followerCount: bigint;
  registeredAt: bigint;
};

export type RiskParams = {
  maxTradeSizeBps: number;
  dailyLossLimitBps: number;
  maxPositionBps: number;
  slippageBps: number;
};

export function addressesFor(chainId: number): {
  copyVault: Address;
  riskGuard: Address;
  leaderboard: Address;
  usdc: Address;
} {
  const c: ChainConfig | undefined = ALL_CHAINS[chainId];
  const zero = "0x0000000000000000000000000000000000000000" as Address;
  return {
    copyVault: c?.copyVault ?? zero,
    riskGuard: c?.riskGuard ?? zero,
    leaderboard: c?.leaderboard ?? zero,
    usdc: c?.token.address ?? zero,
  };
}

export const addresses = addressesFor(DEFAULT_CHAIN_ID);
export const hasDeployment = DEFAULT_CHAIN.copyVault !== undefined;
export const DEPLOY_BLOCK = DEFAULT_CHAIN.deployBlock;
export const USDC_DECIMALS = DEFAULT_CHAIN.token.decimals;

// ------------------------------------------------------------- formatting

export function fmtUnits(v: bigint | undefined, decimals: number, digits = 2): string {
  if (v === undefined) return "—";
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, digits);
  const wholeStr = whole.toLocaleString("en-US");
  return `${neg ? "-" : ""}${wholeStr}${digits > 0 ? "." + fracStr : ""}`;
}

export const fmtAmount = (v: bigint | undefined, decimals: number, d = 2) => fmtUnits(v, decimals, d);
export const fmtUsdc = (v?: bigint, d = 2) => fmtUnits(v, USDC_DECIMALS, d);

export function truncateAddress(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function fmtDate(timestamp?: bigint | number): string {
  if (!timestamp) return "—";
  const ms = typeof timestamp === "bigint" ? Number(timestamp) * 1000 : timestamp * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

export function fmtPnl(bps: number): string {
  const pct = (bps / 100).toFixed(1);
  return bps >= 0 ? `+${pct}%` : `${pct}%`;
}
