import type { Address } from "viem";

export const ROBINHOOD_CHAIN = {
  id: 4663,
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  explorer: "https://robinhoodchain.blockscout.com",
  assetsApi: "https://api.robinhood.com/rhj/assets",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as Address,
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address,
} as const;

export type RobinhoodAsset = { tokenSymbol: string; tokenName: string; status: string; deployments: { contractAddress: Address; chainId: number }[]; currentMultiplier: string; logoUrl?: string };
export type StockQuote = {
  tokenSymbol: string;
  deployments: { contractAddress: Address; chainId: number }[];
  bid: string;
  ask: string;
  tokenBid?: string;
  tokenAsk?: string;
  dailyTradingVolume: string;
  dailyHigh?: string;
  dailyLow?: string;
  mintBurnUsdVolume?: string;
  isTradingHalt: boolean;
  generatedAt: string;
};

export type LiveMarket = {
  symbol: string;
  name: string;
  address: Address;
  price: number;
  dailyHigh: number | null;
  dailyLow: number | null;
  volume: number;
  onchainVolumeUsd: number;
  halted: boolean;
  updatedAt: string;
  logoUrl?: string;
};

const num = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));

// /prices bid/ask are raw equity quotes; tokenBid/tokenAsk are multiplier-adjusted to one token.
export async function getLiveMarkets(): Promise<LiveMarket[]> {
  const [pricesRes, assets] = await Promise.all([
    fetch("https://api.robinhood.com/rhj/prices", { next: { revalidate: 15 }, signal: AbortSignal.timeout(8_000) }),
    getRobinhoodAssets().catch(() => [] as RobinhoodAsset[]),
  ]);
  if (!pricesRes.ok) throw new Error(`Robinhood prices API returned ${pricesRes.status}`);
  const { quotes = [] } = (await pricesRes.json()) as { quotes?: StockQuote[] };
  const names = new Map(assets.map((a) => [a.tokenSymbol, a]));
  return quotes
    .map((q): LiveMarket | null => {
      const deployment = q.deployments.find((d) => d.chainId === ROBINHOOD_CHAIN.id);
      const bid = num(q.tokenBid ?? q.bid);
      const ask = num(q.tokenAsk ?? q.ask);
      if (!deployment || bid === null || ask === null) return null;
      const asset = names.get(q.tokenSymbol);
      return {
        symbol: q.tokenSymbol,
        name: asset?.tokenName.replace(/\s*•\s*Robinhood Token$/, "") ?? q.tokenSymbol,
        address: deployment.contractAddress,
        price: (bid + ask) / 2,
        dailyHigh: num(q.dailyHigh),
        dailyLow: num(q.dailyLow),
        volume: num(q.dailyTradingVolume) ?? 0,
        onchainVolumeUsd: num(q.mintBurnUsdVolume) ?? 0,
        halted: q.isTradingHalt,
        updatedAt: q.generatedAt,
        logoUrl: asset?.logoUrl,
      };
    })
    .filter((m): m is LiveMarket => m !== null)
    .sort((a, b) => b.onchainVolumeUsd - a.onchainVolumeUsd);
}

export async function getRobinhoodAssets(): Promise<RobinhoodAsset[]> {
  const response = await fetch(ROBINHOOD_CHAIN.assetsApi, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Robinhood assets API returned ${response.status}`);
  const body = await response.json() as { assets?: RobinhoodAsset[] };
  return (body.assets ?? []).filter((asset) => asset.deployments.some((deployment) => deployment.chainId === ROBINHOOD_CHAIN.id));
}
