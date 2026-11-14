import { parseAbi, type Address } from "viem";
import { deployment } from "@/lib/generated/deployment";
import { serverClient } from "./rpc";

const USDG_USD_FEED = "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2" as Address;
const ABI = parseAbi([
  "function nextAgentId() view returns (uint256)",
  "function dailyRoots(uint64) view returns (bytes32 value, uint64 timestamp)",
  "function killed() view returns (bool)",
  "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
]);

export const CONTRACTS: { name: string; address: Address; role: string }[] = [
  { name: "Anchor", address: deployment.anchor as Address, role: "Daily decision roots and strategy locks" },
  { name: "SessionExecutor", address: deployment.sessionExecutor as Address, role: "Bounded, revocable agent sessions" },
  { name: "GuardedVaultFactory", address: deployment.guardedVaultFactory as Address, role: "Creates one non-custodial vault per agent" },
  { name: "AgentRegistry", address: deployment.agentRegistry as Address, role: "Public list of agents and policy hashes" },
  { name: "UniswapV3Adapter", address: "0x8E662a5D28d089960d601e817aBa430e5981fdd2", role: "Swaps through official Uniswap V3 pools, 10 stock routes" },
  { name: "ChainlinkOracle", address: deployment.oracle as Address, role: "Chainlink prices with staleness checks" },
];

export type ChainStatus = {
  block: bigint; blockTime: number;
  live: Record<string, boolean>;
  agents: number | null;
  killed: boolean | null;
  usdg: { price: number; updatedAt: number } | null;
  anchoredDays: { day: number; root: string }[];
};

const settle = async <T>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch { return null; } };

/** Live reads from Robinhood Chain mainnet. Every field is read now; nothing is estimated. */
export async function chainStatus(): Promise<ChainStatus> {
  const c = serverClient(4663);
  const block = await c.getBlock();
  const today = Math.floor(Number(block.timestamp) / 86400);
  const days = Array.from({ length: 14 }, (_, i) => today - 1 - i);
  const [codes, next, killed, round, roots] = await Promise.all([
    Promise.all(CONTRACTS.map((k) => settle(c.getCode({ address: k.address })))),
    settle(c.readContract({ address: deployment.agentRegistry as Address, abi: ABI, functionName: "nextAgentId" })),
    settle(c.readContract({ address: deployment.sessionExecutor as Address, abi: ABI, functionName: "killed" })),
    settle(c.readContract({ address: USDG_USD_FEED, abi: ABI, functionName: "latestRoundData" })),
    Promise.all(days.map((d) => settle(c.readContract({ address: deployment.anchor as Address, abi: ABI, functionName: "dailyRoots", args: [BigInt(d)] })))),
  ]);
  return {
    block: block.number, blockTime: Number(block.timestamp),
    live: Object.fromEntries(CONTRACTS.map((k, i) => [k.name, !!codes[i] && codes[i] !== "0x"])),
    agents: next === null ? null : Number(next) - 1,
    killed,
    usdg: round ? { price: Number(round[1]) / 1e8, updatedAt: Number(round[3]) } : null,
    anchoredDays: days.flatMap((d, i) => { const r = roots[i]; return r && /[1-9a-f]/.test(r[0].slice(2)) ? [{ day: d, root: r[0] }] : []; }),
  };
}
