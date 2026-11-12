#!/usr/bin/env node
/**
 * Builds the market config from primary sources and verifies every address onchain.
 *
 *   node packages/shared/scripts/sync-markets.mjs
 *
 * Inputs
 *   1. data/robinhood-tokens.source.json   token addresses copied from docs.robinhood.com/chain/contracts
 *   2. Chainlink reference data directory  feed proxies, decimals, heartbeats (the source Chainlink's own docs render)
 *   3. Robinhood Chain RPC                 symbol(), decimals(), description(), latestRoundData() for each entry
 *
 * Outputs
 *   packages/shared/src/config/markets.robinhood.json     consumed by the app and the engine
 *   contracts/script/generated/RobinhoodMarkets.sol       consumed by the Foundry deploy scripts
 *
 * The script fails loudly (non-zero exit, nothing written) if any address does not answer the
 * way the docs say it should. No dependencies: Node 20+ only.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, "..");
const REPO = path.resolve(SHARED, "../..");

const CHAIN_ID = 4663;
const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const FEEDS_URL = "https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json";
/** Seconds added to a feed's heartbeat before the oracle treats its price as stale. */
const STALENESS_BUFFER = 3600;

const SELECTOR = {
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  description: "0x7284e416",
  latestRoundData: "0xfeaf968c",
};

const fail = (msg) => {
  console.error(`\n[sync-markets] FAILED: ${msg}\n`);
  process.exit(1);
};

