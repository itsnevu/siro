import { parseAbi, type Address } from "viem";
import { publicClient } from "./robinhood-chain";

// Chainlink's reference data directory is the source of truth for feed addresses
// (docs.robinhood.com/chain/oracles-and-price-feeds), so addresses are never hardcoded here.
const FEEDS_URL = "https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json";

type FeedRecord = {
  name: string;
  proxyAddress: Address;
  heartbeat: number;
  assetName?: string;
  docs?: { assetClass?: string; baseAsset?: string };
};

export type FeedPrice = {
  symbol: string;
  name: string;
  feed: Address;
  price: number;
  updatedAt: string;
  stale: boolean;
};

const aggregatorAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);

async function getEquityFeeds(): Promise<FeedRecord[]> {
  const res = await fetch(FEEDS_URL, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`Chainlink feed directory returned ${res.status}`);
  const feeds = (await res.json()) as FeedRecord[];
  return feeds.filter((f) => f.docs?.assetClass === "Equity" && f.docs.baseAsset && f.proxyAddress);
}

export async function getChainlinkStockPrices(): Promise<FeedPrice[]> {
  const feeds = await getEquityFeeds();
  const results = await publicClient.multicall({
    allowFailure: true,
    contracts: feeds.flatMap((f) => [
      { address: f.proxyAddress, abi: aggregatorAbi, functionName: "latestRoundData" } as const,
      { address: f.proxyAddress, abi: aggregatorAbi, functionName: "decimals" } as const,
    ]),
  });
  const now = Date.now() / 1000;
  return feeds
    .map((f, i): FeedPrice | null => {
      const round = results[i * 2];
      const decimals = results[i * 2 + 1];
      if (round.status !== "success" || decimals.status !== "success") return null;
      const [, answer, , updatedAt] = round.result as readonly [bigint, bigint, bigint, bigint, bigint];
      if (answer <= BigInt(0) || updatedAt === BigInt(0)) return null;
      return {
        symbol: f.docs!.baseAsset!,
        name: (f.assetName ?? f.docs!.baseAsset!).replace(/\s*\(Robinhood Tokenized[^)]*\)\s*$/i, ""),
        feed: f.proxyAddress,
        price: Number(answer) / 10 ** Number(decimals.result),
        updatedAt: new Date(Number(updatedAt) * 1000).toISOString(),
        // Equity feeds pause outside market hours, so an old round is flagged rather than hidden.
        stale: now - Number(updatedAt) > f.heartbeat,
      };
    })
    .filter((p): p is FeedPrice => p !== null)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
