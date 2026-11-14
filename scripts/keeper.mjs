import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, http, defineChain, parseAbi, encodeFunctionData, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GuardedVaultAbi, GuardedVaultFactoryAbi, IERC20MetadataAbi } from "../src/lib/generated/abis.ts";
import { deployments } from "../src/lib/generated/deployments.ts";
import { validateWorkspace } from "../src/lib/workspace-model.ts";
import { rebalancePlan } from "../src/lib/rebalance.ts";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const execute = process.argv.includes("--execute"), once = process.argv.includes("--once");
if (execute) throw new Error("Legacy direct keeper execution is retired. Use the Rust runner in live mode with a passed release gate, risk process, decision journal and scoped SessionExecutor. This worker supports read-only monitoring.");
const privateKey = process.env.KEEPER_PRIVATE_KEY?.trim();
const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
if (execute && !account) throw new Error("Set a dedicated KEEPER_PRIVATE_KEY before using --execute.");
const dir = resolve(process.env.SIRO_DATA_DIR || ".data"); mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(resolve(dir, "siro.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS workspaces(address TEXT NOT NULL,chain INTEGER NOT NULL,revision INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(address,chain));
CREATE TABLE IF NOT EXISTS keeper_heartbeat(id INTEGER PRIMARY KEY,mode TEXT NOT NULL,signer TEXT,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS keeper_runs(key TEXT PRIMARY KEY,address TEXT NOT NULL,chain INTEGER NOT NULL,schedule TEXT NOT NULL,status TEXT NOT NULL,detail TEXT NOT NULL,next_run INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,hash TEXT,raw TEXT,updated INTEGER NOT NULL);`);
const heartbeat = () => db.prepare("INSERT INTO keeper_heartbeat(id,mode,signer,updated) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET mode=excluded.mode,signer=excluded.signer,updated=excluded.updated").run(execute ? "Execution enabled" : "Read-only", account?.address || null, Date.now());
const timer = setInterval(heartbeat, 15_000); heartbeat();
const oracleAbi = parseAbi(["function quote(address,address,uint256) view returns (uint256,uint256)"]);
let stopped = false;
process.on("SIGINT", () => { stopped = true; }); process.on("SIGTERM", () => { stopped = true; });
function save(key, status, detail, next, hash = null, raw = null) { db.prepare("UPDATE keeper_runs SET status=?,detail=?,next_run=?,hash=?,raw=?,lease_until=0,updated=? WHERE key=?").run(status, detail, next, hash, raw, Date.now(), key); }
const clients = new Map();
function clientsFor(id) {
  if (clients.has(id)) return clients.get(id);
  const rpc = process.env[`ALCHEMY_RPC_URL_${id}`] || process.env[`NEXT_PUBLIC_RPC_URL_${id}`] || (id === 31337 ? "http://127.0.0.1:8545" : undefined);
  if (!rpc) throw new Error("RPC is not configured for this schedule's chain.");
  const chain = defineChain({ id, name: `Siro ${id}`, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
  const client = createPublicClient({ chain, transport: http(rpc, { timeout: 12_000, retryCount: 0 }) });
  const wallet = account ? createWalletClient({ account, chain, transport: http(rpc, { timeout: 12_000, retryCount: 0 }) }) : undefined;
  const result = { client, wallet, rpc, chain }; clients.set(id, result); return result;
}
async function job(owner, chainId, schedule, strategy) {
  const key = `${owner}:${chainId}:${schedule.id}`, now = Date.now();
  db.prepare("INSERT OR IGNORE INTO keeper_runs(key,address,chain,schedule,status,detail,next_run,updated) VALUES(?,?,?,?,?,?,?,?)").run(key, owner, chainId, schedule.id, "Queued", "Waiting for due time", Date.parse(schedule.startsAt), now);
  const state = db.prepare("SELECT * FROM keeper_runs WHERE key=?").get(key);
  if (state.next_run > now || state.lease_until > now) return;
  if (db.prepare("UPDATE keeper_runs SET lease_until=? WHERE key=? AND lease_until<=?").run(now + 600_000, key, now).changes !== 1) return;
  let rpc;
  try {
    const services = clientsFor(chainId); rpc = services.rpc; const { client, wallet } = services;
    if (await client.getChainId() !== chainId) throw new Error("RPC chain mismatch.");
    // Resolve a pre-signed transaction before considering any new trade. Retrying
    // identical signed bytes is idempotent, including after process interruption.
    if (state.hash) {
      let receipt = await client.getTransactionReceipt({ hash: state.hash }).catch(() => null);
      if (!receipt && execute && state.raw) { await client.sendRawTransaction({ serializedTransaction: state.raw }).catch(() => {}); receipt = await client.waitForTransactionReceipt({ hash: state.hash, timeout: 45_000 }).catch(() => null); }
      if (!receipt) { save(key, "Submitted", "Waiting for the existing transaction receipt; no new trade was sent", now + 60_000, state.hash, state.raw); return; }
      if (receipt.status !== "success") { save(key, "Reverted", "Transaction reverted; retry delayed until the next schedule interval", now + schedule.intervalHours * 3600_000); return; }
      save(key, "Confirmed", "Trade receipt confirmed; allocation will be checked again", now + 60_000); return;
    }
    if (!account) throw new Error("Set a dedicated executor key to simulate trading permissions. No transaction was sent.");
    const dep = deployments[String(chainId)];
    if (!dep?.guardedVaultFactory) throw new Error("No verified factory deployment on this chain.");
    if (!await client.readContract({ address: dep.guardedVaultFactory, abi: GuardedVaultFactoryAbi, functionName: "isVault", args: [schedule.vault] })) throw new Error("Vault is not factory-built.");
    const read = { address: schedule.vault, abi: GuardedVaultAbi };
    const [vaultOwner, asset, oracle, paused, executor, router, policy, last, block] = await Promise.all([
      client.readContract({ ...read, functionName: "owner" }), client.readContract({ ...read, functionName: "asset" }), client.readContract({ ...read, functionName: "oracle" }),
      client.readContract({ ...read, functionName: "killSwitch" }), client.readContract({ ...read, functionName: "executors", args: [account.address] }), client.readContract({ ...read, functionName: "allowedRouters", args: [schedule.adapter] }),
      client.readContract({ ...read, functionName: "policy" }), client.readContract({ ...read, functionName: "lastExecution" }), client.getBlock(),
    ]);
    if (vaultOwner.toLowerCase() !== owner.toLowerCase()) throw new Error("Vault ownership changed. This saved schedule is not authorized by its current owner.");
    if (asset.toLowerCase() !== dep.usdg.toLowerCase()) throw new Error("Settlement asset does not match deployment.");
    if (paused || !executor || !router) throw new Error("Trading is paused or executor/router permission is missing.");
    if (BigInt(last) + BigInt(policy[4]) > block.timestamp) { save(key, "Cooldown", "Waiting for onchain cooldown", Number(BigInt(last) + BigInt(policy[4])) * 1000); return; }
    for (const a of strategy.allocations) if (a.token.toLowerCase() !== asset.toLowerCase() && a.weightBps > policy[1]) throw new Error("Strategy allocation exceeds the current onchain allocation cap.");
    const nav = await client.readContract({ ...read, functionName: "totalAssets" });
    const count = Number(await client.readContract({ ...read, functionName: "trackedAssetCount" }));
    const tokens = new Set([asset.toLowerCase(), ...strategy.allocations.map(a => a.token.toLowerCase())]);
    for (let i = 0; i < count; i++) tokens.add((await client.readContract({ ...read, functionName: "trackedAssets", args: [BigInt(i)] })).toLowerCase());
    const holdings = [];
    for (const token of tokens) {
      const balance = await client.readContract({ address: token, abi: IERC20MetadataAbi, functionName: "balanceOf", args: [schedule.vault] });
      let value = balance;
      if (balance > 0n && token !== asset.toLowerCase()) { const quote = await client.readContract({ address: oracle, abi: oracleAbi, functionName: "quote", args: [token, asset, balance] }); if (quote[1] > block.timestamp || block.timestamp - quote[1] > BigInt(policy[5])) throw new Error("Held-asset oracle data is stale."); value = quote[0]; }
      holdings.push({ token, balance, value, targetBps: strategy.allocations.find(a => a.token.toLowerCase() === token)?.weightBps || 0 });
    }
    const plan = rebalancePlan(asset, holdings, nav, policy[0], strategy.driftBps);
    if (!plan) { save(key, "Within target", "No rebalance trade is needed for the observed balances", now + schedule.intervalHours * 3600_000); return; }
    const quote = await client.readContract({ address: oracle, abi: oracleAbi, functionName: "quote", args: [plan.tokenIn, plan.tokenOut, plan.amountIn] });
    if (quote[1] > block.timestamp || block.timestamp - quote[1] > BigInt(policy[5])) throw new Error("Trade oracle data is stale.");
    const minimum = quote[0] * BigInt(10000 - policy[3]) / 10000n;
    if (minimum <= 0n) throw new Error("Trade amount is too small for a positive output minimum.");
    const args = [schedule.adapter, plan.tokenIn, plan.tokenOut, plan.amountIn, minimum];
    await client.simulateContract({ ...read, account: account.address, functionName: "executeTrade", args });
    if (!execute) { save(key, "Simulation passed", "Read-only worker: trade was simulated successfully; no transaction was sent", now + 60_000); return; }
    if (chainId === 4663 && process.env.KEEPER_ALLOW_MAINNET !== "true") throw new Error("Mainnet execution requires KEEPER_ALLOW_MAINNET=true.");
    if (await client.getBalance({ address: account.address }) === 0n) throw new Error("Executor has no gas balance.");
    const transaction = await wallet.prepareTransactionRequest({ to: schedule.vault, data: encodeFunctionData({ abi: GuardedVaultAbi, functionName: "executeTrade", args }) });
    const raw = await wallet.signTransaction(transaction), hash = keccak256(raw);
    // Persist signed bytes and hash BEFORE broadcasting. Lease stays held while
    // broadcasting so a second worker cannot create a competing transaction.
    db.prepare("UPDATE keeper_runs SET status=?,detail=?,hash=?,raw=?,updated=? WHERE key=?").run("Prepared", "Signed trade prepared; awaiting broadcast/receipt", hash, raw, Date.now(), key);
    await client.sendRawTransaction({ serializedTransaction: raw });
    save(key, "Submitted", "Trade broadcast; waiting for receipt before planning another trade", now + 15_000, hash, raw);
    console.log(`Trade submitted for schedule ${schedule.id} on chain ${chainId}: ${hash}`);
  } catch (error) {
    const current = db.prepare("SELECT hash,raw FROM keeper_runs WHERE key=?").get(key);
    if (current.hash) { save(key, "Submitted", "Broadcast outcome uncertain; retaining signed transaction for receipt reconciliation", now + 60_000, current.hash, current.raw); return; }
    const detail = String(error.shortMessage || error.message || "Worker check failed").replaceAll(rpc || "[none]", "[private RPC]").replace(/https?:\/\/\S+/g, "[endpoint]").slice(0, 300);
    save(key, "Blocked", detail, now + 60_000);
  }
}
async function tick() {
  heartbeat();
  const rows = db.prepare("SELECT address,chain,body FROM workspaces").all();
  for (const row of rows) {
    let workspace; try { workspace = validateWorkspace(JSON.parse(row.body)); } catch { continue; }
    for (const schedule of workspace.schedules.filter(s => s.enabled)) {
      const strategy = workspace.strategies.find(s => s.id === schedule.strategyId);
      if (strategy && !stopped) await job(row.address, row.chain, schedule, strategy);
    }
  }
}
console.log(`Siro keeper: ${execute ? "execution requested" : "read-only"}. No private keys are printed.`);
try { do { await tick(); if (once || stopped) break; await new Promise(r => setTimeout(r, 15_000)); } while (!stopped); }
finally { clearInterval(timer); db.prepare("UPDATE keeper_heartbeat SET updated=0 WHERE id=1").run(); db.close(); }
