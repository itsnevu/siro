/**
 * Chain configuration. Every address in this file was taken from an official source and then
 * checked onchain (see `sources` and `verifiedAt` on each chain). Nothing here is guessed:
 * a value that could not be confirmed is `null`, and code must handle that.
 *
 * Markets (tokens + Chainlink feeds) are generated: run `pnpm sync:markets`.
 */
import { defineChain } from "viem";
import marketsJson from "./markets.robinhood.json" with { type: "json" };

export type Address = `0x${string}`;

export type MarketKind = "stock" | "etf" | "crypto";

export interface Market {
  /** Ticker used everywhere in the product, e.g. "NVDA". */
  symbol: string;
  name: string;
  kind: MarketKind;
  token: Address;
  tokenDecimals: number;
  /** Chainlink price feed proxy (USD). For stock tokens the price already includes the multiplier. */
  feed: Address;
  feedDecimals: number;
  heartbeatSeconds: number;
  deviationPct: number;
  /** Age after which the onchain oracle refuses the price. */
  maxPriceAgeSeconds: number;
  /** "us_equities_24/5" feeds stop updating over the weekend. */
  marketHours: string | null;
  checkOraclePause: boolean;
}

export interface Explorer {
  name: string;
  url: string;
  /** Contract-verification API, when the explorer offers one without a key. */
  apiUrl: string | null;
}

export interface ChainConfig {
  id: number;
  name: string;
  network: "mainnet" | "testnet" | "local";
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpc: {
    /** Official public endpoint. Rate limited; use a provider endpoint in production. */
    publicUrl: string;
    /** Environment variable that overrides `publicUrl`. */
    envVar: string;
  };
  explorers: {
    /** Used for links in the UI. */
    primary: Explorer;
    /** Used by `forge verify-contract` (no API key needed). */
    blockscout: Explorer | null;
  };
  /** The vault asset. `null` where no canonical USDG exists (testnet uses a mock from SeedDemo). */
  usdg: { address: Address; decimals: number; usdFeed: Address | null } | null;
  weth: Address | null;
  uniswap: {
    v2Factory: Address;
    v2Router02: Address;
    v3Factory: Address;
    v3SwapRouter02: Address;
    v3PositionManager: Address;
    v3QuoterV2: Address;
    v4PoolManager: Address;
    v4PositionManager: Address;
    v4Quoter: Address;
    v4StateView: Address;
    universalRouter: Address;
  } | null;
  permit2: Address | null;
  multicall3: Address | null;
  chainlink: {
    /**
     * L2 sequencer uptime feed. Robinhood's docs recommend checking one, but no address was
     * published on Chainlink's sequencer-feeds page when this file was written. The oracle
     * adapter accepts address(0) and skips the check until this is filled in.
     */
    sequencerUptimeFeed: Address | null;
  };
  markets: readonly Market[];
  sources: readonly string[];
  verifiedAt: string | null;
}

export const ROBINHOOD_MAINNET_ID = 4663;
export const ROBINHOOD_TESTNET_ID = 46630;
export const LOCAL_ANVIL_ID = 31337;

const markets = marketsJson.markets as readonly Market[];

export const robinhoodMainnet: ChainConfig = {
  id: ROBINHOOD_MAINNET_ID,
  name: "Robinhood Chain",
  network: "mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpc: {
    publicUrl: "https://rpc.mainnet.chain.robinhood.com",
    envVar: "ROBINHOOD_RPC_URL",
  },
  explorers: {
    primary: { name: "RobinScan", url: "https://robin.etherscan.io", apiUrl: null },
    blockscout: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
      apiUrl: "https://robinhoodchain.blockscout.com/api/",
    },
  },
  usdg: {
    address: marketsJson.asset.token as Address,
    decimals: marketsJson.asset.decimals,
    usdFeed: marketsJson.asset.feed as Address,
  },
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
  uniswap: {
    v2Factory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
    v2Router02: "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba",
    v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA",
    v3SwapRouter02: "0xCaf681a66D020601342297493863E78C959E5cb2",
    v3PositionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3",
    v3QuoterV2: "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7",
    v4PoolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
    v4PositionManager: "0x58daec3116aae6D93017bAAea7749052E8a04fA7",
    v4Quoter: "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94",
    v4StateView: "0xF3334192D15450CdD385c8B70e03f9A6bD9E673b",
    universalRouter: "0x204FAca1764B154221e35c0d20aBb3c525710498",
  },
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  chainlink: { sequencerUptimeFeed: null },
  markets,
  sources: [
    "https://docs.robinhood.com/chain/connecting/",
    "https://docs.robinhood.com/chain/contracts/",
    "https://docs.robinhood.com/chain/protocol-contracts/",
    "https://docs.robinhood.com/chain/oracles-and-price-feeds/",
    "https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood",
    "https://developers.uniswap.org/deployments.json",
  ],
  verifiedAt: "2026-11-12",
};

