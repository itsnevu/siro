import { getAddress, isAddress, type Address } from "viem";
import { deployment } from "@/lib/generated/deployment";

/**
 * Every address the swap/zap feature uses lives here and nowhere else (docs/swap-brief.md).
 * Sources: Uniswap's official Robinhood Chain v3 deployments, Robinhood token docs,
 * Chainlink's Robinhood mainnet directory, and contracts/deployments/4663.json.
 */
function checked(name: string, value: string | undefined): Address {
  if (!value || !isAddress(value, { strict: false }) || /^0x0{40}$/i.test(value)) {
    throw new Error(`swap config: ${name} is missing or not a valid non-zero address`);
  }
  return getAddress(value);
}

export const SWAP_CHAIN_ID = 4663 as const;

export const SWAP = {
  swapRouter02: checked("SwapRouter02", "0xcaf681a66d020601342297493863e78c959e5cb2"),
  quoterV2: checked("QuoterV2", "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7"),
  v3Factory: checked("V3Factory", "0x1f7d7550b1b028f7571e69a784071f0205fd2efa"),
  permit2: checked("Permit2", "0x000000000022D473030F116dDEE9F6B43aC78BA3"),
  weth9: checked("WETH9", "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73"),
  usdg: checked("USDG", "0x5fc5360d0400a0fd4f2af552add042d716f1d168"),
  chainlinkEthUsd: checked("Chainlink ETH/USD", "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9"),
  guardedVaultFactory: checked("GuardedVaultFactory", deployment.guardedVaultFactory),
  /** SiroZap 0x6F635334962beadc61c42011B8A892bc23ab7437 (2026-11-15), injected via env. */
  siroZap: checked("NEXT_PUBLIC_SIRO_ZAP", process.env.NEXT_PUBLIC_SIRO_ZAP),
} as const;
