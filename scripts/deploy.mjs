import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createPublicClient, http, parseAbi } from "viem";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
const id = { local: 31337, testnet: 46630, mainnet: 4663 }[target];
if (!id) throw new Error("Usage: node scripts/deploy.mjs local|testnet|mainnet [--broadcast]");
const broadcast = process.argv.includes("--broadcast");
// Foundry loads contracts/.env itself. RPC and signing configuration can also be
// supplied by the shell; never print or pass private keys as command arguments.
if (existsSync(resolve(root, "contracts/.env"))) process.loadEnvFile(resolve(root, "contracts/.env"));
const rpc = process.env.RPC_URL || (id === 31337 ? "http://127.0.0.1:8545" : undefined);
if (!rpc) throw new Error("RPC_URL is required for remote deployment.");
const client = createPublicClient({ transport: http(rpc) });
if (await client.getChainId() !== id) throw new Error(`RPC chain does not match target ${id}.`);
const fallbackForge = resolve(homedir(), ".foundry/bin", process.platform === "win32" ? "forge.exe" : "forge");
const forge = process.env.FORGE_BIN || (existsSync(fallbackForge) ? fallbackForge : "forge");
mkdirSync(resolve(root, "contracts/deployments"), { recursive: true });
const result = spawnSync(forge, ["script", "script/DeploySiro.s.sol:DeploySiro", "--rpc-url", rpc, ...(broadcast ? ["--broadcast"] : [])], { cwd: resolve(root, "contracts"), stdio: "inherit", env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!broadcast) { console.log("Dry run complete. No deployment record was published. Add --broadcast to deploy."); process.exit(0); }
const candidatePath = resolve(root, `contracts/deployments/${id}.pending.json`);
const candidate = JSON.parse(readFileSync(candidatePath, "utf8"));
if (candidate.chainId !== id) throw new Error("Candidate chain mismatch.");
const run = JSON.parse(readFileSync(resolve(root, `contracts/broadcast/DeploySiro.s.sol/${id}/run-latest.json`), "utf8"));
if (!run.receipts?.length || run.receipts.some(r => BigInt(r.status) !== 1n)) throw new Error("Broadcast receipts are incomplete or failed.");
for (const [key, name] of [["guardedVaultFactory", "GuardedVaultFactory"], ["agentRegistry", "AgentRegistry"], ["oracle", "ChainlinkOracle"]]) {
  const tx = run.transactions.find(t => t.contractName === name && t.contractAddress?.toLowerCase() === candidate[key]?.toLowerCase());
  if (!tx || !run.receipts.some(r => r.transactionHash === tx.hash)) throw new Error(`Missing broadcast receipt for ${name}.`);
  if (!await client.getCode({ address: candidate[key] })) throw new Error(`No deployed code for ${name}.`);
}
const abi = parseAbi(["function asset() view returns (address)", "function oracle() view returns (address)", "function registry() view returns (address)", "function factory() view returns (address)", "function decimals() view returns (uint8)"]);
for (const [fn, key] of [["asset", "usdg"], ["oracle", "oracle"], ["registry", "agentRegistry"]]) {
  const actual = await client.readContract({ address: candidate.guardedVaultFactory, abi, functionName: fn });
  if (actual.toLowerCase() !== candidate[key].toLowerCase()) throw new Error(`Factory ${fn} mismatch.`);
}
const factory = await client.readContract({ address: candidate.agentRegistry, abi, functionName: "factory" });
if (factory.toLowerCase() !== candidate.guardedVaultFactory.toLowerCase()) throw new Error("Registry factory mismatch.");
if (await client.readContract({ address: candidate.usdg, abi, functionName: "decimals" }) !== 6) throw new Error("Unsupported settlement decimals.");
candidate.deployBlock = Number(run.receipts.reduce((min, r) => BigInt(r.blockNumber) < min ? BigInt(r.blockNumber) : min, BigInt(run.receipts[0].blockNumber)));
const destination = resolve(root, `contracts/deployments/${id}.json`);
writeFileSync(`${destination}.tmp`, JSON.stringify(candidate, null, 2) + "\n");
renameSync(`${destination}.tmp`, destination);
const sync = spawnSync(process.execPath, ["scripts/sync-abi.mjs"], { cwd: root, stdio: "inherit" });
if (sync.status !== 0) process.exit(sync.status ?? 1);
console.log(`Verified deployment ${id} and synchronized app configuration.`);
