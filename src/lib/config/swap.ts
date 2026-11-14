import { getAddress, isAddress, type Address } from "viem";
import { deployment } from "@/lib/generated/deployment";

/**
 * Every address and tunable number the swap/zap feature uses lives under src/lib/config
 * (docs/swap-brief.md). Sources: Uniswap's official Robinhood Chain v3 deployments, Robinhood
 * token docs, Chainlink's Robinhood mainnet directory, and contracts/deployments/4663.json.
 */
export function checkedAddress(name: string, value: string | undefined): Address {
  if (!value || !isAddress(value, { strict: false }) || /^0x0{40}$/i.test(value)) {
    throw new Error(`swap config: ${name} is missing or not a valid non-zero address`);
  }
  return getAddress(value);
}

export const SWAP_CHAIN_ID = 4663 as const;
/** Same-origin relay from src/app/api/rpc/[chainId]; no second chain config. */
export const SWAP_RPC_PATH = `/api/rpc/${SWAP_CHAIN_ID}` as const;

export const SWAP = {
  swapRouter02: checkedAddress("SwapRouter02", "0xcaf681a66d020601342297493863e78c959e5cb2"),
  quoterV2: checkedAddress("QuoterV2", "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7"),
  v3Factory: checkedAddress("V3Factory", "0x1f7d7550b1b028f7571e69a784071f0205fd2efa"),
  permit2: checkedAddress("Permit2", "0x000000000022D473030F116dDEE9F6B43aC78BA3"),
  weth9: checkedAddress("WETH9", "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"),
  usdg: checkedAddress("USDG", "0x5fc5360d0400a0fd4f2af552add042d716f1d168"),
  chainlinkEthUsd: checkedAddress("Chainlink ETH/USD", "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9"),
  guardedVaultFactory: checkedAddress("GuardedVaultFactory", deployment.guardedVaultFactory),
  /** SiroZap 0x6F635334962beadc61c42011B8A892bc23ab7437 (2026-11-15), injected via env. */
  siroZap: checkedAddress("NEXT_PUBLIC_SIRO_ZAP", process.env.NEXT_PUBLIC_SIRO_ZAP),
  /** The single agent vault, used when ?vault= is absent (no vault picker by design). */
  defaultVault: checkedAddress("default vault", "0xB9db625b97a45BF4741BF62CCfE96765E4d0242A"),
} as const;

/** Uniswap v3 fee tiers in hundredths of a bip. */
export const FEE_TIERS = [100, 500, 3000, 10000] as const;
export type FeeTier = (typeof FEE_TIERS)[number];
/**
 * Policy, not an invariant: the contract still accepts these tiers. The 1% WETH/USDG pool
 * measured -2.54% vs Chainlink on 2026-11-14. This constant is used in exactly one place:
 * selectBestQuote in src/lib/swap/quotes.ts.
 */
export const EXCLUDED_FEE_TIERS: readonly FeeTier[] = [10000];

export const SLIPPAGE_PRESETS_BPS = [10, 30, 50] as const;
export const DEFAULT_SLIPPAGE_BPS = 30;
export const SLIPPAGE_WARN_BPS = 200;
export const MAX_SLIPPAGE_BPS = 2000;

export const DEADLINE_PRESETS_SECONDS = [30, 120, 600] as const;
export const DEFAULT_DEADLINE_SECONDS = 120;
export const DEADLINE_WARN_SECONDS = 1800;

/** Price impact thresholds, in percent (docs/swap-brief.md). */
export const IMPACT_PCT = { muted: 0.5, orange: 2, red: 5, block: 15 } as const;

export const QUOTE_DEBOUNCE_MS = 300;
export const QUOTE_REFRESH_MS = 10_000;
export const ALLOWANCE_POLL_MS = 2_000;
/** Kept back from a native ETH "Max" for gas. Robinhood Chain gas is cheap; 0.0005 ETH covers a zap many times. */
export const NATIVE_GAS_BUFFER_WEI = 500_000_000_000_000n;
/** Below this, the wallet cannot pay for a zap and the gas warning shows. */
export const MIN_GAS_WEI = 20_000_000_000_000n;

/** Mode of the strategy engine, shown on the swap page and Evidence. Live trading is gated by walk-forward validation. */
export const STRATEGY_MODE = "paper" as const;
