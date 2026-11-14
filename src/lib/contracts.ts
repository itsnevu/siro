import { IERC20MetadataAbi } from "./generated/abis";
import { DEFAULT_CHAIN } from "./chains";
export { GuardedVaultAbi, GuardedVaultFactoryAbi, AgentRegistryAbi } from "./generated/abis";
export { IERC20MetadataAbi as Erc20Abi };
export const hasDeployment = DEFAULT_CHAIN.guardedVaultFactory !== undefined;
export const DEPLOY_BLOCK = DEFAULT_CHAIN.deployBlock;
export const USDC_DECIMALS = DEFAULT_CHAIN.token.decimals;

// ------------------------------------------------------------- formatting

export function fmtUnits(v: bigint | undefined, decimals: number, digits = 2): string {
  if (v === undefined) return "-";
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
  if (!timestamp) return "-";
  const ms = typeof timestamp === "bigint" ? Number(timestamp) * 1000 : timestamp * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "-";
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
