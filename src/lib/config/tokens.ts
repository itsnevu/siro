import type { Address } from "viem";
import { SWAP } from "./swap";

/**
 * Curated zap inputs. Only tokens with a ready WETH/USDG-style pool and a SiroZap whitelist entry
 * are enabled. To add one: whitelist it on SiroZap (owner tx), confirm a USDG pool with liquidity,
 * add it here with enabled: true. `native` means ETH, sent as msg.value (tokenIn = 0x0).
 */
export type SwapToken = {
  symbol: string;
  name: string;
  address: Address | "native";
  decimals: number;
  enabled: boolean;
  /** Address used to quote and route (WETH9 for native ETH). */
  routeAddress: Address;
  logo: string;
};

export const NATIVE_TOKEN_IN = "0x0000000000000000000000000000000000000000" as const;

export const SWAP_TOKENS: readonly SwapToken[] = [
  { symbol: "ETH", name: "Ether", address: "native", decimals: 18, enabled: true, routeAddress: SWAP.weth9, logo: "Ξ" },
  { symbol: "WETH", name: "Wrapped Ether", address: SWAP.weth9, decimals: 18, enabled: true, routeAddress: SWAP.weth9, logo: "W" },
  { symbol: "AAPL", name: "Apple • Robinhood Token", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", decimals: 18, enabled: false, routeAddress: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", logo: "A" },
  { symbol: "NVDA", name: "NVIDIA • Robinhood Token", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", decimals: 18, enabled: false, routeAddress: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", logo: "N" },
  { symbol: "TSLA", name: "Tesla • Robinhood Token", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", decimals: 18, enabled: false, routeAddress: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", logo: "T" },
];

export const DISABLED_TOKEN_REASON = "pool not ready";

/** Vault deposit assets the UI knows how to display (tokenOut is read from vault.asset()). */
export const VAULT_ASSETS: Record<string, { symbol: string; name: string; decimals: number }> = {
  [SWAP.usdg.toLowerCase()]: { symbol: "USDG", name: "Global Dollar", decimals: 6 },
};
