// Deploy Anchor + SessionExecutor (DeployEvidence) to Robinhood Chain, verify bytecode on chain,
// and record the addresses in contracts/deployments/<chainId>-evidence.json.
//
//   node scripts/deploy-evidence.mjs            simulate only (no transaction)
//   node scripts/deploy-evidence.mjs --broadcast
//
// Reads contracts/.env: PRIVATE_KEY (or SIRO_DEPLOYER_PRIVATE_KEY), optional SIRO_ANCHOR_OWNER /
// SIRO_SESSION_OWNER (default: the deployer address), ALLOW_MAINNET_DEPLOY=true for chain 4663.
// RPC: RPC_URL in contracts/.env, else ALCHEMY_RPC_URL_4663 in .env.local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const contracts = join(root, "contracts");
const parse = file => existsSync(file) ? Object.fromEntries(readFileSync(file, "utf8").split(/\r?\n/).filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; })) : {};
const env = { ...parse(join(root, ".env.local")), ...parse(join(contracts, ".env")), ...process.env };
const bin = name => { const p = resolve(homedir(), ".foundry/bin", name + (process.platform === "win32" ? ".exe" : "")); return existsSync(p) ? p : name; };
const cast = (...args) => { const r = spawnSync(bin("cast"), args, { encoding: "utf8" }); if (r.status !== 0) throw new Error(`cast ${args[0]} failed: ${r.stderr.trim()}`); return r.stdout.trim(); };
const hide = s => s.replace(/https?:\/\/\S+/g, "[rpc]").replace(/0x[0-9a-fA-F]{64}/g, m => (m === key ? "[key]" : m));

const broadcast = process.argv.includes("--broadcast");
const key = env.SIRO_DEPLOYER_PRIVATE_KEY || env.PRIVATE_KEY;
const rpc = env.RPC_URL || env.ALCHEMY_RPC_URL_4663;
if (!/^0x[0-9a-fA-F]{64}$/.test(key ?? "")) throw new Error("Set PRIVATE_KEY (0x + 64 hex) in contracts/.env");
if (!rpc) throw new Error("Set RPC_URL in contracts/.env or ALCHEMY_RPC_URL_4663 in .env.local");

const deployer = cast("wallet", "address", "--private-key", key);
const chainId = Number(cast("chain-id", "--rpc-url", rpc));
const balance = Number(cast("balance", deployer, "--rpc-url", rpc, "--ether"));
const anchorOwner = env.SIRO_ANCHOR_OWNER || deployer;
const sessionOwner = env.SIRO_SESSION_OWNER || deployer;
console.log(`chain ${chainId} | deployer ${deployer} | balance ${balance} ETH | anchor owner ${anchorOwner} | session owner ${sessionOwner} | ${broadcast ? "BROADCAST" : "simulation"}`);
if (chainId === 4663 && env.ALLOW_MAINNET_DEPLOY !== "true") throw new Error("Chain 4663 is mainnet: set ALLOW_MAINNET_DEPLOY=true in contracts/.env");
if (balance < 0.001) throw new Error("Deployer needs at least 0.001 ETH for gas");

const r = spawnSync(bin("forge"), ["script", "script/DeployEvidence.s.sol:DeployEvidence", "--rpc-url", rpc, "--slow", ...(broadcast ? ["--broadcast"] : [])], {
  cwd: contracts, encoding: "utf8",
  env: { ...process.env, SIRO_DEPLOYER_PRIVATE_KEY: key, SIRO_ANCHOR_OWNER: anchorOwner, SIRO_SESSION_OWNER: sessionOwner, ALLOW_MAINNET_DEPLOY: env.ALLOW_MAINNET_DEPLOY ?? "" },
});
const out = hide(`${r.stdout}\n${r.stderr}`);
if (r.status !== 0) { console.error(out.split("\n").filter(l => /Error|revert|Revert/.test(l)).join("\n") || out.slice(-2000)); process.exit(1); }
console.log(out.split("\n").filter(l => /Estimated|SIMULATION|ONCHAIN|Hash|Contract Address|✅/.test(l)).join("\n"));
if (!broadcast) { console.log("\nSimulation only. Run again with --broadcast to deploy."); process.exit(0); }

// Read the addresses forge recorded, then confirm each has code on chain.
const run = JSON.parse(readFileSync(join(contracts, "broadcast", "DeployEvidence.s.sol", String(chainId), "run-latest.json"), "utf8"));
const created = run.transactions.filter(t => t.transactionType === "CREATE");
const addr = name => created.find(t => t.contractName === name)?.contractAddress;
const deployed = { Anchor: addr("Anchor"), SessionExecutor: addr("SessionExecutor") };
for (const [name, a] of Object.entries(deployed)) {
  if (!a) throw new Error(`${name} address missing from broadcast record`);
  const code = cast("code", a, "--rpc-url", rpc);
  if (!code || code === "0x") throw new Error(`${name} at ${a} has no code on chain`);
}
const anchorOwnerOnChain = cast("call", deployed.Anchor, "owner()(address)", "--rpc-url", rpc);
const sessionOwnerOnChain = cast("call", deployed.SessionExecutor, "owner()(address)", "--rpc-url", rpc);
const record = {
  chainId, deployedAt: new Date().toISOString(), deployer,
  contracts: deployed,
  owners: { Anchor: anchorOwnerOnChain, SessionExecutor: sessionOwnerOnChain },
  transactions: run.receipts?.map(x => ({ hash: x.transactionHash, block: Number(x.blockNumber), status: x.status })) ?? [],
};
mkdirSync(join(contracts, "deployments"), { recursive: true });
const file = join(contracts, "deployments", `${chainId}-evidence.json`);
writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
console.log(`\nVerified on chain and recorded in ${file}:\n${JSON.stringify(record, null, 2)}`);
console.log(`\nNext: set SIRO_ANCHOR_ADDRESS=${deployed.Anchor} and SIRO_ANCHOR_DEPLOYMENT_BLOCK=${record.transactions[0]?.block ?? "?"} for services/anchor/witness.mjs.`);