export const robinhoodTestnet: ChainConfig = {
  id: ROBINHOOD_TESTNET_ID,
  name: "Robinhood Chain Testnet",
  network: "testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpc: {
    publicUrl: "https://rpc.testnet.chain.robinhood.com",
    envVar: "ROBINHOOD_TESTNET_RPC_URL",
  },
  explorers: {
    primary: { name: "Testnet Explorer", url: "https://explorer.testnet.chain.robinhood.com", apiUrl: null },
    blockscout: null,
  },
  // No canonical USDG, stock tokens, Chainlink stock feeds or Uniswap deployment were found in the
  // official docs for the testnet. SeedDemo.s.sol deploys labelled mocks and writes their addresses
  // to contracts/deployments/46630.json.
  usdg: null,
  weth: "0x7943e237c7F95DA44E0301572D358911207852Fa",
  uniswap: null,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  multicall3: null,
  chainlink: { sequencerUptimeFeed: null },
  markets: [],
  sources: [
    "https://docs.robinhood.com/chain/connecting/",
    "https://docs.robinhood.com/chain/protocol-contracts/",
  ],
  verifiedAt: "2026-11-12",
};

export const localAnvil: ChainConfig = {
  id: LOCAL_ANVIL_ID,
  name: "Anvil (local)",
  network: "local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpc: { publicUrl: "http://127.0.0.1:8545", envVar: "LOCAL_RPC_URL" },
  explorers: { primary: { name: "None", url: "", apiUrl: null }, blockscout: null },
  usdg: null,
  weth: null,
  uniswap: null,
  permit2: null,
  multicall3: null,
  chainlink: { sequencerUptimeFeed: null },
  markets: [],
  sources: [],
  verifiedAt: null,
};

export const CHAINS: Readonly<Record<number, ChainConfig>> = {
  [ROBINHOOD_MAINNET_ID]: robinhoodMainnet,
  [ROBINHOOD_TESTNET_ID]: robinhoodTestnet,
  [LOCAL_ANVIL_ID]: localAnvil,
};

export function getChainConfig(chainId: number): ChainConfig {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);
  return chain;
}

/** Tickers an agent may trade on a chain. On mainnet: every stock token with a Chainlink feed, plus WETH. */
export function supportedTickers(chainId: number): string[] {
  return getChainConfig(chainId).markets.map((market) => market.symbol);
}

export function getMarket(chainId: number, symbol: string): Market | undefined {
  return getChainConfig(chainId).markets.find((market) => market.symbol === symbol);
}

export function explorerAddressUrl(chainId: number, address: Address): string {
  return `${getChainConfig(chainId).explorers.primary.url}/address/${address}`;
}

export function explorerTxUrl(chainId: number, hash: `0x${string}`): string {
  return `${getChainConfig(chainId).explorers.primary.url}/tx/${hash}`;
}

function toViemChain(config: ChainConfig) {
  return defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: { default: { http: [config.rpc.publicUrl] } },
    blockExplorers: config.explorers.primary.url
      ? { default: { name: config.explorers.primary.name, url: config.explorers.primary.url } }
      : undefined,
    contracts: config.multicall3 ? { multicall3: { address: config.multicall3 } } : undefined,
    testnet: config.network !== "mainnet",
  });
}

/** viem / wagmi chain objects. Pass your own transport URL; the default one is the rate-limited public RPC. */
export const robinhoodChain = toViemChain(robinhoodMainnet);
export const robinhoodTestnetChain = toViemChain(robinhoodTestnet);
export const anvilChain = toViemChain(localAnvil);
