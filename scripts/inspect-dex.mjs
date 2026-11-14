import { mkdirSync, writeFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, zeroAddress } from "viem";
process.loadEnvFile(".env.local");
const rpc = process.env.ALCHEMY_RPC_URL_4663;
if (!rpc || !URL.canParse(rpc)) throw new Error("Configure ALCHEMY_RPC_URL_4663 first.");
const client = createPublicClient({ transport: http(rpc, { timeout: 12_000, retryCount: 0 }) });
// Verified official deployment source: developers.uniswap.org/docs/protocols/v3/deployments/v3-robinhood-chain-deployments
const factory = "0x1f7d7550b1b028f7571e69a784071f0205fd2efa";
const router = "0xcaf681a66d020601342297493863e78c959e5cb2";
const usdg = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
const weth = "0x0bd7d308f8e1639fab988df18a8011f41eacad73";
const abi = parseAbi(["function factory() view returns (address)", "function getPool(address,address,uint24) view returns (address)", "function liquidity() view returns (uint128)"]);
try {
  if (await client.getChainId() !== 4663) throw new Error("RPC chain mismatch");
  const [factoryCode, routerCode, configuredFactory] = await Promise.all([client.getCode({ address: factory }), client.getCode({ address: router }), client.readContract({ address: router, abi, functionName: "factory" }).catch(() => null)]);
  const report = { observedAt: new Date().toISOString(), chainId: 4663, factory, router, factoryCode: !!factoryCode && factoryCode !== "0x", routerCode: !!routerCode && routerCode !== "0x", factoryCodeBytes: (factoryCode?.length - 2) / 2, routerCodeBytes: (routerCode?.length - 2) / 2, routerFactoryMatches: configuredFactory?.toLowerCase() === factory, pools: [], directoryAvailable: false };
  // Stock addresses also covered by contracts/test/fork/ChainlinkOracleFork.t.sol.
  const tokens = [{ symbol: "WETH", address: weth }, { symbol: "NVDA", address: "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec" }, { symbol: "AAPL", address: "0xaf3d76f1834a1d425780943c99ea8a608f8a93f9" }];
  try { const response = await fetch("https://api.robinhood.com/rhj/assets", { signal: AbortSignal.timeout(12_000) }); if (!response.ok) throw new Error(); const { assets = [] } = await response.json(); report.directoryAvailable = true; for (const asset of assets.filter(a => /NVDA|AAPL|TSLA|MSFT|AMZN/i.test(a.tokenSymbol)).slice(0, 8)) { const d = asset.deployments.find(d => d.chainId === 4663); if (d) tokens.push({ symbol: asset.tokenSymbol, address: d.contractAddress.toLowerCase() }); } } catch { /* Existing manifest remains usable without a directory response. */ }
  for (const token of tokens) for (const fee of [100, 500, 3000, 10000]) {
    try { const pool = await client.readContract({ address: factory, abi, functionName: "getPool", args: [usdg, token.address, fee] }); const liquidity = pool !== zeroAddress ? await client.readContract({ address: pool, abi, functionName: "liquidity" }) : 0n; report.pools.push({ symbol: token.symbol, token: token.address, fee, pool, liquidity: liquidity.toString(), usable: pool !== zeroAddress && liquidity > 0n }); }
    catch { report.pools.push({ symbol: token.symbol, token: token.address, fee, error: "Pool lookup failed" }); }
  }
  mkdirSync(".preview", { recursive: true }); writeFileSync(".preview/dex-readiness.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const brief = typeof error?.shortMessage === "string" ? error.shortMessage : error?.name || "Unknown error";
  console.error("DEX inspection failed:", brief.replaceAll(rpc, "<private RPC>").replaceAll(new URL(rpc).pathname.split("/").pop(), "<key>"));
  process.exitCode = 1;
}