let rpcId = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** JSON-RPC with retry: public endpoints rate-limit bursts, so back off instead of failing the run. */
async function rpc(method, params) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await sleep(400 * 2 ** attempt);
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
      });
      if (!res.ok) {
        lastError = new Error(`${method}: HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      if (json.error) {
        lastError = new Error(`${method}: ${json.error.message}`);
        continue;
      }
      return json.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// Calls read the latest state: free public endpoints often refuse calls pinned to a block number.
const ethCall = (to, data) => rpc("eth_call", [{ to, data }, "latest"]);

function decodeString(hex) {
  const body = hex.slice(2);
  if (body.length < 128) return "";
  const offset = Number(BigInt("0x" + body.slice(0, 64))) * 2;
  const length = Number(BigInt("0x" + body.slice(offset, offset + 64))) * 2;
  return Buffer.from(body.slice(offset + 64, offset + 64 + length), "hex").toString("utf8");
}

const decodeUint = (hex, word = 0) => BigInt("0x" + hex.slice(2 + word * 64, 2 + (word + 1) * 64));

async function main() {
  const source = JSON.parse(readFileSync(path.join(SHARED, "data/robinhood-tokens.source.json"), "utf8"));

  const chainId = Number(await rpc("eth_chainId", []));
  if (chainId !== CHAIN_ID) fail(`RPC answered chain ${chainId}, expected ${CHAIN_ID}`);
  const blockHex = await rpc("eth_blockNumber", []);
  const blockNumber = Number(BigInt(blockHex));

  const feedsRes = await fetch(FEEDS_URL);
  if (!feedsRes.ok) fail(`Chainlink feed directory: HTTP ${feedsRes.status}`);
  const feeds = await feedsRes.json();

  /** symbol -> feed entry. Stock feeds are named "Robinhood NVDA / USD" or "Robinhood DELL-USD". */
  const feedBySymbol = new Map();
  for (const feed of feeds) {
    if (feed.docs?.hidden) continue;
    const name = String(feed.name || "");
    const stock = name.match(/^Robinhood ([A-Z.]+)\s*(?:\/|-)\s*USD$/);
    const plain = name.match(/^([A-Z.]+) \/ USD$/);
    const symbol = stock?.[1] ?? plain?.[1];
    if (!symbol || !feed.proxyAddress) continue;
    if (!feedBySymbol.has(symbol) || stock) feedBySymbol.set(symbol, feed);
  }

  async function verifyToken(symbol, address, expectedDecimals) {
    const sym = await ethCall(address, SELECTOR.symbol);
    const dec = await ethCall(address, SELECTOR.decimals);
    const onchainSymbol = decodeString(sym);
    const onchainDecimals = Number(decodeUint(dec));
    if (onchainSymbol !== symbol) fail(`${address}: symbol() is "${onchainSymbol}", docs say "${symbol}"`);
    if (onchainDecimals !== expectedDecimals) fail(`${symbol}: decimals() is ${onchainDecimals}, expected ${expectedDecimals}`);
    return onchainDecimals;
  }

  async function verifyFeed(symbol, feed) {
    const dec = await ethCall(feed.proxyAddress, SELECTOR.decimals);
    const desc = await ethCall(feed.proxyAddress, SELECTOR.description);
    const round = await ethCall(feed.proxyAddress, SELECTOR.latestRoundData);
    const decimals = Number(decodeUint(dec));
    const description = decodeString(desc);
    const answer = decodeUint(round, 1);
    const updatedAt = Number(decodeUint(round, 3));
    if (decimals !== Number(feed.decimals)) fail(`${symbol} feed: decimals() is ${decimals}, directory says ${feed.decimals}`);
    if (!description.toUpperCase().includes(symbol)) fail(`${symbol} feed ${feed.proxyAddress}: description() is "${description}"`);
    if (answer <= 0n || updatedAt === 0) fail(`${symbol} feed: no valid round (answer=${answer}, updatedAt=${updatedAt})`);
    return { decimals, description, answer, updatedAt };
  }

  const usdg = source.core.USDG;
  const weth = source.core.WETH;
  await verifyToken("USDG", usdg.address, usdg.decimals);
  await verifyToken("WETH", weth.address, weth.decimals);

  const usdgFeed = feedBySymbol.get("USDG");
  if (!usdgFeed) fail("no USDG / USD feed in the Chainlink directory");
  const usdgFeedInfo = await verifyFeed("USDG", usdgFeed);

  const markets = [];
  const skipped = [];

  const ethFeed = feedBySymbol.get("ETH");
  if (!ethFeed) fail("no ETH / USD feed in the Chainlink directory");
  const ethInfo = await verifyFeed("ETH", ethFeed);
  markets.push(marketEntry({ symbol: "WETH", name: weth.name, kind: "crypto", address: weth.address }, 18, ethFeed, ethInfo, false));

  for (const token of source.stockTokens) {
    const feed = feedBySymbol.get(token.symbol);
    if (!feed) {
      skipped.push(token.symbol);
      continue;
    }
    const decimals = await verifyToken(token.symbol, token.address, 18);
    const info = await verifyFeed(token.symbol, feed);
    markets.push(marketEntry({ ...token, kind: token.kind ?? "stock" }, decimals, feed, info, true));
  }
  markets.sort((a, b) => a.symbol.localeCompare(b.symbol));

  function marketEntry(token, tokenDecimals, feed, info, isStockToken) {
    const heartbeat = Number(feed.heartbeat);
    return {
      symbol: token.symbol,
      name: token.name,
      kind: token.kind,
      token: token.address,
      tokenDecimals,
      feed: feed.proxyAddress,
      feedDecimals: info.decimals,
      feedDescription: info.description,
      heartbeatSeconds: heartbeat,
      deviationPct: Number(feed.threshold),
      maxPriceAgeSeconds: heartbeat + STALENESS_BUFFER,
      marketHours: feed.docs?.marketHours ?? null,
      // Stock tokens expose oraclePaused(); the oracle adapter refuses a price while it is true.
      checkOraclePause: isStockToken,
    };
  }

  const output = {
    _generated: "Do not edit. Run `pnpm sync:markets` (packages/shared/scripts/sync-markets.mjs).",
    chainId: CHAIN_ID,
    generatedAt: new Date().toISOString(),
    verifiedAtBlock: blockNumber,
    sources: {
      tokens: source.source,
      feeds: "https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood",
      feedsData: FEEDS_URL,
    },
    asset: {
      symbol: "USDG",
      name: usdg.name,
      token: usdg.address,
      decimals: usdg.decimals,
      feed: usdgFeed.proxyAddress,
      feedDecimals: usdgFeedInfo.decimals,
      heartbeatSeconds: Number(usdgFeed.heartbeat),
      maxPriceAgeSeconds: Number(usdgFeed.heartbeat) + STALENESS_BUFFER,
    },
    markets,
  };

  const jsonPath = path.join(SHARED, "src/config/markets.robinhood.json");
  writeFileSync(jsonPath, JSON.stringify(output, null, 2) + "\n");

  const solDir = path.join(REPO, "contracts/script/generated");
  mkdirSync(solDir, { recursive: true });
  writeFileSync(path.join(solDir, "RobinhoodMarkets.sol"), renderSolidity(output));

  console.log(`[sync-markets] chain ${CHAIN_ID} at block ${blockNumber}`);
  console.log(`[sync-markets] ${markets.length} markets verified onchain: ${markets.map((m) => m.symbol).join(", ")}`);
  if (skipped.length) console.log(`[sync-markets] skipped (no Chainlink feed): ${skipped.join(", ")}`);
  console.log(`[sync-markets] wrote ${path.relative(REPO, jsonPath)} and contracts/script/generated/RobinhoodMarkets.sol`);
}

function renderSolidity(out) {
  const rows = out.markets
    .map(
      (m, i) =>
        `        m[${i}] = Market("${m.symbol}", ${m.token}, ${m.feed}, ${m.maxPriceAgeSeconds}, ${m.checkOraclePause});`,
    )
    .join("\n");
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// GENERATED FILE. Do not edit. Regenerate with: pnpm sync:markets
// Sources: ${out.sources.tokens}
//          ${out.sources.feeds}
// Every address below answered symbol()/decimals()/description() as expected at block ${out.verifiedAtBlock}.

library RobinhoodMarkets {
    struct Market {
        string symbol;
        address token;
        address feed;
        uint32 maxPriceAge;
        bool checkOraclePause;
    }

    uint256 internal constant CHAIN_ID = ${out.chainId};
    address internal constant USDG = ${out.asset.token};
    address internal constant USDG_USD_FEED = ${out.asset.feed};
    uint32 internal constant USDG_USD_MAX_AGE = ${out.asset.maxPriceAgeSeconds};

    function all() internal pure returns (Market[] memory m) {
        m = new Market[](${out.markets.length});
${rows}
    }
}
`;
}

main().catch((err) => fail(err.stack || String(err)));
